import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { recoverSessionFromUrl } from "@/lib/auth-recovery";
import type { Database } from "@/integrations/supabase/types";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [message, setMessage] = useState<string>("Signing you in...");

  const withTimeout = <T,>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string,
  ): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);

  const getMetadataProfile = (rawMetadata: unknown) => {
    const metadata = (rawMetadata ?? {}) as Record<string, unknown>;
    const directFullName = typeof metadata.full_name === "string"
      ? metadata.full_name.trim()
      : "";
    const firstName = typeof metadata.first_name === "string"
      ? metadata.first_name.trim()
      : "";
    const lastName = typeof metadata.last_name === "string"
      ? metadata.last_name.trim()
      : "";
    const composedFullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const phoneNumber = typeof metadata.phone_number === "string"
      ? metadata.phone_number.trim()
      : "";

    return {
      fullName: directFullName || composedFullName || null,
      phoneNumber: phoneNumber || null,
    };
  };

  const requiresAdultConfirmation = (finalRedirect: string) =>
    finalRedirect.startsWith("/checkout");

  const redirectTo = useMemo(() => {
    const raw = searchParams.get("redirect");
    if (!raw) return "/";
    if (!raw.startsWith("/")) return "/";
    if (raw.startsWith("//")) return "/";
    return raw;
  }, [searchParams]);

  // Helper to check if profile needs completion
  const checkProfileComplete = async (
    userId: string,
    metadata: unknown,
    finalRedirect: string,
  ): Promise<boolean> => {
    const metadataProfile = getMetadataProfile(metadata);
    const needsAdultConfirmation = requiresAdultConfirmation(finalRedirect);

    try {
      const { data, error } = await withTimeout(
        supabase
          .from("profiles")
          .select("full_name, phone, is_adult_confirmed")
          .eq("user_id", userId)
          .maybeSingle(),
        10000,
        "Timed out while checking profile completion.",
      );

      if (error) {
        console.warn("[AuthCallback] Could not load profile completion status:", error.message);
        // Fall back to metadata for non-checkout redirects.
        return Boolean(
          metadataProfile.fullName &&
            metadataProfile.phoneNumber &&
            !needsAdultConfirmation,
        );
      }

      const profileData = data as {
        full_name: string | null;
        phone: string | null;
        is_adult_confirmed?: boolean | null;
      } | null;

      const fullName = profileData?.full_name?.trim() || metadataProfile.fullName || "";
      const phone = profileData?.phone?.trim() || metadataProfile.phoneNumber || "";
      const adultConfirmed = profileData?.is_adult_confirmed === true;

      if ((!profileData?.full_name || !profileData?.phone) && fullName && phone) {
        try {
          await supabase.from("profiles").upsert(
            {
              user_id: userId,
              full_name: fullName,
              phone,
              updated_at: new Date().toISOString(),
            } as any,
            { onConflict: "user_id" },
          );
        } catch (syncError) {
          console.warn("[AuthCallback] Could not backfill profile details:", syncError);
        }
      }

      return Boolean(fullName && phone && (!needsAdultConfirmation || adultConfirmed));
    } catch (error) {
      console.warn("[AuthCallback] Profile completion check failed:", error);
      // Avoid forcing users into profile flow when network checks are unavailable.
      return true;
    }
  };

  // Helper to navigate based on profile completion
  const navigateWithProfileCheck = async (
    userId: string,
    metadata: unknown,
    finalRedirect: string,
  ) => {
    const isComplete = await checkProfileComplete(userId, metadata, finalRedirect);
    if (isComplete) {
      navigate(finalRedirect, { replace: true });
    } else {
      // Redirect to complete profile page
      navigate(`/complete-profile?redirect=${encodeURIComponent(finalRedirect)}`, { replace: true });
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // OAuth callbacks may still use hash tokens; let our existing recovery helper handle it.
        const recoveredFromHash = await recoverSessionFromUrl();
        if (!cancelled && recoveredFromHash) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session?.user) {
            await navigateWithProfileCheck(
              sessionData.session.user.id,
              sessionData.session.user.user_metadata,
              redirectTo,
            );
          } else {
            navigate(redirectTo, { replace: true });
          }
          return;
        }

        const code = searchParams.get("code");
        if (code) {
          // Supabase may auto-detect and exchange the code depending on configuration.
          // If a session already exists, don't try to exchange again.
          const { data: existing } = await supabase.auth.getSession();
          if (existing.session) {
            if (!cancelled) {
              await navigateWithProfileCheck(
                existing.session.user.id,
                existing.session.user.user_metadata,
                redirectTo,
              );
            }
            return;
          }

          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          // Best-effort: persist metadata (phone/name) into profiles after confirmation.
          const user = data.session?.user;
          if (user) {
            const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
            const fullName = typeof metadata.full_name === "string" ? metadata.full_name : null;
            const phoneNumber = typeof metadata.phone_number === "string" ? metadata.phone_number : null;

            const profile: Database["public"]["Tables"]["profiles"]["Insert"] = {
              user_id: user.id,
              full_name: fullName,
              phone: phoneNumber,
            };

            // Upsert profile with Google data
            try {
              const { error: profileError } = await supabase
                .from("profiles")
                .upsert(profile as any, { onConflict: "user_id" });
              if (profileError) {
                console.warn("[AuthCallback] Failed to upsert profile:", profileError.message);
              }
            } catch (err) {
              console.warn("[AuthCallback] Failed to upsert profile:", err);
            }

            // Navigate with profile check
            if (!cancelled) {
              await navigateWithProfileCheck(user.id, user.user_metadata, redirectTo);
            }
            return;
          }

          if (!cancelled) {
            navigate(redirectTo, { replace: true });
          }
          return;
        }

        // If there is no code, but a session already exists, just redirect.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (!cancelled) {
            await navigateWithProfileCheck(
              data.session.user.id,
              data.session.user.user_metadata,
              redirectTo,
            );
          }
          return;
        }

        if (!cancelled) {
          setStatus("error");
          setMessage("We couldn't complete sign-in. Please try again.");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("We couldn't complete sign-in. Please try again.");
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [navigate, redirectTo, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">{status === "working" ? "Finishing up" : "Sign-in failed"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {status === "error" && (
          <div className="mt-4">
            <Link className="text-sm text-primary hover:underline" to="/auth">
              Go to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;

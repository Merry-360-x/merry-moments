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

  const redirectTo = useMemo(() => {
    const raw = searchParams.get("redirect");
    if (!raw) return "/";
    if (!raw.startsWith("/")) return "/";
    if (raw.startsWith("//")) return "/";
    return raw;
  }, [searchParams]);

  // Helper to check if profile needs completion
  const checkProfileComplete = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", userId)
      .single();
    
    // Profile is incomplete if missing name or phone
    return !!(data?.full_name && data?.phone);
  };

  // Helper to navigate based on profile completion
  const navigateWithProfileCheck = async (userId: string, finalRedirect: string) => {
    const isComplete = await checkProfileComplete(userId);
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
            await navigateWithProfileCheck(sessionData.session.user.id, redirectTo);
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
              await navigateWithProfileCheck(existing.session.user.id, redirectTo);
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
              await navigateWithProfileCheck(user.id, redirectTo);
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
            await navigateWithProfileCheck(data.session.user.id, redirectTo);
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

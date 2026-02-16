import { supabase } from "@/integrations/supabase/client";

type PasswordResetApiResponse = {
  ok?: boolean;
  skipped?: boolean;
  error?: string;
};

export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}/reset-password`;

  try {
    const response = await fetch("/api/password-reset-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirectTo }),
    });

    const payload = (await response.json().catch(() => ({}))) as PasswordResetApiResponse;

    if (response.ok && payload?.ok && !payload?.skipped) {
      return;
    }
  } catch {
    void 0;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { logError, uiErrorMessage } from "@/lib/ui-errors";

const GoogleIcon = (props: { className?: string }) => (
  <svg
    viewBox="0 0 48 48"
    className={props.className}
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.01 1.53 7.39 2.81l5.39-5.39C33.5 3.73 29.2 1.5 24 1.5 14.67 1.5 6.76 6.86 3.19 14.68l6.45 5.01C11.23 13.72 17.05 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.5 24.5c0-1.64-.15-3.21-.43-4.73H24v9.04h12.64c-.55 2.96-2.2 5.47-4.66 7.15l7.2 5.58C43.47 37.6 46.5 31.56 46.5 24.5z"
    />
    <path
      fill="#FBBC05"
      d="M9.64 28.31A14.5 14.5 0 0 1 9 24c0-1.5.26-2.95.64-4.31l-6.45-5.01A23.9 23.9 0 0 0 1.5 24c0 3.86.92 7.5 2.69 10.93l6.45-5.01z"
    />
    <path
      fill="#34A853"
      d="M24 46.5c6.2 0 11.41-2.05 15.21-5.56l-7.2-5.58c-2 1.34-4.56 2.14-8.01 2.14-6.95 0-12.77-4.22-14.36-10.19l-6.45 5.01C6.76 41.14 14.67 46.5 24 46.5z"
    />
    <path fill="none" d="M0 0h48v48H0z" />
  </svg>
);

const Auth = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const redirectTo = (() => {
    const raw = searchParams.get("redirect");
    if (!raw) return null;
    if (!raw.startsWith("/")) return null;
    // Prevent open-redirect style values like "//evil.com"
    if (raw.startsWith("//")) return null;
    return raw;
  })();

  // Redirect authenticated users away from auth page
  useEffect(() => {
    if (!authLoading && user) {
      navigate(redirectTo ?? "/", { replace: true });
    }
  }, [user, authLoading, navigate, redirectTo]);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signup") setIsLogin(false);
    if (mode === "login") setIsLogin(true);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        
        // Show toast
        toast({ 
          title: t("auth.toast.welcomeBack"), 
          description: t("auth.toast.loggedIn"),
          duration: 2000
        });
        
        // User is now authenticated, navigate will happen via useEffect
        // when user state updates
      } else {
        if (!fullName.trim()) {
          throw new Error(t("auth.errors.fullNameRequired"));
        }
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        
        // Check if user is now signed in (email confirmation disabled)
        // The useEffect will handle navigation if user is set
        if (!user) {
          // Email confirmation required
          toast({ 
            title: t("auth.toast.checkEmail"), 
            description: t("auth.toast.confirmEmail"),
            duration: 6000
          });
          setEmail("");
          setPassword("");
          setFullName("");
        } else {
          // Signed in immediately
          toast({ 
            title: "Welcome!", 
            description: "Your account has been created successfully.",
            duration: 2000
          });
        }
      }
    } catch (error: unknown) {
      logError("auth.emailPassword", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: uiErrorMessage(error, t("common.somethingWentWrong")),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Build the callback URL - OAuth should always redirect back to /auth first
      // so Supabase can detect the session from URL hash, then we redirect to final destination
      const baseUrl = window.location.origin;
      // Always redirect back to /auth, with the final destination as a redirect param
      const finalRedirect = redirectTo ?? "/";
      const callbackUrl = `${baseUrl}/auth?redirect=${encodeURIComponent(finalRedirect)}`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
      // On success, Supabase will redirect the browser.
    } catch (error: unknown) {
      // Ignore AbortError - it's expected during redirect
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      logError("auth.google", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: uiErrorMessage(error, t("common.somethingWentWrong")),
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex justify-center">
            <Logo />
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-foreground">
            {isLogin ? t("auth.title.login") : t("auth.title.signup")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isLogin
              ? t("auth.subtitle.login")
              : t("auth.subtitle.signup")}
          </p>
        </div>

        <div className="bg-card rounded-xl shadow-card p-6">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <GoogleIcon className="w-4 h-4 mr-2" />
            {t("auth.actions.continueWithGoogle")}
          </Button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="fullName">{t("auth.fields.fullName")}</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("auth.placeholders.fullName")}
                  className="mt-1"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <Label htmlFor="email">{t("auth.fields.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.placeholders.email")}
                className="mt-1"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("auth.fields.password")}</Label>
                {isLogin && (
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.placeholders.password")}
                  className="pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full">
              {isLogin
                ? t("actions.signIn")
                : t("auth.actions.createAccount")}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
              }}
              className="text-sm text-primary hover:underline"
            >
              {isLogin
                ? t("auth.actions.switchToSignup")
                : t("auth.actions.switchToLogin")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

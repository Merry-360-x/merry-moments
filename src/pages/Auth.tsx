import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { Chrome, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

const Auth = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp } = useAuth();
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
        toast({ title: t("auth.toast.welcomeBack"), description: t("auth.toast.loggedIn") });
        navigate(redirectTo ?? "/");
      } else {
        if (!fullName.trim()) {
          throw new Error(t("auth.errors.fullNameRequired"));
        }
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        toast({ title: t("auth.toast.accountCreated"), description: t("auth.toast.signedUp") });
        navigate(redirectTo ?? "/");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : undefined;
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: message || t("common.somethingWentWrong"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const callbackUrl = new URL(redirectTo ?? "/", window.location.origin).toString();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
        },
      });
      if (error) throw error;
      // On success, Supabase will redirect the browser.
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : undefined;
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: message || t("common.somethingWentWrong"),
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
            <Chrome className="w-4 h-4 mr-2" />
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
              <Label htmlFor="password">{t("auth.fields.password")}</Label>
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? t("common.loading")
                : isLogin
                ? t("actions.signIn")
                : t("auth.actions.createAccount")}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                const next = !isLogin;
                setIsLogin(next);
                navigate(next ? "/signup" : "/login", { replace: true });
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

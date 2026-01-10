import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

const Auth = () => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({ title: t("auth.toast.welcomeBack"), description: t("auth.toast.loggedIn") });
        navigate("/");
      } else {
        if (!fullName.trim()) {
          throw new Error(t("auth.errors.fullNameRequired"));
        }
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        toast({ title: t("auth.toast.accountCreated"), description: t("auth.toast.signedUp") });
        navigate("/");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || t("common.somethingWentWrong"),
      });
    } finally {
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
              onClick={() => setIsLogin(!isLogin)}
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

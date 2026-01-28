import { useEffect, useState, useCallback } from "react";
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

const SIGNUP_STORAGE_KEY = 'signup_form_progress';

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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Set initial mode from URL params
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signup") setIsLogin(false);
    if (mode === "login") setIsLogin(true);
  }, [searchParams]);

  // Load saved signup progress from localStorage
  useEffect(() => {
    if (isLogin) return; // Only for signup
    
    try {
      const saved = localStorage.getItem(SIGNUP_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.firstName) setFirstName(parsed.firstName);
        if (parsed.lastName) setLastName(parsed.lastName);
        if (parsed.phoneNumber) setPhoneNumber(parsed.phoneNumber);
        // Don't restore password for security
        console.log('[Auth] Restored signup progress');
      }
    } catch (e) {
      console.error('Failed to restore signup progress:', e);
    }
  }, [isLogin]);

  // Save signup progress to localStorage
  const saveSignupProgress = useCallback(() => {
    if (isLogin) return;
    
    // Only save if there's meaningful data
    if (!email && !firstName && !lastName && !phoneNumber) return;
    
    try {
      localStorage.setItem(SIGNUP_STORAGE_KEY, JSON.stringify({
        email,
        firstName,
        lastName,
        phoneNumber,
        timestamp: new Date().toISOString(),
      }));
      console.log('[Auth] Saved signup progress');
    } catch (e) {
      console.error('Failed to save signup progress:', e);
    }
  }, [email, firstName, lastName, phoneNumber, isLogin]);

  // Auto-save on field changes (debounced)
  useEffect(() => {
    if (isLogin) return;
    
    const timer = setTimeout(() => {
      saveSignupProgress();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [email, firstName, lastName, phoneNumber, isLogin, saveSignupProgress]);

  // Also save when user leaves the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isLogin && (email || firstName || lastName || phoneNumber)) {
        localStorage.setItem(SIGNUP_STORAGE_KEY, JSON.stringify({
          email,
          firstName,
          lastName,
          phoneNumber,
          timestamp: new Date().toISOString(),
        }));
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isLogin, email, firstName, lastName, phoneNumber]);

  // Clear saved signup data after successful signup
  const clearSignupProgress = () => {
    try {
      localStorage.removeItem(SIGNUP_STORAGE_KEY);
    } catch (e) {
      // Ignore
    }
  };

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
        // Validate password length without throwing error
        if (password.length < 6) {
          setIsLoading(false);
          return; // Just stop - the UI already shows the warning
        }
        
        if (!firstName.trim() || !lastName.trim()) {
          throw new Error("First name and last name are required");
        }
        if (!phoneNumber.trim()) {
          throw new Error("Phone number is required");
        }
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        const { error } = await signUp(email, password, fullName, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          redirectTo: redirectTo ?? "/",
        });
        if (error) throw error;
        
        // Check if user is now signed in (email confirmation disabled)
        // The useEffect will handle navigation if user is set
        if (!user) {
          // Email confirmation required - clear saved progress
          clearSignupProgress();
          toast({ 
            title: t("auth.toast.checkEmail"), 
            description: t("auth.toast.confirmEmail"),
            duration: 6000
          });
          setEmail("");
          setPassword("");
          setFirstName("");
          setLastName("");
          setPhoneNumber("");
        } else {
          // Signed in immediately - clear saved progress
          clearSignupProgress();
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
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="mt-1"
                      required={!isLogin}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="mt-1"
                      required={!isLogin}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+250 123 456 789"
                    className="mt-1"
                    required={!isLogin}
                  />
                </div>
              </>
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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!isLogin && (
                <p className={`text-xs mt-2 ${password.length > 0 && password.length < 6 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {password.length > 0 && password.length < 6 ? '⚠ ' : ''}Password must be at least 6 characters long
                </p>
              )}
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

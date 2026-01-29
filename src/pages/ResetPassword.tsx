import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { Eye, EyeOff, CheckCircle2, Lock } from "lucide-react";
import { logError, uiErrorMessage } from "@/lib/ui-errors";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid recovery token from the URL
    const checkSession = async () => {
      setIsChecking(true);
      
      // Check for hash fragment with recovery token
      const hashFragment = window.location.hash;
      console.log('[ResetPassword] Hash fragment:', hashFragment ? 'present' : 'none');
      
      if (hashFragment) {
        const params = new URLSearchParams(hashFragment.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        
        console.log('[ResetPassword] Token type:', type);
        
        if (accessToken && type === 'recovery') {
          console.log('[ResetPassword] Found recovery token, setting session...');
          
          try {
            // Explicitly set the session with the tokens from the URL
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (error) {
              console.error('[ResetPassword] Error setting session:', error);
              throw error;
            }
            
            if (data.session) {
              console.log('[ResetPassword] Session set successfully');
              // Clean up the URL hash
              window.history.replaceState(null, '', window.location.pathname);
              setIsValidToken(true);
              setIsChecking(false);
              return;
            }
          } catch (err) {
            console.error('[ResetPassword] Failed to set session:', err);
          }
        }
      }
      
      // Fallback: check if session already exists
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[ResetPassword] Session error:', error);
      }
      
      if (session) {
        console.log('[ResetPassword] Valid session found');
        setIsValidToken(true);
      } else {
        console.log('[ResetPassword] No valid session');
        toast({
          variant: "destructive",
          title: "Invalid or expired link",
          description: "Please request a new password reset link.",
        });
        setTimeout(() => navigate("/forgot-password"), 3000);
      }
      
      setIsChecking(false);
    };

    checkSession();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Password updated",
        description: "Your password has been successfully reset.",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => navigate("/auth"), 3000);
    } catch (error: any) {
      logError(error, "ResetPassword.handleSubmit");
      toast({
        variant: "destructive",
        title: "Error",
        description: uiErrorMessage(error, "Failed to reset password. Please try again."),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-center">
            <Logo />
          </div>

          <Card className="shadow-2xl">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">Password reset successful</CardTitle>
              <CardDescription className="text-base">
                Your password has been updated. Redirecting you to login...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (isChecking || !isValidToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-center">
            <Logo />
          </div>

          <Card className="shadow-2xl">
            <CardHeader className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <CardTitle className="text-2xl">Validating link...</CardTitle>
              <CardDescription>Please wait while we verify your reset link.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Logo />
        </div>

        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <CardDescription>
              Enter your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    disabled={isLoading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-destructive">
                  Passwords don't match
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
              >
                {isLoading ? "Resetting..." : "Reset password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;

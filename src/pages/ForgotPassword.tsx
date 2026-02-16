import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { ArrowLeft, Mail } from "lucide-react";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { requestPasswordReset } from "@/lib/password-reset";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await requestPasswordReset(email);

      setEmailSent(true);
      toast({
        title: "Reset email requested",
        description: "If this account exists, check inbox/spam for the reset link.",
      });
    } catch (error: any) {
      logError(error, "ForgotPassword.handleSubmit");
      toast({
        variant: "destructive",
        title: "Error",
        description: uiErrorMessage(error, "Failed to send password reset email. Please try again."),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-center">
            <Link to="/">
              <Logo />
            </Link>
          </div>

          <Card className="shadow-2xl">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">Check your email</CardTitle>
              <CardDescription className="text-base">
                We've sent a password reset link to <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Click the link in the email to reset your password. The link will expire in 1 hour.
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEmailSent(false)}
                >
                  Try a different email
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  asChild
                >
                  <Link to="/auth">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to login
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Link to="/">
            <Logo />
          </Link>
        </div>

        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Forgot password?</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !email}
              >
                {isLoading ? "Sending..." : "Send reset link"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                asChild
              >
                <Link to="/auth">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Link>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;

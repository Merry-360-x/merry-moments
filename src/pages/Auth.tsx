import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { Eye, EyeOff, Phone, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { LoyaltyPointsPopup } from "@/components/LoyaltyPointsPopup";

const SIGNUP_STORAGE_KEY = 'signup_form_progress';

// Country codes for phone auth - Twilio supported countries
const COUNTRY_CODES = [
  // East Africa (Priority)
  { code: '+250', country: 'Rwanda', flag: '🇷🇼' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+255', country: 'Tanzania', flag: '🇹🇿' },
  { code: '+256', country: 'Uganda', flag: '🇺🇬' },
  { code: '+257', country: 'Burundi', flag: '🇧🇮' },
  { code: '+251', country: 'Ethiopia', flag: '🇪🇹' },
  { code: '+252', country: 'Somalia', flag: '🇸🇴' },
  { code: '+211', country: 'South Sudan', flag: '🇸🇸' },
  // Central Africa
  { code: '+243', country: 'DR Congo', flag: '🇨🇩' },
  { code: '+242', country: 'Congo', flag: '🇨🇬' },
  { code: '+237', country: 'Cameroon', flag: '🇨🇲' },
  { code: '+236', country: 'Central African Republic', flag: '🇨🇫' },
  { code: '+235', country: 'Chad', flag: '🇹🇩' },
  { code: '+241', country: 'Gabon', flag: '🇬🇦' },
  // Southern Africa
  { code: '+260', country: 'Zambia', flag: '🇿🇲' },
  { code: '+263', country: 'Zimbabwe', flag: '🇿🇼' },
  { code: '+265', country: 'Malawi', flag: '🇲🇼' },
  { code: '+258', country: 'Mozambique', flag: '🇲🇿' },
  { code: '+267', country: 'Botswana', flag: '🇧🇼' },
  { code: '+264', country: 'Namibia', flag: '🇳🇦' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+266', country: 'Lesotho', flag: '🇱🇸' },
  { code: '+268', country: 'Eswatini', flag: '🇸🇿' },
  { code: '+261', country: 'Madagascar', flag: '🇲🇬' },
  { code: '+230', country: 'Mauritius', flag: '🇲🇺' },
  // West Africa
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+225', country: "Côte d'Ivoire", flag: '🇨🇮' },
  { code: '+221', country: 'Senegal', flag: '🇸🇳' },
  { code: '+226', country: 'Burkina Faso', flag: '🇧🇫' },
  { code: '+223', country: 'Mali', flag: '🇲🇱' },
  { code: '+227', country: 'Niger', flag: '🇳🇪' },
  { code: '+228', country: 'Togo', flag: '🇹🇬' },
  { code: '+229', country: 'Benin', flag: '🇧🇯' },
  { code: '+231', country: 'Liberia', flag: '🇱🇷' },
  { code: '+232', country: 'Sierra Leone', flag: '🇸🇱' },
  { code: '+220', country: 'Gambia', flag: '🇬🇲' },
  { code: '+224', country: 'Guinea', flag: '🇬🇳' },
  { code: '+245', country: 'Guinea-Bissau', flag: '🇬🇼' },
  { code: '+238', country: 'Cape Verde', flag: '🇨🇻' },
  // North Africa
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+212', country: 'Morocco', flag: '🇲🇦' },
  { code: '+213', country: 'Algeria', flag: '🇩🇿' },
  { code: '+216', country: 'Tunisia', flag: '🇹🇳' },
  { code: '+218', country: 'Libya', flag: '🇱🇾' },
  { code: '+249', country: 'Sudan', flag: '🇸🇩' },
  // Middle East
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+962', country: 'Jordan', flag: '🇯🇴' },
  { code: '+961', country: 'Lebanon', flag: '🇱🇧' },
  { code: '+972', country: 'Israel', flag: '🇮🇱' },
  { code: '+90', country: 'Turkey', flag: '🇹🇷' },
  // Asia
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+852', country: 'Hong Kong', flag: '🇭🇰' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
  { code: '+95', country: 'Myanmar', flag: '🇲🇲' },
  { code: '+855', country: 'Cambodia', flag: '🇰🇭' },
  // Europe
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+32', country: 'Belgium', flag: '🇧🇪' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
  { code: '+43', country: 'Austria', flag: '🇦🇹' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪' },
  { code: '+47', country: 'Norway', flag: '🇳🇴' },
  { code: '+45', country: 'Denmark', flag: '🇩🇰' },
  { code: '+358', country: 'Finland', flag: '🇫🇮' },
  { code: '+48', country: 'Poland', flag: '🇵🇱' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+353', country: 'Ireland', flag: '🇮🇪' },
  { code: '+30', country: 'Greece', flag: '🇬🇷' },
  { code: '+420', country: 'Czech Republic', flag: '🇨🇿' },
  { code: '+36', country: 'Hungary', flag: '🇭🇺' },
  { code: '+40', country: 'Romania', flag: '🇷🇴' },
  { code: '+380', country: 'Ukraine', flag: '🇺🇦' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  // Americas
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+51', country: 'Peru', flag: '🇵🇪' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
  { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
  { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
  { code: '+507', country: 'Panama', flag: '🇵🇦' },
  { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
  { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
  { code: '+504', country: 'Honduras', flag: '🇭🇳' },
  { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
  { code: '+509', country: 'Haiti', flag: '🇭🇹' },
  { code: '+1876', country: 'Jamaica', flag: '🇯🇲' },
  { code: '+1868', country: 'Trinidad & Tobago', flag: '🇹🇹' },
  // Oceania
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
  { code: '+679', country: 'Fiji', flag: '🇫🇯' },
  { code: '+675', country: 'Papua New Guinea', flag: '🇵🇬' },
];

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
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Terms agreement
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Password validation
  const passwordChecks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\|<>?,.\/`~]/.test(password),
  };
  const passwordIsStrong = Object.values(passwordChecks).every(Boolean);
  
  // Phone OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);
  
  // Loyalty points popup state
  const [showPointsPopup, setShowPointsPopup] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  const { signIn, signUp, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

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

  // Redirect authenticated users away from auth page (but not during popup)
  useEffect(() => {
    if (!authLoading && user && !showPointsPopup) {
      navigate(redirectTo ?? "/", { replace: true });
    }
  }, [user, authLoading, navigate, redirectTo, showPointsPopup]);

  // Handle popup close - navigate after popup
  const handlePointsPopupClose = () => {
    setShowPointsPopup(false);
    toast({ 
      title: "Welcome!", 
      description: "Your account has been created successfully.",
      duration: 2000
    });
    navigate(pendingRedirect ?? "/", { replace: true });
  };

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
        // Validate terms agreement
        if (!agreedToTerms) {
          toast({
            variant: "destructive",
            title: "Terms Required",
            description: "Please agree to the Terms of Service and Privacy Policy to continue.",
          });
          setIsLoading(false);
          return;
        }
        
        // Validate password strength
        if (!passwordIsStrong) {
          toast({
            variant: "destructive",
            title: "Weak Password",
            description: "Password must include lowercase, uppercase, number, and special character.",
          });
          setIsLoading(false);
          return;
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
          // Signed in immediately - show loyalty popup then navigate
          clearSignupProgress();
          setPendingRedirect(redirectTo ?? "/");
          setShowPointsPopup(true);
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

  // Format phone number to E.164 format
  const formatPhoneForAuth = (phone: string): string => {
    // Remove all non-digit characters except leading +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If user entered full E.164 format (starts with +), use it directly
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // Remove all non-digit characters now
    let digits = cleaned.replace(/\D/g, '');
    
    // Check if the number starts with the country code digits (without +)
    const countryDigits = selectedCountry.code.replace('+', '');
    if (digits.startsWith(countryDigits)) {
      // User entered full number with country code, strip it
      digits = digits.substring(countryDigits.length);
    }
    
    // Remove leading 0 if present (local format like 0792527083)
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    
    // Use selected country code
    return selectedCountry.code + digits;
  };

  // Handle sending OTP to phone
  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      toast({
        variant: "destructive",
        title: "Phone number required",
        description: "Please enter your phone number",
      });
      return;
    }

    // Validate terms for signup
    if (!isLogin && !agreedToTerms) {
      toast({
        variant: "destructive",
        title: "Terms Required",
        description: "Please agree to the Terms of Service and Privacy Policy to continue.",
      });
      return;
    }

    setOtpLoading(true);
    try {
      const formattedPhone = formatPhoneForAuth(phoneNumber);
      // Also check without + for legacy data
      const phoneWithoutPlus = formattedPhone.replace('+', '');
      
      // Check if phone number exists in database (check both formats for consistency)
      const { data: existingUsers } = await supabase
        .from("profiles")
        .select("user_id, phone")
        .or(`phone.eq.${formattedPhone},phone.eq.${phoneWithoutPlus}`)
        .limit(1);
      
      const existingUser = existingUsers?.[0] || null;
      
      // For login, phone must be registered - seamlessly switch to signup
      if (isLogin && !existingUser) {
        setIsLogin(false);
        // Don't return - continue to send OTP for signup
        toast({
          title: "Let's create your account",
          description: "Please enter your name to continue",
        });
        setOtpLoading(false);
        return;
      }
      
      // For signup, phone already registered - seamlessly switch to login
      if (!isLogin && existingUser) {
        setIsLogin(true);
        // Continue to send OTP for login (name not needed)
        toast({
          title: "Welcome back!",
          description: "Sending verification code...",
        });
        // Don't return - continue with OTP
      }
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          // For signup, we need to pass user metadata
          data: !isLogin && !existingUser ? {
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone_number: formattedPhone,
          } : undefined,
        },
      });

      if (error) throw error;

      setOtpSent(true);
      setResendCountdown(60); // 60 second countdown
      // Focus OTP input after a short delay
      setTimeout(() => otpInputRef.current?.focus(), 100);
      toast({
        title: "Code Sent! ✓",
        description: `Check your phone for the verification code`,
      });
    } catch (error: unknown) {
      logError("auth.phoneOtp", error);
      toast({
        variant: "destructive",
        title: "Failed to send OTP",
        description: uiErrorMessage(error, "Could not send verification code. Please try again."),
      });
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle verifying OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpCode.trim() || otpCode.length < 6) {
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "Please enter the 6-digit verification code",
      });
      return;
    }

    setIsLoading(true);
    try {
      const formattedPhone = formatPhoneForAuth(phoneNumber);
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpCode,
        type: 'sms',
      });

      if (error) throw error;

      if (data.session && data.user) {
        // Always check/create profile for phone auth users
        const fullName = firstName.trim() && lastName.trim() 
          ? `${firstName.trim()} ${lastName.trim()}`
          : null;
        const phoneWithoutPlus = formattedPhone.replace('+', '');
        
        // Check if profile exists by user_id first
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .eq("user_id", data.user.id)
          .maybeSingle();
        
        // Also check if there's an existing profile with this phone (different user_id)
        // This can happen if user signed up with email first, then tries phone
        const { data: phoneProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .or(`phone.eq.${formattedPhone},phone.eq.${phoneWithoutPlus}`)
          .neq("user_id", data.user.id)
          .limit(1);
        
        const phoneProfile = phoneProfiles?.[0];
        
        if (!existingProfile) {
          if (phoneProfile) {
            // There's already a profile with this phone but different user
            // This is a duplicate - update the existing profile's user_id or handle conflict
            console.warn("Phone already exists for different user:", phoneProfile.user_id);
          }
          // Create new profile for first-time phone users
          await supabase
            .from("profiles")
            .insert({
              user_id: data.user.id,
              full_name: fullName || phoneProfile?.full_name || `User`,
              phone: formattedPhone,
            });
        } else if (fullName && (!existingProfile.full_name || existingProfile.full_name === 'User')) {
          // Update profile if name was provided and current name is empty/default
          await supabase
            .from("profiles")
            .update({
              full_name: fullName,
              phone: formattedPhone,
            })
            .eq("user_id", data.user.id);
        } else if (!existingProfile.phone) {
          // Update phone if profile exists but phone is missing
          await supabase
            .from("profiles")
            .update({ phone: formattedPhone })
            .eq("user_id", data.user.id);
        }

        clearSignupProgress();
        toast({
          title: isLogin ? "Welcome back!" : "Welcome!",
          description: isLogin ? "You have signed in successfully." : "Your account has been created successfully.",
          duration: 2000,
        });
        
        // Use window.location for phone auth to force full state refresh
        // React's state updates may not propagate fast enough with navigate()
        const destination = redirectTo ?? "/";
        setTimeout(() => {
          window.location.href = destination;
        }, 300);
      }
    } catch (error: unknown) {
      logError("auth.verifyOtp", error);
      
      // Extract better error message for OTP-specific errors
      const errMsg = error && typeof error === "object" ? String((error as { message?: string }).message ?? "") : "";
      let description = "Invalid or expired code. Please try again.";
      
      if (errMsg.toLowerCase().includes("expired") || errMsg.toLowerCase().includes("token")) {
        description = "The verification code has expired. Please request a new code.";
      } else if (errMsg.toLowerCase().includes("invalid")) {
        description = "Invalid verification code. Please check and try again.";
      }
      
      toast({
        variant: "destructive",
        title: "Verification failed",
        description,
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

          {/* Auth Method Toggle */}
          <div className="flex gap-2 mb-5">
            <Button
              type="button"
              variant={authMethod === 'email' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setAuthMethod('email');
                setOtpSent(false);
                setOtpCode('');
              }}
              disabled={isLoading}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button
              type="button"
              variant={authMethod === 'phone' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setAuthMethod('phone');
                setOtpSent(false);
                setOtpCode('');
              }}
              disabled={isLoading}
            >
              <Phone className="w-4 h-4 mr-2" />
              Phone
            </Button>
          </div>

          {/* Phone OTP Form */}
          {authMethod === 'phone' ? (
            <div className="space-y-4">
              {!isLogin && !otpSent && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName" className="text-sm">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="mt-1"
                      required
                    />
                  </div>
                </div>
              )}

              {!otpSent ? (
                <>
                  <div>
                    <Label htmlFor="phoneAuth" className="text-sm">Phone Number</Label>
                    <div className="flex gap-2 mt-1">
                      {/* Country Code Selector */}
                      <select
                        value={selectedCountry.code}
                        onChange={(e) => {
                          const country = COUNTRY_CODES.find(c => c.code === e.target.value);
                          if (country) setSelectedCountry(country);
                        }}
                        className="flex h-10 w-24 items-center justify-between rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        {COUNTRY_CODES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      {/* Phone Input */}
                      <Input
                        id="phoneAuth"
                        type="tel"
                        inputMode="numeric"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d\s+]/g, ''))}
                        placeholder="792 527 083"
                        className="flex-1"
                        autoComplete="tel"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      We'll send you a verification code via SMS
                    </p>
                  </div>

                  {/* Terms and Privacy Agreement - Signup only */}
                  {!isLogin && (
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="termsPhone"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <label htmlFor="termsPhone" className="text-sm text-muted-foreground cursor-pointer">
                        I agree to the{' '}
                        <Link to="/terms" target="_blank" className="text-primary hover:underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" target="_blank" className="text-primary hover:underline">
                          Privacy Policy
                        </Link>
                      </label>
                    </div>
                  )}

                  <Button
                    type="button"
                    className="w-full h-11"
                    onClick={handleSendOTP}
                    disabled={otpLoading || !phoneNumber.trim() || phoneNumber.replace(/\D/g, '').length < 8 || (!isLogin ? (!firstName.trim() || !lastName.trim() || !agreedToTerms) : false)}
                  >
                    {otpLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending Code...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  {/* Success indicator */}
                  <div className="flex items-center justify-center gap-2 py-3 px-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-300">
                      Code sent to {selectedCountry.flag} {selectedCountry.code} {phoneNumber}
                    </span>
                  </div>

                  <div>
                    <Label htmlFor="otpCode" className="text-sm">Enter Verification Code</Label>
                    <Input
                      ref={otpInputRef}
                      id="otpCode"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => {
                        const code = e.target.value.replace(/\D/g, '');
                        setOtpCode(code);
                        // Auto-submit when 6 digits entered
                        if (code.length === 6 && !isLoading) {
                          setTimeout(() => {
                            const form = e.target.closest('form');
                            if (form) form.requestSubmit();
                          }, 100);
                        }
                      }}
                      placeholder="• • • • • •"
                      className="mt-1 text-center text-2xl tracking-[0.5em] font-mono h-14"
                      autoComplete="one-time-code"
                    />
                  </div>

                  <form onSubmit={handleVerifyOTP}>
                    <Button 
                      type="submit" 
                      className="w-full h-11" 
                      disabled={isLoading || otpCode.length !== 6}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        isLogin ? "Sign In" : "Create Account"
                      )}
                    </Button>
                  </form>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode('');
                        setResendCountdown(0);
                      }}
                    >
                      ← Change number
                    </button>
                    <button
                      type="button"
                      className={`transition-colors ${resendCountdown > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-primary hover:text-primary/80'}`}
                      onClick={() => {
                        if (resendCountdown === 0) {
                          handleSendOTP();
                        }
                      }}
                      disabled={resendCountdown > 0 || otpLoading}
                    >
                      {otpLoading ? 'Sending...' : resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend code'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Email/Password Form */
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
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d\s+]/g, ''))}
                      placeholder="792 527 083 or +250792527083"
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
                {!isLogin && password.length > 0 && (
                  <div className="mt-2 space-y-1 text-xs">
                    <div className={passwordChecks.length ? 'text-green-600' : 'text-muted-foreground'}>
                      {passwordChecks.length ? '✓' : '○'} At least 8 characters
                    </div>
                    <div className={passwordChecks.lowercase ? 'text-green-600' : 'text-muted-foreground'}>
                      {passwordChecks.lowercase ? '✓' : '○'} Lowercase letter (a-z)
                    </div>
                    <div className={passwordChecks.uppercase ? 'text-green-600' : 'text-muted-foreground'}>
                      {passwordChecks.uppercase ? '✓' : '○'} Uppercase letter (A-Z)
                    </div>
                    <div className={passwordChecks.number ? 'text-green-600' : 'text-muted-foreground'}>
                      {passwordChecks.number ? '✓' : '○'} Number (0-9)
                    </div>
                    <div className={passwordChecks.special ? 'text-green-600' : 'text-muted-foreground'}>
                      {passwordChecks.special ? '✓' : '○'} Special character (!@#$%...)
                    </div>
                  </div>
                )}
              </div>

              {/* Terms and Privacy Agreement - Signup only */}
              {!isLogin && (
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                    I agree to the{' '}
                    <Link to="/terms" target="_blank" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" target="_blank" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || (!isLogin && !agreedToTerms)}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </>
                ) : (
                  isLogin ? t("actions.signIn") : t("auth.actions.createAccount")
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setOtpSent(false);
                setOtpCode('');
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
      
      {/* Loyalty Points Popup for new signups */}
      <LoyaltyPointsPopup
        isOpen={showPointsPopup}
        onClose={handlePointsPopupClose}
        points={5}
        totalPoints={5}
        reason="Welcome bonus"
      />
    </div>
  );
};

export default Auth;

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { recoverSessionFromUrl, verifyAndRefreshSession } from "@/lib/auth-recovery";
import type { Database } from "@/integrations/supabase/types";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  rolesLoading: boolean;
  roles: string[];
  isHost: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isFinancialStaff: boolean;
  isOperationsStaff: boolean;
  isCustomerSupport: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    options?: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      redirectTo?: string;
    }
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [isFetchingRoles, setIsFetchingRoles] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Bump this to invalidate any in-flight async auth/roles work.
  // This prevents stale initializeAuth/fetchRoles from repopulating state after sign-out.
  const authEpochRef = useRef(0);

  const fetchRoles = async (userId: string) => {
    const epoch = authEpochRef.current;
    // Prevent duplicate simultaneous fetches
    if (isFetchingRoles) return;
    
    setIsFetchingRoles(true);
    setRolesLoading(true);
    
    // Add timeout for roles query
    const queryTimeout = setTimeout(() => {
      console.warn("[AuthContext] Roles query timeout - forcing completion");
      setRolesLoading(false);
      setIsFetchingRoles(false);
    }, 5000);
    
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      clearTimeout(queryTimeout);

      if (error) {
        console.warn("[AuthContext] Failed to load roles:", error.message);
        // Don't let roles loading get stuck on error
        setRoles([]); // Set empty roles instead of keeping old state
        setRolesLoading(false);
        setIsFetchingRoles(false);
        return;
      }

      const normalized = (data ?? [])
        .map((r) => String(r.role ?? "").trim().toLowerCase())
        .filter(Boolean);
      
      // Deduplicate and keep only known roles.
      // Note: 'staff' is deprecated, use specific roles instead
      // Accept both 'user' and 'guest' for backward compatibility
      const uniq = Array.from(new Set(normalized)).filter((r) =>
        ["user", "guest", "host", "admin", "financial_staff", "operations_staff", "customer_support"].includes(r)
      );

      // If auth epoch changed (e.g., user signed out) while fetching, ignore results.
      if (authEpochRef.current !== epoch) {
        setRolesLoading(false);
        setIsFetchingRoles(false);
        return;
      }
      setRoles(uniq);
      setRolesLoading(false);
      setIsFetchingRoles(false);
    } catch (err) {
      clearTimeout(queryTimeout);
      
      // Silently handle AbortError - expected during React cleanup/navigation
      if (err instanceof Error && err.name === "AbortError") {
        setRolesLoading(false);
        setIsFetchingRoles(false);
        return;
      }
      console.warn("[AuthContext] Error fetching roles:", err);
      setRoles([]); // Clear roles on error
      setRolesLoading(false);
      setIsFetchingRoles(false);
    }
  };

  const refreshRoles = async () => {
    if (!user) return;
    await fetchRoles(user.id);
  };

  const isHost = useMemo(() => roles.includes("host"), [roles]);
  const isStaff = useMemo(() => 
    roles.includes("financial_staff") || 
    roles.includes("operations_staff") || 
    roles.includes("customer_support"), 
  [roles]);
  const isAdmin = useMemo(() => roles.includes("admin"), [roles]);
  const isFinancialStaff = useMemo(() => roles.includes("financial_staff"), [roles]);
  const isOperationsStaff = useMemo(() => roles.includes("operations_staff"), [roles]);
  const isCustomerSupport = useMemo(() => roles.includes("customer_support"), [roles]);

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;
    const epoch = ++authEpochRef.current;
    
    // Failsafe timeout to prevent infinite loading
    const failsafeTimeout = setTimeout(() => {
      if (mounted && authEpochRef.current === epoch) {
        console.warn("[AuthContext] Failsafe timeout triggered - forcing auth completion");
        setIsLoading(false);
        setRolesLoading(false);
        setIsFetchingRoles(false);
        setInitialized(true);
      }
    }, 5000); // 5 second timeout for faster resolution
    
    const initializeAuth = async () => {
      try {
        // Add timeout to getSession to prevent hanging
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 3000)
        );
        
        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        if (!mounted) return;
        if (authEpochRef.current !== epoch) return;
        
        if (sessionError) {
          console.warn("[AuthContext] Session error:", sessionError);
          setSession(null);
          setUser(null);
          setRoles([]);
          setIsLoading(false);
          setRolesLoading(false);
          setInitialized(true);
          clearTimeout(failsafeTimeout);
          return;
        }
        
        // Verify and refresh session if needed (skip this as it's slow)
        // Session will auto-refresh via onAuthStateChange if needed

        if (!mounted) return;
        if (authEpochRef.current !== epoch) return;
        
        // Set initial state from existing session
        setSession(session);
        setUser(session?.user ?? null);
        
        // Set loading to false immediately for fast initial render
        setIsLoading(false);
        setInitialized(true);
        clearTimeout(failsafeTimeout);
        
        // Fetch roles in background without blocking
        if (session?.user && !initialized) {
          void fetchRoles(session.user.id);
        } else {
          setRoles([]);
          setRolesLoading(false);
        }
        
        // 4. Set up listener for auth changes (after initial load)
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (!mounted) return;
            // Ignore auth events from a previous epoch.
            if (authEpochRef.current !== epoch) return;
            
            if (import.meta.env.DEV) {
              console.debug('[AuthContext] Auth event:', event);
            }
            
            setSession(newSession);
            setUser(newSession?.user ?? null);
            
            // Immediately update loading state for fast UI
            setIsLoading(false);
            
            if (newSession?.user) {
              // Fetch roles in background without blocking UI
              if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
                // Don't await - let it happen in background
                void fetchRoles(newSession.user.id);
                
                // If user just confirmed email (SIGNED_IN event), they're logged in automatically
                // The navbar will show profile button instead of sign in
              }
            } else {
              // User signed out
              setRoles([]);
              setRolesLoading(false);
            }
            
            // Invalidate queries on auth state change
            queryClient.invalidateQueries();
          }
        );
        
        subscription = authSubscription;
        
      } catch (err) {
        if (!mounted) return;
        if (authEpochRef.current !== epoch) return;
        
        // Handle initialization errors
        if (err instanceof Error && (
          err.name === "AbortError" ||
          err.message?.includes("aborted")
        )) {
          setIsLoading(false);
          setRolesLoading(false);
          return;
        }
        
        console.error("[AuthContext] Initialization error:", err);
        setSession(null);
        setUser(null);
        setRoles([]);
        setIsLoading(false);
        setRolesLoading(false);
        setInitialized(true);
        clearTimeout(failsafeTimeout);
      }
    };
    
    void initializeAuth();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      clearTimeout(failsafeTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    options?: { firstName?: string; lastName?: string; phoneNumber?: string; redirectTo?: string }
  ) => {
    const baseUrl = window.location.origin;
    const finalRedirect = options?.redirectTo ?? "/";
    const emailRedirectTo = `${baseUrl}/auth/callback?redirect=${encodeURIComponent(finalRedirect)}`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName,
          first_name: options?.firstName,
          last_name: options?.lastName,
          phone_number: options?.phoneNumber,
        },
      },
    });
    
    // If email confirmation is disabled, user is signed in immediately
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.session.user);
      setIsLoading(false);
      
      // Fetch roles in background
      void fetchRoles(data.session.user.id);

      // Best-effort profile upsert (non-blocking) with loyalty points
      const profile = {
        user_id: data.session.user.id,
        full_name: fullName,
        phone: options?.phoneNumber ?? null,
        profile_completed_bonus: true, // Mark as will receive bonus
      };

      void (async () => {
        try {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(profile as any, { onConflict: "user_id" });
          if (profileError) {
            console.warn("[AuthContext] Failed to upsert profile:", profileError.message);
          }
          
          // Award loyalty points for completing profile during signup
          try {
            await supabase.rpc("add_loyalty_points" as any, {
              p_user_id: data.session!.user.id,
              p_points: 5,
              p_reason: "Welcome bonus - Profile completion",
              p_reference_type: "profile_completion",
              p_reference_id: null,
            });
            console.log("[AuthContext] Awarded 5 loyalty points for profile completion");
          } catch (pointsError) {
            console.warn("[AuthContext] Failed to award loyalty points:", pointsError);
          }
        } catch (err) {
          console.warn("[AuthContext] Failed to upsert profile:", err);
        }
      })();
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error && data.session) {
      // Immediately update state for instant UI feedback
      setSession(data.session);
      setUser(data.session.user);
      setIsLoading(false);
      
      // Fetch roles in background
      void fetchRoles(data.session.user.id);
    }
    
    return { error };
  };

  const signOut = async () => {
    // Invalidate any in-flight auth initialization / role fetch.
    authEpochRef.current += 1;

    // Optimistically clear local state so the UI updates immediately even if
    // the network call to Supabase hangs or is slow.
    setUser(null);
    setSession(null);
    setRoles([]);
    setIsLoading(false);
    setRolesLoading(false);
    setIsFetchingRoles(false);
    setInitialized(true);

    // Clear cached server state (React Query) so user-specific data disappears instantly.
    queryClient.clear();
    
    // Clear host application progress from localStorage
    localStorage.removeItem('host_application_progress');

    try {
      // Never let sign-out block UI; bail out quickly if it stalls.
      await Promise.race([
        supabase.auth.signOut(),
        new Promise<void>((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch (error) {
      console.error('[AuthContext] Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        rolesLoading,
        roles,
        isHost,
        isStaff,
        isAdmin,
        isFinancialStaff,
        isOperationsStaff,
        isCustomerSupport,
        signUp,
        signIn,
        signOut,
        refreshRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

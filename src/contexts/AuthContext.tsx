import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { recoverSessionFromUrl, verifyAndRefreshSession } from "@/lib/auth-recovery";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  rolesLoading: boolean;
  roles: string[];
  isHost: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [isFetchingRoles, setIsFetchingRoles] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const fetchRoles = async (userId: string) => {
    // Prevent duplicate simultaneous fetches
    if (isFetchingRoles) return;
    
    setIsFetchingRoles(true);
    setRolesLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        // Keep existing roles on transient errors so nav buttons don't "disappear".
        // Ignore AbortError - it's expected during component cleanup
        if (error.message?.includes("AbortError") || error.message?.includes("aborted")) {
          setRolesLoading(false);
          setIsFetchingRoles(false);
          return;
        }
        console.warn("[AuthContext] Failed to load roles:", error.message);
        setRolesLoading(false);
        setIsFetchingRoles(false);
        return;
      }

      const normalized = (data ?? [])
        .map((r) => String(r.role ?? "").trim().toLowerCase())
        .filter(Boolean);
      // Deduplicate and keep only known roles.
      const uniq = Array.from(new Set(normalized)).filter((r) =>
        ["guest", "host", "staff", "admin"].includes(r)
      );
      setRoles(uniq);
      setRolesLoading(false);
      setIsFetchingRoles(false);
    } catch (err) {
      // Silently handle AbortError - expected during React cleanup/navigation
      if (err instanceof Error && err.name === "AbortError") {
        setRolesLoading(false);
        setIsFetchingRoles(false);
        return;
      }
      console.warn("[AuthContext] Error fetching roles:", err);
      setRolesLoading(false);
      setIsFetchingRoles(false);
    }
  };

  const refreshRoles = async () => {
    if (!user) return;
    await fetchRoles(user.id);
  };

  const isHost = useMemo(() => roles.includes("host"), [roles]);
  const isStaff = useMemo(() => roles.includes("staff"), [roles]);
  const isAdmin = useMemo(() => roles.includes("admin"), [roles]);

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;
    
    const initializeAuth = async () => {
      try {
        // 0. Try to recover session from URL first (OAuth callback)
        const recoveredFromUrl = await recoverSessionFromUrl();
        if (recoveredFromUrl && !mounted) return;
        
        // 1. Get existing session first (critical for refresh/navigation)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          console.warn("[AuthContext] Session error:", sessionError);
          setSession(null);
          setUser(null);
          setRoles([]);
          setIsLoading(false);
          setRolesLoading(false);
          setInitialized(true);
          return;
        }
        
        // 2. Verify and refresh session if needed
        if (session) {
          await verifyAndRefreshSession();
        }
        
        // 3. Set initial state from existing session
        setSession(session);
        setUser(session?.user ?? null);
        
        // 3. Fetch roles if we have a user
        if (session?.user && !initialized) {
          await fetchRoles(session.user.id);
        } else {
          setRoles([]);
          setRolesLoading(false);
        }
        
        setIsLoading(false);
        setInitialized(true);
        
        // 4. Set up listener for auth changes (after initial load)
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (!mounted) return;
            
            console.log('[AuthContext] Auth event:', event);
            
            setSession(newSession);
            setUser(newSession?.user ?? null);
            
            if (newSession?.user) {
              // Only fetch roles if user changed or signed in
              if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
                await fetchRoles(newSession.user.id);
              }
            } else {
              // User signed out
              setRoles([]);
              setRolesLoading(false);
            }
            
            setIsLoading(false);
          }
        );
        
        subscription = authSubscription;
        
      } catch (err) {
        if (!mounted) return;
        
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
      }
    };
    
    void initializeAuth();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[AuthContext] Sign out error:', error);
    } finally {
      // Always clear state, even if API call fails
      setUser(null);
      setSession(null);
      setRoles([]);
      setIsLoading(false); // Critical: reset loading state after sign out
      setRolesLoading(false);
      setIsFetchingRoles(false);
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

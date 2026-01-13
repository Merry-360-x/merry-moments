import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

  const fetchRoles = async (userId: string) => {
    // Prevent duplicate simultaneous fetches
    if (isFetchingRoles) return;
    
    setIsFetchingRoles(true);
    setRolesLoading(true);
    
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      // Keep existing roles on transient errors so nav buttons don't "disappear".
      // If the table/policies are misconfigured, the roles will remain empty anyway.
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
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        if (session?.user) {
          await fetchRoles(session.user.id);
        } else {
          setRoles([]);
          setRolesLoading(false);
        }
      }
    );

    // THEN check for existing session (only once on mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      if (session?.user) {
        void fetchRoles(session.user.id);
      } else {
        setRolesLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
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

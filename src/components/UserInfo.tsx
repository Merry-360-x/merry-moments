import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UserInfoProps {
  userId: string;
  variant?: "compact" | "full" | "inline";
  showEmail?: boolean;
  showPhone?: boolean;
  showNickname?: boolean;
}

interface UserProfile {
  full_name: string | null;
  nickname: string | null;
  phone: string | null;
  email: string | null;
}

export function UserInfo({ 
  userId, 
  variant = "compact", 
  showEmail = false, 
  showPhone = false,
  showNickname = true 
}: UserInfoProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserInfo() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch from profiles table
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, nickname, phone')
          .eq('user_id', userId)
          .single();

        // Fetch email from auth.users via admin query (if we have permission)
        // For now, we'll just use profile data
        const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
        const authUser = users?.find(u => u.id === userId);

        setProfile({
          full_name: profileData?.full_name || null,
          nickname: profileData?.nickname || null,
          phone: profileData?.phone || null,
          email: authUser?.email || null,
        });
      } catch (error) {
        console.error('Error fetching user info:', error);
        // Fallback to just showing user ID
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUserInfo();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <User className="w-3 h-3" />
        <span className="font-mono text-xs">{userId.slice(0, 8)}...</span>
      </div>
    );
  }

  const displayName = showNickname && profile.nickname 
    ? profile.nickname 
    : profile.full_name || "User";

  if (variant === "inline") {
    return (
      <span className="font-medium text-foreground">
        {displayName}
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1">
          <User className="w-3 h-3" />
          {displayName}
        </Badge>
      </div>
    );
  }

  // Full variant
  return (
    <div className="space-y-1">
      <div className="font-medium text-foreground flex items-center gap-2">
        <User className="w-4 h-4 text-muted-foreground" />
        {displayName}
        {profile.nickname && profile.full_name && profile.nickname !== profile.full_name && (
          <span className="text-xs text-muted-foreground">({profile.full_name})</span>
        )}
      </div>
      
      {showEmail && profile.email && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Mail className="w-3 h-3" />
          {profile.email}
        </div>
      )}
      
      {showPhone && profile.phone && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Phone className="w-3 h-3" />
          {profile.phone}
        </div>
      )}
    </div>
  );
}

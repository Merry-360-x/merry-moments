import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, UserCheck, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type DbError = { message?: string } | null;

const dbFrom = (table: string) => {
  return (supabase as unknown as { from: (name: string) => unknown }).from(table);
};

type HostSocialActionsProps = {
  hostId: string;
  hostName?: string | null;
  className?: string;
  showFollowersCount?: boolean;
};

const HostSocialActions = ({
  hostId,
  hostName,
  className,
  showFollowersCount = true,
}: HostSocialActionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isSavingFollow, setIsSavingFollow] = useState(false);

  const trimmedHostId = String(hostId || "").trim();
  const isOwnProfile = Boolean(user?.id && trimmedHostId && user.id === trimmedHostId);
  const messagePath = useMemo(() => {
    if (!trimmedHostId) return "/messages";
    const params = new URLSearchParams({ peer: trimmedHostId });
    const candidateName = String(hostName || "").trim();
    if (candidateName) {
      params.set("name", candidateName);
    }
    return `/messages?${params.toString()}`;
  }, [hostName, trimmedHostId]);

  const { data: followersCount = 0 } = useQuery({
    queryKey: ["host-followers-count", trimmedHostId],
    enabled: Boolean(trimmedHostId),
    queryFn: async () => {
      const hostFollows = dbFrom("host_follows") as {
        select: (columns: string) => {
          eq: (
            column: string,
            value: string
          ) => Promise<{ data: Array<{ id: string }> | null; error: DbError }>;
        };
      };

      const { data, error } = await hostFollows.select("id").eq("host_id", trimmedHostId);
      if (error) throw error;
      return Array.isArray(data) ? data.length : 0;
    },
    staleTime: 15_000,
  });

  const { data: isFollowing = false } = useQuery({
    queryKey: ["host-following", user?.id, trimmedHostId],
    enabled: Boolean(user?.id && trimmedHostId && !isOwnProfile),
    queryFn: async () => {
      const hostFollows = dbFrom("host_follows") as {
        select: (columns: string) => {
          eq: (
            column: string,
            value: string
          ) => {
            eq: (
              column: string,
              value: string
            ) => {
              maybeSingle: () => Promise<{ data: { id: string } | null; error: DbError }>;
            };
          };
        };
      };

      const { data, error } = await hostFollows
        .select("id")
        .eq("follower_id", user!.id)
        .eq("host_id", trimmedHostId)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    staleTime: 10_000,
  });

  const requireSignIn = (redirectPath: string) => {
    const redirect = encodeURIComponent(redirectPath);
    navigate(`/auth?redirect=${redirect}`);
  };

  const handleMessage = () => {
    if (!trimmedHostId) {
      toast({
        title: "Host unavailable",
        description: "This host profile is missing required details.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      requireSignIn(messagePath);
      return;
    }

    if (isOwnProfile) {
      toast({
        title: "This is your listing",
        description: "Open Messages to continue conversations with guests.",
      });
      navigate("/messages");
      return;
    }

    navigate(messagePath);
  };

  const handleToggleFollow = async () => {
    if (!trimmedHostId) {
      toast({
        title: "Host unavailable",
        description: "This host profile is missing required details.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      requireSignIn(`${location.pathname}${location.search}`);
      return;
    }

    if (isOwnProfile) {
      toast({
        title: "Own profile",
        description: "You cannot follow your own host profile.",
      });
      return;
    }

    if (isSavingFollow) return;

    setIsSavingFollow(true);
    try {
      if (isFollowing) {
        const hostFollows = dbFrom("host_follows") as {
          delete: () => {
            eq: (
              column: string,
              value: string
            ) => {
              eq: (
                column: string,
                value: string
              ) => Promise<{ error: DbError }>;
            };
          };
        };

        const { error } = await hostFollows
          .delete()
          .eq("follower_id", user.id)
          .eq("host_id", trimmedHostId);
        if (error) throw error;
      } else {
        const hostFollows = dbFrom("host_follows") as {
          upsert: (
            values: { follower_id: string; host_id: string },
            options: { onConflict: string }
          ) => Promise<{ error: DbError }>;
        };

        const { error } = await hostFollows.upsert(
          {
            follower_id: user.id,
            host_id: trimmedHostId,
          },
          { onConflict: "follower_id,host_id" }
        );
        if (error) throw error;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["host-followers-count", trimmedHostId] }),
        queryClient.invalidateQueries({ queryKey: ["host-following", user.id, trimmedHostId] }),
      ]);

      toast({
        title: isFollowing ? "Unfollowed" : "Following host",
        description: isFollowing
          ? "You will no longer see this host in your followed list."
          : "You are now following this host.",
      });
    } catch (error) {
      toast({
        title: "Action failed",
        description: String((error as { message?: string })?.message || error || "Could not update follow status."),
        variant: "destructive",
      });
    } finally {
      setIsSavingFollow(false);
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        type="button"
        variant={isFollowing ? "outline" : "default"}
        onClick={handleToggleFollow}
        disabled={isSavingFollow || isOwnProfile || !trimmedHostId}
      >
        {isFollowing ? <UserCheck className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
        {isFollowing ? "Following" : "Follow"}
      </Button>
      <Button type="button" variant="outline" onClick={handleMessage} disabled={!trimmedHostId}>
        <MessageCircle className="w-4 h-4 mr-2" />
        Message
      </Button>
      {showFollowersCount ? (
        <span className="text-xs text-muted-foreground">
          {followersCount} follower{followersCount === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  );
};

export default HostSocialActions;

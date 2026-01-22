/**
 * UserDisplay Component
 * Shows user information with avatar, name, and contact details
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { fetchUserInfo, formatUserDisplay } from "@/lib/user-display";
import { Mail, Phone, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserDisplayProps {
  userId: string;
  showAvatar?: boolean;
  showContact?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function UserDisplay({
  userId,
  showAvatar = true,
  showContact = true,
  showEmail = false,
  showPhone = false,
  className,
  size = "md",
}: UserDisplayProps) {
  const { data: userInfo, isLoading } = useQuery({
    queryKey: ["user-info", userId],
    queryFn: () => fetchUserInfo(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {showAvatar && <Skeleton className="h-8 w-8 rounded-full" />}
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  const { name, contact, initials } = formatUserDisplay(userInfo);

  const avatarSize = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-12 w-12" : "h-8 w-8";
  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showAvatar && (
        <Avatar className={avatarSize}>
          <AvatarImage src={userInfo?.avatar_url || undefined} alt={name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {initials || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className="flex-1 min-w-0">
        <div className={cn("font-medium truncate", textSize)}>{name}</div>
        
        {showContact && contact && (
          <div className="text-xs text-muted-foreground truncate">{contact}</div>
        )}
        
        {showEmail && userInfo?.email && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span className="truncate">{userInfo.email}</span>
          </div>
        )}
        
        {showPhone && userInfo?.phone && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>{userInfo.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact user display for tables - just name with tooltip
 */
export function UserDisplayCompact({ userId, className }: { userId: string; className?: string }) {
  const { data: userInfo, isLoading } = useQuery({
    queryKey: ["user-info", userId],
    queryFn: () => fetchUserInfo(userId),
    staleTime: 5 * 60 * 1000,
    enabled: !!userId,
  });

  if (isLoading) {
    return <Skeleton className="h-4 w-24" />;
  }

  const { name, contact } = formatUserDisplay(userInfo);

  return (
    <div className={cn("flex flex-col", className)}>
      <span className="font-medium text-sm">{name}</span>
      {contact && <span className="text-xs text-muted-foreground">{contact}</span>}
    </div>
  );
}

/**
 * User badge - shows just the name in a badge format
 */
export function UserBadge({ userId }: { userId: string }) {
  const { data: userInfo, isLoading } = useQuery({
    queryKey: ["user-info", userId],
    queryFn: () => fetchUserInfo(userId),
    staleTime: 5 * 60 * 1000,
    enabled: !!userId,
  });

  if (isLoading) {
    return <Skeleton className="h-5 w-20" />;
  }

  const { name, initials } = formatUserDisplay(userInfo);

  return (
    <Badge variant="outline" className="gap-1.5">
      <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium">
        {initials}
      </div>
      {name}
    </Badge>
  );
}

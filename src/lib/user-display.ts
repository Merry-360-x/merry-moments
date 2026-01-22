/**
 * User Display Utilities
 * Helpers to display user information instead of raw UUIDs
 */

import { supabase } from "@/integrations/supabase/client";

export interface UserInfo {
  user_id: string;
  full_name?: string | null;
  nickname?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

/**
 * Fetch user profile information for display
 */
export async function fetchUserInfo(userId: string): Promise<UserInfo | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, nickname, email, phone, avatar_url")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error(`Failed to fetch user info for ${userId}:`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error fetching user info:`, error);
    return null;
  }
}

/**
 * Fetch multiple users' information at once
 */
export async function fetchUsersInfo(userIds: string[]): Promise<Map<string, UserInfo>> {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  
  if (uniqueIds.length === 0) {
    return new Map();
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, nickname, email, phone, avatar_url")
      .in("user_id", uniqueIds);

    if (error) {
      console.error("Failed to fetch users info:", error);
      return new Map();
    }

    const map = new Map<string, UserInfo>();
    for (const user of data || []) {
      map.set(user.user_id, user);
    }
    return map;
  } catch (error) {
    console.error("Error fetching users info:", error);
    return new Map();
  }
}

/**
 * Get display name for a user (prefers nickname > full_name)
 */
export function getDisplayName(user: UserInfo | null | undefined): string {
  if (!user) return "Unknown User";
  return user.nickname || user.full_name || user.email || `User ${user.user_id.slice(0, 8)}`;
}

/**
 * Get contact info string (email and/or phone)
 */
export function getContactInfo(user: UserInfo | null | undefined): string {
  if (!user) return "";
  
  const parts: string[] = [];
  if (user.email) parts.push(user.email);
  if (user.phone) parts.push(user.phone);
  
  return parts.join(" • ");
}

/**
 * Format user for display with name and contact
 */
export function formatUserDisplay(user: UserInfo | null | undefined): {
  name: string;
  contact: string;
  initials: string;
} {
  const name = getDisplayName(user);
  const contact = getContactInfo(user);
  
  // Get initials from name
  const initials = name
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return { name, contact, initials };
}

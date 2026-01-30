import { useState, useEffect, useCallback, useMemo } from "react";

// Storage key prefix for last-seen timestamps
const STORAGE_PREFIX = "dashboard_last_seen_";

interface NotificationState {
  [key: string]: number; // count of new items per category
}

/**
 * Hook to manage notification badges for dashboards
 * Tracks "last seen" timestamps and counts items created after that time
 */
export function useNotificationBadge(dashboardId: string) {
  const [notifications, setNotifications] = useState<NotificationState>({});

  // Get the last seen timestamp for a category
  const getLastSeen = useCallback((category: string): string | null => {
    const key = `${STORAGE_PREFIX}${dashboardId}_${category}`;
    return localStorage.getItem(key);
  }, [dashboardId]);

  // Mark a category as seen (clear its notification)
  const markAsSeen = useCallback((category: string) => {
    const key = `${STORAGE_PREFIX}${dashboardId}_${category}`;
    localStorage.setItem(key, new Date().toISOString());
    setNotifications(prev => ({ ...prev, [category]: 0 }));
  }, [dashboardId]);

  // Update notification count for a category based on items
  const updateNotificationCount = useCallback((
    category: string,
    items: Array<{ created_at?: string; updated_at?: string }>,
    useUpdatedAt = false
  ) => {
    const lastSeen = getLastSeen(category);
    
    if (!lastSeen) {
      // First visit - mark as seen and show 0
      const key = `${STORAGE_PREFIX}${dashboardId}_${category}`;
      localStorage.setItem(key, new Date().toISOString());
      setNotifications(prev => ({ ...prev, [category]: 0 }));
      return;
    }

    const lastSeenDate = new Date(lastSeen);
    const newCount = items.filter(item => {
      const dateField = useUpdatedAt ? item.updated_at : item.created_at;
      if (!dateField) return false;
      return new Date(dateField) > lastSeenDate;
    }).length;

    setNotifications(prev => ({ ...prev, [category]: newCount }));
  }, [dashboardId, getLastSeen]);

  // Get total unread count
  const totalUnread = useMemo(() => {
    return Object.values(notifications).reduce((sum, count) => sum + count, 0);
  }, [notifications]);

  // Get count for a specific category
  const getCount = useCallback((category: string): number => {
    return notifications[category] || 0;
  }, [notifications]);

  // Check if category has new items
  const hasNew = useCallback((category: string): boolean => {
    return (notifications[category] || 0) > 0;
  }, [notifications]);

  return {
    notifications,
    totalUnread,
    getCount,
    hasNew,
    markAsSeen,
    updateNotificationCount,
    getLastSeen,
  };
}

/**
 * Badge component for showing notification count
 */
export function NotificationBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count === 0) return null;
  
  return (
    <span className={`absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] text-xs font-bold text-white bg-red-500 rounded-full px-1 ${className}`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default useNotificationBadge;

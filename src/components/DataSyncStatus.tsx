import { useEffect, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export const DataSyncStatus = () => {
  const { isOnline } = useNetworkStatus();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [showStatus, setShowStatus] = useState(false);

  const isLoading = isFetching > 0 || isMutating > 0;

  // Show status indicator when there's network activity or offline
  useEffect(() => {
    if (!isOnline || isLoading) {
      setShowStatus(true);
      
      // Auto-hide after activity stops
      const timer = setTimeout(() => {
        if (isOnline && !isLoading) {
          setShowStatus(false);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, isLoading]);

  if (!showStatus) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-background border rounded-lg px-3 py-2 shadow-lg">
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4 text-destructive" />
          <span className="text-sm text-muted-foreground">Offline</span>
        </>
      ) : isLoading ? (
        <>
          <RefreshCw className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground">Syncing...</span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-sm text-muted-foreground">Online</span>
        </>
      )}
    </div>
  );
};
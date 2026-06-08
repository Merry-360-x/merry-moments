import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useDataPersistence } from "@/hooks/useDataPersistence";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useBackgroundSync, useAdminBackgroundSync } from "@/hooks/useBackgroundSync";
import { usePlatformSync } from "@/hooks/usePlatformSync";
import { ReactNode } from "react";

interface RealtimeProviderProps {
  children: ReactNode;
}

export const RealtimeProvider = ({ children }: RealtimeProviderProps) => {
  // Initialize all real-time features
  useRealtimeSync();
  useDataPersistence();
  useNetworkStatus();
  useBackgroundSync();
  useAdminBackgroundSync();
  usePlatformSync(); // Cross-platform sync with Flutter and API

  return <>{children}</>;
};
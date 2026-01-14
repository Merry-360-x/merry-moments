import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useDataPersistence } from "@/hooks/useDataPersistence";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useBackgroundSync, useAdminBackgroundSync } from "@/hooks/useBackgroundSync";
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

  return <>{children}</>;
};
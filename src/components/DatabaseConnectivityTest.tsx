// Database connectivity test component
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { RefreshCw, CheckCircle, XCircle, Database } from "lucide-react";

export const DatabaseConnectivityTest = () => {
  const { data: connectionTest, isLoading, error, refetch } = useQuery({
    queryKey: ["database-connectivity-test"],
    queryFn: async () => {
      // Test multiple database operations
      const results = {
        timestamp: new Date().toISOString(),
        tests: [] as Array<{ name: string; status: 'success' | 'error'; count?: number; error?: string }>,
      };

      // Test 1: Properties count
      try {
        const { data: properties, error: propsError, count: propsCount } = await supabase
          .from("properties")
          .select("id", { count: 'exact' })
          .eq("is_published", true)
          .limit(1);
        
        if (propsError) throw propsError;
        results.tests.push({ name: "Properties", status: 'success', count: propsCount || 0 });
      } catch (err) {
        results.tests.push({ name: "Properties", status: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
      }

      // Test 2: Tours count
      try {
        const { data: tours, error: toursError, count: toursCount } = await supabase
          .from("tours")
          .select("id", { count: 'exact' })
          .eq("is_published", true)
          .limit(1);
        
        if (toursError) throw toursError;
        results.tests.push({ name: "Tours", status: 'success', count: toursCount || 0 });
      } catch (err) {
        results.tests.push({ name: "Tours", status: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
      }

      // Test 3: Vehicles count
      try {
        const { data: vehicles, error: vehiclesError, count: vehiclesCount } = await supabase
          .from("transport_vehicles")
          .select("id", { count: 'exact' })
          .eq("is_published", true)
          .limit(1);
        
        if (vehiclesError) throw vehiclesError;
        results.tests.push({ name: "Vehicles", status: 'success', count: vehiclesCount || 0 });
      } catch (err) {
        results.tests.push({ name: "Vehicles", status: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
      }

      // Test 4: Admin metrics RPC
      try {
        const { data: metrics, error: metricsError } = await supabase.rpc("admin_dashboard_metrics");
        
        if (metricsError) throw metricsError;
        results.tests.push({ name: "Admin RPC", status: 'success', count: metrics?.users_total || 0 });
      } catch (err) {
        results.tests.push({ name: "Admin RPC", status: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
      }

      return results;
    },
    staleTime: 1000 * 30, // 30 seconds
    retry: 2,
  });

  if (process.env.NODE_ENV === 'production') {
    return null; // Hide in production
  }

  return (
    <div className="fixed bottom-20 left-4 z-50 bg-background/95 backdrop-blur-sm border rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <Database className="w-5 h-5" />
        <span className="font-semibold text-sm">DB Status</span>
        <Button
          onClick={() => refetch()}
          variant="ghost"
          size="sm"
          className="ml-auto h-6 w-6 p-0"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {isLoading && (
        <div className="text-sm text-muted-foreground">Testing connection...</div>
      )}
      
      {error && (
        <div className="text-sm text-destructive">Connection failed</div>
      )}
      
      {connectionTest && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground mb-2">
            Last tested: {new Date(connectionTest.timestamp).toLocaleTimeString()}
          </div>
          {connectionTest.tests.map((test, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              {test.status === 'success' ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <XCircle className="w-3 h-3 text-red-500" />
              )}
              <span>{test.name}:</span>
              {test.status === 'success' ? (
                <span className="text-green-600">{test.count} records</span>
              ) : (
                <span className="text-red-600 truncate max-w-32" title={test.error}>
                  {test.error}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
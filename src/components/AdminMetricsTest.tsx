import { useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

export const AdminMetricsTest = () => {
  useEffect(() => {
    const testRPC = async () => {
      console.log('Testing admin_dashboard_metrics RPC...');
      try {
        const { data, error } = await supabase.rpc('admin_dashboard_metrics');
        console.log('RPC Result:', { data, error });
        
        if (error) {
          console.error('RPC Error Details:', error);
        } else {
          console.log('RPC Success - Data Structure:', Object.keys(data || {}));
          console.log('Sample Values:', {
            users_total: data?.users_total,
            properties_total: data?.properties_total,
            bookings_total: data?.bookings_total,
            revenue_gross: data?.revenue_gross,
          });
        }
      } catch (err) {
        console.error('Test Error:', err);
      }
    };

    testRPC();
  }, []);

  return (
    <div style={{ position: 'fixed', top: '10px', right: '10px', background: 'white', padding: '10px', border: '1px solid #ccc', zIndex: 9999 }}>
      <p>Check console for RPC test results</p>
    </div>
  );
};
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

type TestResult = {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
};

export function ProductionConnectionTest() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(true);

  const updateTest = (name: string, status: TestResult['status'], message: string, details?: string) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        return prev.map(t => t.name === name ? { name, status, message, details } : t);
      }
      return [...prev, { name, status, message, details }];
    });
  };

  useEffect(() => {
    const runTests = async () => {
      setIsRunning(true);

      // Test 1: Environment Variables
      updateTest('Environment Variables', 'pending', 'Checking...');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const cloudinaryName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const cloudinaryPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!supabaseUrl || !supabaseAnonKey) {
        updateTest('Environment Variables', 'error', 'Missing Supabase credentials', 
          'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
      } else if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
        updateTest('Environment Variables', 'error', 'Using LOCAL Supabase!', 
          `URL: ${supabaseUrl} - This should be your production URL (https://uwgiostcetoxotfnulfm.supabase.co)`);
      } else {
        updateTest('Environment Variables', 'success', 'Production Supabase configured', 
          `URL: ${supabaseUrl}\nCloudinary: ${cloudinaryName ? '✓ Configured' : '✗ Not configured'}`);
      }

      // Test 2: Database Connection
      updateTest('Database Connection', 'pending', 'Testing connection...');
      try {
        const { data, error } = await supabase.from('properties').select('id').limit(1);
        if (error) {
          updateTest('Database Connection', 'error', 'Database query failed', error.message);
        } else {
          updateTest('Database Connection', 'success', 'Database accessible', 
            `Successfully queried properties table. Found ${data?.length || 0} records.`);
        }
      } catch (err) {
        updateTest('Database Connection', 'error', 'Connection error', 
          err instanceof Error ? err.message : 'Unknown error');
      }

      // Test 3: Authentication Service
      updateTest('Authentication', 'pending', 'Checking auth service...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          updateTest('Authentication', 'warning', 'Auth check failed', error.message);
        } else if (session) {
          updateTest('Authentication', 'success', 'User is signed in', 
            `User: ${session.user.email}\nSession expires: ${new Date(session.expires_at! * 1000).toLocaleString()}`);
        } else {
          updateTest('Authentication', 'success', 'Auth service working (not signed in)', 
            'Authentication is configured correctly. Sign in to test further.');
        }
      } catch (err) {
        updateTest('Authentication', 'error', 'Auth error', 
          err instanceof Error ? err.message : 'Unknown error');
      }

      // Test 4: Storage Buckets
      updateTest('Storage', 'pending', 'Checking storage access...');
      try {
        const { data, error } = await supabase.storage.listBuckets();
        if (error) {
          updateTest('Storage', 'warning', 'Storage access limited', 
            `${error.message} - This is normal if you're not signed in`);
        } else {
          updateTest('Storage', 'success', 'Storage accessible', 
            `Found ${data.length} storage bucket(s): ${data.map(b => b.name).join(', ') || 'None'}`);
        }
      } catch (err) {
        updateTest('Storage', 'error', 'Storage error', 
          err instanceof Error ? err.message : 'Unknown error');
      }

      // Test 5: RPC Functions
      updateTest('RPC Functions', 'pending', 'Testing admin functions...');
      try {
        const { data, error } = await supabase.rpc('admin_dashboard_metrics');
        if (error) {
          if (error.message.includes('permission denied') || error.message.includes('not found')) {
            updateTest('RPC Functions', 'warning', 'Admin functions require permissions', 
              'This is normal. Admin functions only work when signed in as admin.');
          } else {
            updateTest('RPC Functions', 'error', 'RPC function error', error.message);
          }
        } else {
          updateTest('RPC Functions', 'success', 'RPC functions working', 
            `Admin metrics function executed successfully`);
        }
      } catch (err) {
        updateTest('RPC Functions', 'warning', 'RPC test skipped', 
          'Could not test RPC functions - may require authentication');
      }

      // Test 6: Cloudinary Configuration
      updateTest('Cloudinary', 'pending', 'Checking image upload config...');
      if (!cloudinaryName || !cloudinaryPreset) {
        updateTest('Cloudinary', 'warning', 'Cloudinary not configured', 
          'Image uploads will use Supabase Storage as fallback. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET for Cloudinary support.');
      } else {
        updateTest('Cloudinary', 'success', 'Cloudinary configured', 
          `Cloud: ${cloudinaryName}\nPreset: ${cloudinaryPreset}`);
      }

      setIsRunning(false);
    };

    runTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'pending':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'pending':
        return 'border-blue-200 bg-blue-50';
    }
  };

  const successCount = tests.filter(t => t.status === 'success').length;
  const errorCount = tests.filter(t => t.status === 'error').length;
  const warningCount = tests.filter(t => t.status === 'warning').length;

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Production Connection Test
          {isRunning && <Loader2 className="h-5 w-5 animate-spin" />}
        </CardTitle>
        <CardDescription>
          Verifying connection to production Supabase database and services
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tests.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 font-medium">
                {successCount} Passed
              </AlertDescription>
            </Alert>
            {errorCount > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 font-medium">
                  {errorCount} Failed
                </AlertDescription>
              </Alert>
            )}
            {warningCount > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 font-medium">
                  {warningCount} Warnings
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="space-y-3">
          {tests.map((test, idx) => (
            <Alert key={idx} className={getStatusColor(test.status)}>
              <div className="flex items-start gap-3">
                {getStatusIcon(test.status)}
                <div className="flex-1">
                  <div className="font-semibold">{test.name}</div>
                  <div className="text-sm">{test.message}</div>
                  {test.details && (
                    <pre className="text-xs mt-2 p-2 bg-white/50 rounded whitespace-pre-wrap">
                      {test.details}
                    </pre>
                  )}
                </div>
              </div>
            </Alert>
          ))}
        </div>

        {!isRunning && errorCount === 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✅ All critical tests passed! Your app is connected to the production Supabase database.
            </AlertDescription>
          </Alert>
        )}

        {!isRunning && errorCount > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              ❌ Some tests failed. Please check the errors above and fix your configuration.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

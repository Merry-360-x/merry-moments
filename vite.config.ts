import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separate node_modules into vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@radix-ui')) {
              return 'radix-vendor';
            }
            if (id.includes('@tanstack')) {
              return 'tanstack-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            return 'vendor';
          }
          // Separate large dashboard components
          if (id.includes('/pages/AdminDashboard')) {
            return 'admin-dashboard';
          }
          if (id.includes('/pages/FinancialStaffDashboard')) {
            return 'financial-dashboard';
          }
          if (id.includes('/pages/StaffDashboard') || id.includes('/pages/OperationsStaffDashboard')) {
            return 'staff-dashboard';
          }
        },
      },
    },
  },
}));

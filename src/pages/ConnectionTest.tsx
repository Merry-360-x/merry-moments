import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ProductionConnectionTest } from '@/components/ProductionConnectionTest';

export default function ConnectionTest() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">Connection Test</h1>
            <p className="text-muted-foreground">
              Verify your app is connected to production Supabase
            </p>
          </div>
          <ProductionConnectionTest />
        </div>
      </main>
      <Footer />
    </div>
  );
}

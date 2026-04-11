import Navbar from "@/components/Navbar";

export default function MobileMenuPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] bg-background" aria-label="Mobile navigation menu" />
    </div>
  );
}
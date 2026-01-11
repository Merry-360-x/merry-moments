import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isCloudinaryConfigured, uploadImageToCloudinary } from "@/lib/cloudinary";
import { useAuth } from "@/contexts/AuthContext";

type CheckResult =
  | { ok: true; title: string; detail?: string }
  | { ok: false; title: string; detail: string };

const mask = (value: string, show = 6) => {
  const v = (value ?? "").trim();
  if (!v) return "(missing)";
  if (v.length <= show * 2) return `${v.slice(0, 2)}…`;
  return `${v.slice(0, show)}…${v.slice(-show)}`;
};

export default function AdminIntegrations() {
  const { toast } = useToast();
  const { user, isAdmin, isStaff } = useAuth();

  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);

  const [uploading, setUploading] = useState(false);
  const [lastUploadUrl, setLastUploadUrl] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "");
  const supabaseAnon = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "");
  const cloudName = String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? "");
  const uploadPreset = String(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? "");

  const configSummary = useMemo(
    () => ({
      supabaseUrl: supabaseUrl ? supabaseUrl : "(missing)",
      supabaseAnon: mask(supabaseAnon),
      cloudName: cloudName ? cloudName : "(missing)",
      uploadPreset: uploadPreset ? mask(uploadPreset, 3) : "(missing)",
    }),
    [cloudName, supabaseAnon, supabaseUrl, uploadPreset]
  );

  const runChecks = async () => {
    setRunning(true);
    setResults([]);
    try {
      const next: CheckResult[] = [];

      // Auth/session
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        next.push({
          ok: true,
          title: "Supabase auth session",
          detail: data.session ? `Signed in as ${data.session.user.email ?? data.session.user.id}` : "No active session",
        });
      } catch (e) {
        next.push({
          ok: false,
          title: "Supabase auth session",
          detail: e instanceof Error ? e.message : "Unknown error",
        });
      }

      const tableChecks: Array<{ table: string; label: string }> = [
        { table: "properties", label: "Properties" },
        { table: "tours", label: "Tours" },
        { table: "transport_services", label: "Transport services" },
        { table: "transport_routes", label: "Transport routes" },
        { table: "transport_vehicles", label: "Transport vehicles" },
        { table: "favorites", label: "Favorites" },
        { table: "bookings", label: "Bookings" },
        { table: "trip_cart_items", label: "Trip cart items" },
        { table: "user_roles", label: "User roles" },
      ];

      for (const tc of tableChecks) {
        try {
          const { count, error } = await supabase
            .from(tc.table as never)
            .select("id", { count: "exact", head: true });
          if (error) throw error;
          next.push({
            ok: true,
            title: `Supabase table read: ${tc.label}`,
            detail: typeof count === "number" ? `${count} row(s) visible to this client (RLS applies)` : "OK",
          });
        } catch (e) {
          next.push({
            ok: false,
            title: `Supabase table read: ${tc.label}`,
            detail: e instanceof Error ? e.message : "Unknown error",
          });
        }
      }

      // Cloudinary config only (real upload tested separately)
      next.push(
        isCloudinaryConfigured()
          ? { ok: true, title: "Cloudinary config", detail: "Configured (client-side unsigned uploads enabled)" }
          : { ok: false, title: "Cloudinary config", detail: "Missing VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET" }
      );

      setResults(next);
      toast({ title: "Integration checks complete" });
    } finally {
      setRunning(false);
    }
  };

  const publishAllContent = async () => {
    setPublishing(true);
    try {
      const [toursRes, servicesRes, vehiclesRes, routesRes] = await Promise.all([
        supabase.from("tours").update({ is_published: true }).eq("is_published", false),
        supabase.from("transport_services").update({ is_published: true }).eq("is_published", false),
        supabase.from("transport_vehicles").update({ is_published: true }).eq("is_published", false),
        supabase.from("transport_routes").update({ is_published: true }).eq("is_published", false),
      ]);
      const firstErr = toursRes.error || servicesRes.error || vehiclesRes.error || routesRes.error;
      if (firstErr) throw firstErr;

      toast({
        title: "Published",
        description: "All tours/transport content was set to published (where permitted by RLS).",
      });
      await runChecks();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Publish failed",
        description: e instanceof Error ? e.message : "Check RLS policies and roles.",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleCloudinaryTestUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadImageToCloudinary(file, { folder: "merry360/integration-tests" });
      setLastUploadUrl(res.secureUrl);
      toast({ title: "Cloudinary upload OK", description: res.publicId });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Cloudinary upload failed",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Integrations</h1>
            <p className="text-muted-foreground">
              Live connectivity checks for Supabase + Cloudinary (useful to debug env vars, RLS, and uploads).
            </p>
          </div>
          <Button onClick={runChecks} disabled={running}>
            {running ? "Running checks…" : "Run checks"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-1">
            <h2 className="text-lg font-semibold text-foreground mb-4">Config (masked)</h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-muted-foreground">Supabase URL</div>
                <div className="break-all text-foreground">{configSummary.supabaseUrl}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Supabase anon key</div>
                <div className="break-all text-foreground">{configSummary.supabaseAnon}</div>
              </div>
              <div className="pt-2 border-t border-border" />
              <div>
                <div className="text-muted-foreground">Cloudinary cloud name</div>
                <div className="break-all text-foreground">{configSummary.cloudName}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Cloudinary upload preset</div>
                <div className="break-all text-foreground">{configSummary.uploadPreset}</div>
              </div>
              <div className="pt-2 border-t border-border" />
              <div>
                <div className="text-muted-foreground">Current user</div>
                <div className="break-all text-foreground">{user?.email ?? user?.id ?? "(not signed in)"}</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-foreground mb-4">Results</h2>
            {results.length === 0 ? (
              <p className="text-muted-foreground">Run checks to see results.</p>
            ) : (
              <div className="space-y-3">
                {results.map((r, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="font-medium text-foreground">{r.title}</div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          r.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {r.ok ? "OK" : "FAIL"}
                      </span>
                    </div>
                    {r.detail ? <div className="text-sm text-muted-foreground mt-2 break-words">{r.detail}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="mt-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">Make content visible</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Guest-facing pages show only <span className="font-medium">published</span> items. Use these actions to publish existing items or seed demo content.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={publishAllContent}
                disabled={publishing || !(isAdmin || isStaff)}
                variant="outline"
              >
                {publishing ? "Publishing…" : "Publish all tours/transport"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Note: Properties are managed by hosts. To show properties on Accommodations, a host must create a property and publish it in Host Dashboard.
            </p>
          </Card>
        </div>

        <div className="mt-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">Cloudinary upload test</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose an image file to upload via your unsigned preset. If it succeeds, the returned URL should render below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              <div>
                <Label htmlFor="cloudinaryUpload">Test image</Label>
                <Input
                  id="cloudinaryUpload"
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => handleCloudinaryTestUpload(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Note: unsigned uploads must be enabled in your Cloudinary upload preset.
                </p>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-2">Preview</div>
                {lastUploadUrl ? (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <img src={lastUploadUrl} alt="Cloudinary upload preview" className="w-full h-56 object-cover" />
                    <div className="p-3 text-xs text-muted-foreground break-all">{lastUploadUrl}</div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
                    No upload yet.
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}


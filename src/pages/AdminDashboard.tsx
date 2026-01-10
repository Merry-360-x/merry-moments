import { useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

type HostApplicationStatus = "draft" | "pending" | "approved" | "rejected";

type HostApplicationRow = {
  id: string;
  user_id: string;
  status: HostApplicationStatus;
  full_name: string | null;
  phone: string | null;
  business_name: string | null;
  hosting_location: string | null;
  review_notes: string | null;
  created_at: string;
};

const fetchApplications = async () => {
  const { data, error } = await supabase
    .from("host_applications")
    .select(
      "id, user_id, status, full_name, phone, business_name, hosting_location, review_notes, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as HostApplicationRow[];
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    data: applications = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["host_applications", "admin"],
    queryFn: fetchApplications,
  });

  const counts = useMemo(() => {
    const pending = applications.filter((a) => a.status === "pending").length;
    const approved = applications.filter((a) => a.status === "approved").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    return { pending, approved, rejected, total: applications.length };
  }, [applications]);

  const approve = async (app: HostApplicationRow) => {
    try {
      const note = window.prompt("Approval note (optional):") ?? null;

      const { error: updateError } = await supabase
        .from("host_applications")
        .update({ status: "approved", review_notes: note, reviewed_by: user?.id ?? null })
        .eq("id", app.id);

      if (updateError) throw updateError;

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: app.user_id, role: "host" });

      if (roleError) throw roleError;

      toast({ title: "Approved", description: "Host role granted." });
      await refetch();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Approval failed",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  const reject = async (app: HostApplicationRow) => {
    try {
      const note = window.prompt("Rejection reason (recommended):") ?? null;

      const { error } = await supabase
        .from("host_applications")
        .update({ status: "rejected", review_notes: note, reviewed_by: user?.id ?? null })
        .eq("id", app.id);

      if (error) throw error;

      toast({ title: "Rejected" });
      await refetch();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Rejection failed",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Review host applications and manage access</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/roles">Manage Roles</Link>
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-foreground">{counts.pending}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-foreground">{counts.approved}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold text-foreground">{counts.rejected}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-foreground">{counts.total}</p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Host applications</h2>

          {isLoading ? (
            <div className="py-10 text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : isError ? (
            <p className="text-muted-foreground">Couldn’t load applications.</p>
          ) : applications.length === 0 ? (
            <p className="text-muted-foreground">No applications yet.</p>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-border p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {app.full_name || "(no name)"} · {app.hosting_location || "(no location)"}
                    </p>
                    <p className="text-sm text-muted-foreground break-all">
                      {app.phone || ""} · user: {app.user_id}
                    </p>
                    <p className="text-xs text-muted-foreground">Status: {app.status}</p>
                    {app.review_notes ? (
                      <p className="text-xs text-muted-foreground mt-1">Note: {app.review_notes}</p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    {app.status === "pending" ? (
                      <>
                        <Button onClick={() => approve(app)}>Approve</Button>
                        <Button variant="outline" onClick={() => reject(app)}>
                          Reject
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" onClick={() => reject(app)}>
                        Update status
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Footer />
    </div>
  );
}

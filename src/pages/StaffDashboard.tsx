import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import { logError, uiErrorMessage } from "@/lib/ui-errors";

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

type AdminUserRow = {
  user_id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
  phone: string | null;
};

type PropertyRow = {
  id: string;
  title: string;
  location: string | null;
  price_per_night: number | null;
  currency: string | null;
  is_published: boolean | null;
  created_at: string;
};

type TourRow = {
  id: string;
  title: string;
  location: string | null;
  price_per_person: number | null;
  currency: string | null;
  is_published: boolean | null;
  created_at: string;
};

type TransportVehicleRow = {
  id: string;
  title: string;
  provider_name: string | null;
  vehicle_type: string | null;
  seats: number | null;
  price_per_day: number | null;
  currency: string | null;
  is_published: boolean | null;
  created_at: string;
};

type TransportRouteRow = {
  id: string;
  from_location: string | null;
  to_location: string | null;
  base_price: number | null;
  currency: string | null;
  is_published: boolean | null;
  created_at: string;
};

type StoryRow = {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
};

type BookingRow = {
  id: string;
  status: string;
  total_price: number;
  currency: string;
  created_at: string;
};

type Metrics = {
  users_total: number;
  stories_total: number;
  properties_total: number;
  properties_published: number;
  tours_total: number;
  tours_published: number;
  transport_services_total: number;
  transport_vehicles_total: number;
  transport_vehicles_published: number;
  transport_routes_total: number;
  transport_routes_published: number;
  bookings_total: number;
  bookings_pending: number;
  bookings_paid: number;
  orders_total: number;
  revenue_gross: number;
  revenue_by_currency: Array<{ currency: string; amount: number }>;
};

const fetchPending = async () => {
  const { data, error } = await supabase
    .from("host_applications")
    .select(
      "id, user_id, status, full_name, phone, business_name, hosting_location, review_notes, created_at"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as HostApplicationRow[];
};

export default function StaffDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tab, setTab] = useState<
    "overview" | "applications" | "users" | "accommodations" | "tours" | "transport" | "stories"
  >("overview");
  const [userSearch, setUserSearch] = useState("");

  const {
    data: applications = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["host_applications", "staff", "pending"],
    queryFn: fetchPending,
  });

  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ["staff_dashboard_metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_metrics");
      if (error) throw error;
      return data as unknown as Metrics;
    },
  });

  const { data: adminUsers = [] } = useQuery({
    queryKey: ["staff_list_users", userSearch],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", { _search: userSearch });
      if (error) throw error;
      return (data ?? []) as AdminUserRow[];
    },
    enabled: tab === "users",
  });

  const { data: properties = [], refetch: refetchProperties } = useQuery({
    queryKey: ["staff-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, location, price_per_night, currency, is_published, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as PropertyRow[];
    },
    enabled: tab === "accommodations",
  });

  const { data: tours = [], refetch: refetchTours } = useQuery({
    queryKey: ["staff-tours"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tours")
        .select("id, title, location, price_per_person, currency, is_published, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as TourRow[];
    },
    enabled: tab === "tours",
  });

  const { data: vehicles = [], refetch: refetchVehicles } = useQuery({
    queryKey: ["staff-transport-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_vehicles")
        .select("id, title, provider_name, vehicle_type, seats, price_per_day, currency, is_published, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as TransportVehicleRow[];
    },
    enabled: tab === "transport",
  });

  const { data: routes = [], refetch: refetchRoutes } = useQuery({
    queryKey: ["staff-transport-routes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_routes")
        .select("id, from_location, to_location, base_price, currency, is_published, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as TransportRouteRow[];
    },
    enabled: tab === "transport",
  });

  const { data: stories = [], refetch: refetchStories } = useQuery({
    queryKey: ["staff-stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("id, title, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as StoryRow[];
    },
    enabled: tab === "stories",
  });

  const { data: recentBookings = [] } = useQuery({
    queryKey: ["staff-recent-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, total_price, currency, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as BookingRow[];
    },
    enabled: tab === "overview",
  });

  const revenueLabel = useMemo(() => {
    const list = metrics?.revenue_by_currency ?? [];
    if (!list.length) return "—";
    if (list.length === 1) return formatMoney(Number(list[0].amount), String(list[0].currency ?? "USD"));
    return `${formatMoney(Number(list[0].amount), String(list[0].currency ?? "USD"))} (+${list.length - 1} more)`;
  }, [metrics?.revenue_by_currency]);

  const togglePublished = async (table: string, id: string, next: boolean) => {
    try {
      const { error } = await supabase.from(table as never).update({ is_published: next } as never).eq("id", id);
      if (error) throw error;
      toast({ title: "Updated", description: next ? "Published" : "Unpublished" });
      if (table === "properties") await refetchProperties();
      if (table === "tours") await refetchTours();
      if (table === "transport_vehicles") await refetchVehicles();
      if (table === "transport_routes") await refetchRoutes();
    } catch (e) {
      logError("staff.togglePublished", { table, id, next, e });
      toast({
        variant: "destructive",
        title: "Update failed",
        description: uiErrorMessage(e, "Please try again."),
      });
    }
  };

  const deleteRow = async (table: string, id: string) => {
    try {
      const ok = window.confirm("Delete this item permanently?");
      if (!ok) return;
      const { error } = await supabase.from(table as never).delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Deleted" });
      if (table === "tours") await refetchTours();
      if (table === "transport_vehicles") await refetchVehicles();
      if (table === "transport_routes") await refetchRoutes();
      if (table === "stories") await refetchStories();
    } catch (e) {
      logError("staff.deleteRow", { table, id, e });
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: uiErrorMessage(e, "Please try again."),
      });
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("staff-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, async () => {
        await refetchMetrics();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_cart_items" }, async () => {
        await refetchMetrics();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, async () => {
        await refetchMetrics();
        if (tab === "accommodations") await refetchProperties();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tours" }, async () => {
        await refetchMetrics();
        if (tab === "tours") await refetchTours();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transport_vehicles" }, async () => {
        await refetchMetrics();
        if (tab === "transport") await refetchVehicles();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transport_routes" }, async () => {
        await refetchMetrics();
        if (tab === "transport") await refetchRoutes();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, async () => {
        await refetchMetrics();
        if (tab === "stories") await refetchStories();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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
      logError("staff.approveHostApplication", e);
      toast({
        variant: "destructive",
        title: "Approval failed",
        description: uiErrorMessage(e, "Please try again."),
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
      logError("staff.rejectHostApplication", e);
      toast({
        variant: "destructive",
        title: "Rejection failed",
        description: uiErrorMessage(e, "Please try again."),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Staff Dashboard</h1>
            <p className="text-muted-foreground">Manage accommodations, tours, transport and stories (staff scope)</p>
          </div>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={async () => {
              await refetch();
              await refetchMetrics();
            }}
          >
            Refresh data
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <Card className="p-5 border-primary/20">
            <div className="text-sm text-muted-foreground">Revenue (gross)</div>
            <div className="text-2xl font-bold text-foreground mt-1">{revenueLabel}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Bookings</div>
            <div className="text-2xl font-bold text-foreground mt-1">{metrics?.bookings_total ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-2">
              Pending: {metrics?.bookings_pending ?? 0} · Paid: {metrics?.bookings_paid ?? 0}
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Orders</div>
            <div className="text-2xl font-bold text-foreground mt-1">{metrics?.orders_total ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-2">Trip cart items</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Published</div>
            <div className="text-2xl font-bold text-foreground mt-1">{metrics?.properties_published ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-2">Accommodations</div>
          </Card>
        </div>

        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Recent bookings</h2>
            <Badge variant="outline" className="border-primary/30 text-primary">
              {metrics?.bookings_total ?? 0} total
            </Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.status}</TableCell>
                  <TableCell>
                    {formatMoney(Number(b.total_price), String(b.currency ?? "USD"))}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(b.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applications">Host applications</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="accommodations">Accommodations</TabsTrigger>
            <TabsTrigger value="tours">Tours</TabsTrigger>
            <TabsTrigger value="transport">Transport</TabsTrigger>
            <TabsTrigger value="stories">Stories</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">What you can manage</h2>
              <p className="text-muted-foreground">
                Staff can manage transport, tours, accommodations publishing, and stories. User emails are view-only.
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="mt-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Pending host applications</h2>
              {isLoading ? (
                <div className="py-10 text-center">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : isError ? (
                <p className="text-muted-foreground">Couldn’t load applications.</p>
              ) : applications.length === 0 ? (
                <p className="text-muted-foreground">No pending applications.</p>
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
                      </div>
                      <div className="flex items-center gap-2">
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => approve(app)}>
                          Approve
                        </Button>
                        <Button variant="outline" onClick={() => reject(app)}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-foreground">Users (view only)</h2>
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search email, name, phone, or user id"
                  className="md:max-w-md"
                />
              </div>
              <div className="space-y-3">
                {adminUsers.map((u) => (
                  <div key={u.user_id} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="font-medium text-foreground break-all">{u.email ?? "(no email)"}</div>
                    <div className="text-sm text-muted-foreground">
                      {u.full_name ?? "(no name)"} · {u.phone ?? "(no phone)"}
                    </div>
                    <div className="text-xs text-muted-foreground break-all">user: {u.user_id}</div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="accommodations" className="mt-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Accommodations</h2>
                <Button variant="outline" onClick={() => refetchProperties()}>
                  Refresh
                </Button>
              </div>
              <div className="space-y-3">
                {properties.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{p.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {p.location ?? "(no location)"} · {formatMoney(p.price_per_night ?? 0, p.currency ?? "USD")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Published</span>
                        <Switch
                          checked={Boolean(p.is_published)}
                          onCheckedChange={(v) => togglePublished("properties", p.id, v)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tours" className="mt-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Tours</h2>
                <Button variant="outline" onClick={() => refetchTours()}>
                  Refresh
                </Button>
              </div>
              <div className="space-y-3">
                {tours.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{t.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {t.location ?? "(no location)"} · {formatMoney(t.price_per_person ?? 0, t.currency ?? "USD")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Published</span>
                        <Switch checked={Boolean(t.is_published)} onCheckedChange={(v) => togglePublished("tours", t.id, v)} />
                      </div>
                      <Button variant="outline" onClick={() => deleteRow("tours", t.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="transport" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Transport vehicles</h2>
                  <Button variant="outline" onClick={() => refetchVehicles()}>
                    Refresh
                  </Button>
                </div>
                <div className="space-y-3">
                  {vehicles.map((v) => (
                    <div key={v.id} className="rounded-lg border border-border p-4 flex flex-col gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{v.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {v.provider_name ?? "(no provider)"} · {v.vehicle_type ?? "Vehicle"} · {v.seats ?? 0} seats
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatMoney(v.price_per_day ?? 0, v.currency ?? "USD")} / day
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Published</span>
                          <Switch
                            checked={Boolean(v.is_published)}
                            onCheckedChange={(val) => togglePublished("transport_vehicles", v.id, val)}
                          />
                        </div>
                        <Button variant="outline" onClick={() => deleteRow("transport_vehicles", v.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Transport routes</h2>
                  <Button variant="outline" onClick={() => refetchRoutes()}>
                    Refresh
                  </Button>
                </div>
                <div className="space-y-3">
                  {routes.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border p-4 flex flex-col gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">
                          {r.from_location ?? "From"} → {r.to_location ?? "To"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatMoney(r.base_price ?? 0, r.currency ?? "USD")}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Published</span>
                          <Switch
                            checked={Boolean(r.is_published)}
                            onCheckedChange={(val) => togglePublished("transport_routes", r.id, val)}
                          />
                        </div>
                        <Button variant="outline" onClick={() => deleteRow("transport_routes", r.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stories" className="mt-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Stories</h2>
                <Button variant="outline" onClick={() => refetchStories()}>
                  Refresh
                </Button>
              </div>
              {stories.length === 0 ? (
                <p className="text-muted-foreground">No stories.</p>
              ) : (
                <div className="space-y-3">
                  {stories.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg border border-border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{s.title}</div>
                        <div className="text-xs text-muted-foreground break-all">user: {s.user_id}</div>
                      </div>
                      <Button variant="outline" onClick={() => deleteRow("stories", s.id)}>
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}

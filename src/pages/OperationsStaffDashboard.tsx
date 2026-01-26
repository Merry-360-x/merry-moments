import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Home, Plane, MapPin, CheckCircle, XCircle, Clock, CalendarCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type HostApplication = {
  id: string;
  user_id: string;
  service_types: string[];
  status: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
};

type Property = {
  id: string;
  title: string;
  is_published: boolean;
  host_id: string;
  created_at: string;
};

type TourPackage = {
  id: string;
  title: string;
  status: string;
  guide_id: string;
  created_at: string;
};

type Transport = {
  id: string;
  title: string;
  is_published: boolean;
  created_by: string;
  created_at: string;
  vehicle_type?: string;
};

type Booking = {
  id: string;
  property_id: string | null;
  tour_id: string | null;
  transport_id: string | null;
  booking_type: string | null;
  order_id: string | null;
  guest_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  is_guest_booking: boolean;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  currency: string;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  special_requests: string | null;
  host_id: string | null;
  created_at: string;
  properties?: { title: string } | null;
  tour_packages?: { title: string } | null;
  transport_vehicles?: { title: string } | null;
};

export default function OperationsStaffDashboard() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"overview" | "applications" | "accommodations" | "tours" | "transport" | "bookings" | "checkout">("overview");

  const { data: applications = [] } = useQuery({
    queryKey: ["operations_applications"],
    queryFn: async () => {
      console.log('[OperationsStaff] Fetching applications...');
      const { data, error } = await supabase
        .from("host_applications")
        .select("id, user_id, service_types, status, created_at, first_name, last_name, email")
        .order("created_at", { ascending: false });
      if (error) {
        console.error('[OperationsStaff] Applications error:', error);
        throw error;
      }
      console.log('[OperationsStaff] Applications fetched:', data?.length || 0);
      return (data ?? []) as HostApplication[];
    },
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["operations_properties"],
    queryFn: async () => {
      console.log('[OperationsStaff] Fetching properties...');
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, is_published, host_id, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        console.error('[OperationsStaff] Properties error:', error);
        throw error;
      }
      console.log('[OperationsStaff] Properties fetched:', data?.length || 0);
      return (data ?? []) as Property[];
    },
  });

  const { data: tours = [] } = useQuery({
    queryKey: ["operations_tours"],
    queryFn: async () => {
      console.log('[OperationsStaff] Fetching tours...');
      const { data, error } = await supabase
        .from("tour_packages")
        .select("id, title, status, guide_id, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        console.error('[OperationsStaff] Tours error:', error);
        throw error;
      }
      console.log('[OperationsStaff] Tours fetched:', data?.length || 0);
      return (data ?? []) as TourPackage[];
    },
  });

  const { data: transport = [] } = useQuery({
    queryKey: ["operations_transport"],
    queryFn: async () => {
      console.log('[OperationsStaff] Fetching transport...');
      const { data, error } = await supabase
        .from("transport_vehicles")
        .select("id, title, is_published, created_by, created_at, vehicle_type")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        console.error('[OperationsStaff] Transport error:', error);
        throw error;
      }
      console.log('[OperationsStaff] Transport fetched:', data?.length || 0);
      return (data ?? []) as Transport[];
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["operations_bookings"],
    queryFn: async () => {
      console.log('[OperationsStaff] Fetching bookings...');
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        console.error('[OperationsStaff] Bookings error:', error);
        throw error;
      }
      console.log('[OperationsStaff] Bookings fetched:', data?.length || 0);
      
      // Enrich with property/tour/transport details
      if (data && data.length > 0) {
        const propertyIds = [...new Set(data.filter(b => b.property_id).map(b => b.property_id))];
        const tourIds = [...new Set(data.filter(b => b.tour_id).map(b => b.tour_id))];
        const transportIds = [...new Set(data.filter(b => b.transport_id).map(b => b.transport_id))];
        
        const [properties, tours, vehicles] = await Promise.all([
          propertyIds.length > 0 
            ? supabase.from("properties").select("id, title, images").in("id", propertyIds).then(r => r.data || [])
            : Promise.resolve([]),
          tourIds.length > 0
            ? supabase.from("tour_packages").select("id, title").in("id", tourIds).then(r => r.data || [])
            : Promise.resolve([]),
          transportIds.length > 0
            ? supabase.from("transport_vehicles").select("id, title, vehicle_type").in("id", transportIds).then(r => r.data || [])
            : Promise.resolve([])
        ]);
        
        const enriched = data.map(booking => {
          const b = { ...booking };
          if (booking.property_id) {
            b.properties = properties.find(p => p.id === booking.property_id) || null;
          }
          if (booking.tour_id) {
            b.tour_packages = tours.find(t => t.id === booking.tour_id) || null;
          }
          if (booking.transport_id) {
            b.transport_vehicles = vehicles.find(v => v.id === booking.transport_id) || null;
          }
          return b;
        });
        
        return enriched as Booking[];
      }
      
      return (data ?? []) as Booking[];
    },
  });

  // Cart checkouts are bookings with order_id (bulk orders)
  const { data: cartCheckouts = [], refetch: refetchCartCheckouts } = useQuery({
    queryKey: ["operations_cart_checkouts"],
    queryFn: async () => {
      console.log('[OperationsStaff] Fetching cart checkout bookings...');
      // @ts-ignore - Supabase type inference issue
      const { data, error } = await supabase
        .from("bookings")
        .select("id, order_id, booking_type, property_id, tour_id, transport_id, guest_name, guest_email, guest_phone, payment_method, total_price, currency, status, payment_status, created_at, properties(title), tours(title), transport_vehicles(title)")
        .not("order_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        console.error('[OperationsStaff] Cart checkouts error:', error);
        throw error;
      }
      console.log('[OperationsStaff] Cart checkouts fetched:', data?.length || 0);
      // @ts-ignore - Supabase type inference issue
      return (data ?? []) as Booking[];
    },
  });

  const approveApplicationMutation = useMutation({
    mutationFn: async (id: string) => {
      // @ts-ignore - Supabase type inference issue
      const { error } = await supabase
        .from("host_applications")
        .update({ status: "approved" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations_applications"] });
      toast({ title: "Application approved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to approve application", variant: "destructive" });
    },
  });

  const rejectApplicationMutation = useMutation({
    mutationFn: async (id: string) => {
      // @ts-ignore - Supabase type inference issue
      const { error } = await supabase
        .from("host_applications")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations_applications"] });
      toast({ title: "Application rejected" });
    },
    onError: () => {
      toast({ title: "Failed to reject application", variant: "destructive" });
    },
  });

  const pendingApplications = applications.filter(a => a.status === 'pending');
  const approvedApplications = applications.filter(a => a.status === 'approved');

  const pendingProperties = properties.filter(p => !p.is_published);
  const activeProperties = properties.filter(p => p.is_published);

  const pendingTours = tours.filter(t => t.status === 'pending');
  const activeTours = tours.filter(t => t.status === 'approved');

  const pendingBookings = bookings.filter(b => b.status === 'pending_confirmation');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

  // Mutation to manually confirm a booking
  const confirmBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      // @ts-ignore - Supabase type inference issue
      const { error } = await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations_bookings"] });
      toast({ title: "Booking confirmed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to confirm booking", variant: "destructive" });
    },
  });

  // Mutation to manually confirm all bookings in a cart order
  const confirmCartOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // @ts-ignore - Supabase type inference issue
      const { error } = await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("order_id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations_cart_checkouts"] });
      toast({ title: "Cart order confirmed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to confirm cart order", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Operations Dashboard</h1>
          <p className="text-muted-foreground">Manage applications, approvals, and listings</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingApplications.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingBookings.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Need confirmation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Properties</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProperties.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Listed accommodations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tours</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTours.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Available tour packages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transport Listings</CardTitle>
              <Plane className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transport.length}</div>
              <p className="text-xs text-muted-foreground mt-1">All transport options</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applications">
              Applications
              {pendingApplications.length > 0 && (
                <Badge className="ml-2" variant="destructive">{pendingApplications.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="checkout">
              Cart Checkouts
              {cartCheckouts.filter(b => b.status === 'pending').length > 0 && (
                <Badge className="ml-1.5 px-1.5 py-0 text-xs h-5 min-w-[20px] rounded-full" variant="destructive">
                  {(() => {
                    const pendingOrders = new Set(cartCheckouts.filter(b => b.status === 'pending').map(b => b.order_id));
                    return pendingOrders.size;
                  })()}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bookings">
              Bookings
              {pendingBookings.length > 0 && (
                <Badge className="ml-2" variant="destructive">{pendingBookings.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="accommodations">Accommodations</TabsTrigger>
            <TabsTrigger value="tours">Tours</TabsTrigger>
            <TabsTrigger value="transport">Transport</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Applications</CardTitle>
                  <CardDescription>Host applications requiring review</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Service Types</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingApplications.slice(0, 5).map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.first_name} {app.last_name}</TableCell>
                          <TableCell>{app.email}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {(app.service_types || []).map((type) => (
                                <Badge key={type} variant="outline" className="text-xs">
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(app.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => approveApplicationMutation.mutate(app.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rejectApplicationMutation.mutate(app.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {pendingApplications.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No pending applications
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>All Applications</CardTitle>
                <CardDescription>Complete application history</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Service Types</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">{app.first_name} {app.last_name}</TableCell>
                        <TableCell>{app.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(app.service_types || []).map((type) => (
                              <Badge key={type} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              app.status === "approved"
                                ? "default"
                                : app.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {app.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(app.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {app.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => approveApplicationMutation.mutate(app.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rejectApplicationMutation.mutate(app.id)}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accommodations">
            <Card>
              <CardHeader>
                <CardTitle>Accommodation Listings</CardTitle>
                <CardDescription>Manage property listings</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell className="font-medium">{property.title}</TableCell>
                        <TableCell className="font-mono text-xs">{property.id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              property.is_published
                                ? "default"
                                : "secondary"
                            }
                          >
                            {property.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(property.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {properties.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No properties found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tours">
            <Card>
              <CardHeader>
                <CardTitle>Tour Packages</CardTitle>
                <CardDescription>Manage tour listings</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tours.map((tour) => (
                      <TableRow key={tour.id}>
                        <TableCell className="font-medium">{tour.title}</TableCell>
                        <TableCell className="font-mono text-xs">{tour.id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              tour.status === "approved"
                                ? "default"
                                : tour.status === "pending"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {tour.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(tour.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {tours.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No tours found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transport">
            <Card>
              <CardHeader>
                <CardTitle>Transport Listings</CardTitle>
                <CardDescription>Manage transport vehicles</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transport.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell>{item.vehicle_type || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-xs">{item.id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.is_published
                                ? "default"
                                : "secondary"
                            }
                          >
                            {item.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(item.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {transport.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No transport vehicles found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Bookings</CardTitle>
                <CardDescription>Manage property bookings and reservations</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Check-In</TableHead>
                      <TableHead>Check-Out</TableHead>
                      <TableHead>Guests</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => {
                      let itemName = "Unknown";
                      let itemType = booking.booking_type || "property";
                      
                      if (itemType === "property" && booking.properties) {
                        itemName = booking.properties.title;
                      } else if (itemType === "tour" && booking.tour_packages) {
                        itemName = booking.tour_packages.title;
                      } else if (itemType === "transport" && booking.transport_vehicles) {
                        itemName = booking.transport_vehicles.title;
                      }
                      
                      return (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {itemType === "property" && booking.properties?.images?.[0] && (
                              <img 
                                src={booking.properties.images[0]} 
                                alt={itemName}
                                className="w-10 h-10 rounded object-cover"
                              />
                            )}
                            {itemType === "property" && !booking.properties?.images?.[0] && (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                <Home className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            {itemType === "tour" && (
                              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-primary" />
                              </div>
                            )}
                            {itemType === "transport" && (
                              <div className="w-10 h-10 rounded bg-secondary/50 flex items-center justify-center">
                                <Plane className="w-5 h-5 text-secondary-foreground" />
                              </div>
                            )}
                            <span className="text-sm font-medium line-clamp-1">{itemName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {booking.order_id ? (
                            <Badge variant="secondary" className="font-mono text-xs">
                              {booking.order_id.slice(0, 8)}...
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {booking.guest_name || 'N/A'}
                          <div className="text-xs text-muted-foreground">{booking.guest_email}</div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(booking.check_in).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(booking.check_out).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{booking.guests}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {booking.currency} {booking.total_price.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              booking.status === "confirmed"
                                ? "default"
                                : booking.status === "pending_confirmation"
                                ? "secondary"
                                : booking.status === "completed"
                                ? "outline"
                                : "destructive"
                            }
                          >
                            {booking.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {/* Admin or Operations Staff can confirm bookings */}
                          {(isAdmin || true) && (booking.status === "pending_confirmation" || booking.status === "pending") ? (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => confirmBookingMutation.mutate(booking.id)}
                              disabled={confirmBookingMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Confirm
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                    })}
                    {bookings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          No bookings found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkout">
            <Card>
              <CardHeader>
                <CardTitle>Cart Checkout Orders</CardTitle>
                <CardDescription>Confirm bulk booking orders from the trip cart</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Group bookings by order_id
                      const orderMap = new Map<string, Booking[]>();
                      cartCheckouts.forEach(booking => {
                        if (booking.order_id) {
                          const existing = orderMap.get(booking.order_id) || [];
                          orderMap.set(booking.order_id, [...existing, booking]);
                        }
                      });

                      return Array.from(orderMap.entries()).map(([orderId, bookings]) => {
                        const firstBooking = bookings[0];
                        const totalAmount = bookings.reduce((sum, b) => sum + b.total_price, 0);
                        const allConfirmed = bookings.every(b => b.status === 'confirmed');
                        const anyPending = bookings.some(b => b.status === 'pending');

                        return (
                          <TableRow key={orderId}>
                            <TableCell className="font-mono text-xs">{orderId.slice(0, 8)}...</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{firstBooking.guest_name}</div>
                                <div className="text-xs text-muted-foreground">{firstBooking.guest_email}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{firstBooking.guest_phone || 'N/A'}</TableCell>
                            <TableCell>
                              <div className="text-xs space-y-1">
                                {bookings.map(b => {
                                  const itemName = b.booking_type === 'property' && b.properties ? b.properties.title :
                                                  b.booking_type === 'tour' && b.tour_packages ? b.tour_packages.title :
                                                  b.booking_type === 'transport' && b.transport_vehicles ? b.transport_vehicles.title : 'Item';
                                  const icon = b.booking_type === 'property' ? '🏠' : b.booking_type === 'tour' ? '🗺️' : '🚗';
                                  return <div key={b.id}>{icon} {itemName}</div>;
                                })}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{firstBooking.currency} {totalAmount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {firstBooking.payment_method?.replace('_', ' ').toUpperCase() || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={allConfirmed ? "default" : anyPending ? "secondary" : "destructive"}>
                                {allConfirmed ? 'Confirmed' : anyPending ? 'Pending' : 'Mixed'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {/* Admin or Operations Staff can confirm cart orders */}
                              {(isAdmin || true) && anyPending && (
                                <Button
                                  size="sm"
                                  onClick={() => confirmCartOrderMutation.mutate(orderId)}
                                  disabled={confirmCartOrderMutation.isPending}
                                  className="gap-1"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Confirm
                                </Button>
                              )}
                              {allConfirmed && (
                                <span className="text-sm text-muted-foreground">✓ Confirmed</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                    {cartCheckouts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No cart checkout orders found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

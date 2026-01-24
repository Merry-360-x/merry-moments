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
  property_id: string;
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
  payment_method: string | null;
  special_requests: string | null;
  host_id: string | null;
  created_at: string;
};

export default function OperationsStaffDashboard() {
  const { toast } = useToast();
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
        .select("id, property_id, guest_id, guest_name, guest_email, guest_phone, is_guest_booking, check_in, check_out, guests, total_price, currency, status, payment_method, special_requests, host_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        console.error('[OperationsStaff] Bookings error:', error);
        throw error;
      }
      console.log('[OperationsStaff] Bookings fetched:', data?.length || 0);
      return (data ?? []) as Booking[];
    },
  });

  const { data: checkoutRequests = [] } = useQuery({
    queryKey: ["operations_checkout_requests"],
    queryFn: async () => {
      console.log('[OperationsStaff] Fetching checkout requests...');
      const { data, error } = await supabase
        .from("checkout_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        console.error('[OperationsStaff] Checkout requests error:', error);
        throw error;
      }
      console.log('[OperationsStaff] Checkout requests fetched:', data?.length || 0);
      return data ?? [];
    },
  });

  const approveApplicationMutation = useMutation({
    mutationFn: async (id: string) => {
      // @ts-expect-error - Supabase type issue with host_applications update
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
      // @ts-expect-error - Supabase type issue with host_applications update
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
              {checkoutRequests.filter(r => r.status === 'pending_confirmation').length > 0 && (
                <Badge className="ml-2" variant="destructive">
                  {checkoutRequests.filter(r => r.status === 'pending_confirmation').length}
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
                      <TableHead>Guest</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Check-In</TableHead>
                      <TableHead>Check-Out</TableHead>
                      <TableHead>Guests</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          {booking.guest_name || 'N/A'}
                          <br />
                          <span className="text-xs text-muted-foreground">{booking.guest_email}</span>
                        </TableCell>
                        <TableCell>{booking.guest_phone || 'N/A'}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(booking.check_in).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(booking.check_out).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{booking.guests}</TableCell>
                        <TableCell>
                          {booking.payment_method ? (
                            <Badge variant="outline" className="text-xs">
                              {booking.payment_method.replace('_', ' ').toUpperCase()}
                            </Badge>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell className="font-mono">
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
                        <TableCell className="text-sm">
                          {new Date(booking.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
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
                <CardTitle>Cart Checkout Requests</CardTitle>
                <CardDescription>Manage checkout requests from the trip cart</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkoutRequests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.name}</TableCell>
                        <TableCell className="text-sm">{request.email}</TableCell>
                        <TableCell className="text-sm">{request.phone || 'N/A'}</TableCell>
                        <TableCell>
                          {request.payment_method ? (
                            <Badge variant="outline" className="text-xs">
                              {request.payment_method.replace('_', ' ').toUpperCase()}
                            </Badge>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {Array.isArray(request.items) ? request.items.length : 0} items
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              request.status === "confirmed"
                                ? "default"
                                : request.status === "pending_confirmation"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {request.status?.replace('_', ' ') || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(request.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {checkoutRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No checkout requests found
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

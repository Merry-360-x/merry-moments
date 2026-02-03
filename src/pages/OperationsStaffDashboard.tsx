import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Home, Plane, MapPin, CheckCircle, XCircle, Clock, CalendarCheck, Eye, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationBadge, NotificationBadge } from "@/hooks/useNotificationBadge";

type HostApplication = {
  id: string;
  user_id: string;
  service_types: string[];
  status: string;
  created_at: string;
  applicant_type?: string;
  full_name?: string;
  phone?: string;
  about?: string;
  national_id_number?: string;
  national_id_photo_url?: string;
  selfie_photo_url?: string;
  profile_complete?: boolean;
  tour_license_url?: string;
  rdb_certificate_url?: string;
  business_name?: string;
  business_tin?: string;
  hosting_location?: string;
  listing_title?: string;
  listing_location?: string;
  listing_property_type?: string;
  listing_price_per_night?: number;
  listing_currency?: string;
  listing_max_guests?: number;
  listing_bedrooms?: number;
  listing_bathrooms?: number;
  listing_amenities?: string[];
  listing_images?: string[];
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
};

type Property = {
  id: string;
  title: string;
  is_published: boolean;
  host_id: string;
  created_at: string;
  images?: string[];
  description?: string;
  price_per_night?: number;
  currency?: string;
  max_guests?: number;
  bedrooms?: number;
  bathrooms?: number;
  location?: string;
  property_type?: string;
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
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"overview" | "applications" | "accommodations" | "tours" | "transport" | "bookings">("overview");
  const [selectedApplication, setSelectedApplication] = useState<HostApplication | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
  const [orderBookings, setOrderBookings] = useState<Booking[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyDetailsOpen, setPropertyDetailsOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<TourPackage | null>(null);
  const [tourDetailsOpen, setTourDetailsOpen] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<Transport | null>(null);
  const [transportDetailsOpen, setTransportDetailsOpen] = useState(false);

  // Notification badge hook
  const { getCount, hasNew, markAsSeen, updateNotificationCount } = useNotificationBadge("operations-staff");

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Subscribe to host_applications changes
    const applicationsChannel = supabase
      .channel('operations-applications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'host_applications' }, () => {
        console.log('[OperationsStaff] Applications change detected - refetching...');
        queryClient.invalidateQueries({ queryKey: ['operations_applications'] });
      })
      .subscribe();
    channels.push(applicationsChannel);

    // Subscribe to properties changes
    const propertiesChannel = supabase
      .channel('operations-properties-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
        console.log('[OperationsStaff] Properties change detected - refetching...');
        queryClient.invalidateQueries({ queryKey: ['operations_properties'] });
      })
      .subscribe();
    channels.push(propertiesChannel);

    // Subscribe to tours changes
    const toursChannel = supabase
      .channel('operations-tours-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tour_packages' }, () => {
        console.log('[OperationsStaff] Tours change detected - refetching...');
        queryClient.invalidateQueries({ queryKey: ['operations_tours'] });
      })
      .subscribe();
    channels.push(toursChannel);

    // Subscribe to transport changes
    const transportChannel = supabase
      .channel('operations-transport-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_vehicles' }, () => {
        console.log('[OperationsStaff] Transport change detected - refetching...');
        queryClient.invalidateQueries({ queryKey: ['operations_transport'] });
      })
      .subscribe();
    channels.push(transportChannel);

    // Subscribe to bookings changes
    const bookingsChannel = supabase
      .channel('operations-bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        console.log('[OperationsStaff] Bookings change detected - refetching...');
        queryClient.invalidateQueries({ queryKey: ['operations_bookings'] });
      })
      .subscribe();
    channels.push(bookingsChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, queryClient]);

  const { data: applications = [] } = useQuery({
    queryKey: ["operations_applications"],
    queryFn: async () => {
      console.log('[OperationsStaff] Fetching applications...');
      const { data, error } = await supabase
        .from("host_applications")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error('[OperationsStaff] Applications error:', error);
        throw error;
      }
      
      // Fetch profile names and emails for each application
      const appsWithProfiles = await Promise.all(
        (data ?? []).map(async (app) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", app.user_id)
            .single();
          
          return {
            ...app,
            profiles: profile,
          };
        })
      );
      
      console.log('[OperationsStaff] Applications fetched:', appsWithProfiles?.length || 0);
      return appsWithProfiles as HostApplication[];
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["operations_properties"],
    queryFn: async () => {
      console.log('[OperationsStaff] Fetching properties...');
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        console.error('[OperationsStaff] Properties error:', error);
        throw error;
      }
      console.log('[OperationsStaff] Properties fetched:', data?.length || 0);
      return (data ?? []) as Property[];
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: tours = [] } = useQuery({
    queryKey: ["operations_tours"],
    queryFn: async () => {
      console.log('[OperationsStaff] Fetching tours...');
      const { data, error } = await supabase
        .from("tour_packages")
        .select("id, title, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        console.error('[OperationsStaff] Tours error:', error);
        throw error;
      }
      console.log('[OperationsStaff] Tours fetched:', data?.length || 0);
      return (data ?? []) as TourPackage[];
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
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
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
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
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Cart checkouts are bookings with order_id (bulk orders)
  const { data: cartCheckouts = [], refetch: refetchCartCheckouts } = useQuery({
    queryKey: ["operations_cart_checkouts"],
    queryFn: async () => {
      console.log('[OperationsStaff] Fetching cart checkout bookings...');
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .not("order_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        console.error('[OperationsStaff] Cart checkouts error:', error);
        throw error;
      }
      console.log('[OperationsStaff] Cart checkouts fetched:', data?.length || 0);
      
      // Enrich with property/tour/transport details
      if (data && data.length > 0) {
        const propertyIds = [...new Set(data.filter(b => b.property_id).map(b => b.property_id))];
        const tourIds = [...new Set(data.filter(b => b.tour_id).map(b => b.tour_id))];
        const transportIds = [...new Set(data.filter(b => b.transport_id).map(b => b.transport_id))];
        
        const [properties, tours, vehicles] = await Promise.all([
          propertyIds.length > 0 
            ? supabase.from("properties").select("id, title").in("id", propertyIds).then(r => r.data || [])
            : Promise.resolve([]),
          tourIds.length > 0
            ? supabase.from("tour_packages").select("id, title").in("id", tourIds).then(r => r.data || [])
            : Promise.resolve([]),
          transportIds.length > 0
            ? supabase.from("transport_vehicles").select("id, title").in("id", transportIds).then(r => r.data || [])
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
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Cart checkouts removed - bulk bookings now shown in regular bookings tab with order details

  const approveApplicationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("approve_host_application", {
        application_id: id,
        note: null,
      } as any);
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
                          <TableCell className="font-medium">{app.full_name || app.profiles?.full_name || "—"}</TableCell>
                          <TableCell>{app.profiles?.email || "—"}</TableCell>
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
                        <TableCell className="font-medium">
                          {app.full_name || app.profiles?.full_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {app.profiles?.email || "—"}
                        </TableCell>
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
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedApplication(app);
                                setDetailsOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                            {app.status === "pending" && (
                              <>
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
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Application Details Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Application Details</DialogTitle>
                  <DialogDescription>
                    Full information about the host application
                  </DialogDescription>
                </DialogHeader>
                {selectedApplication && (
                  <div className="space-y-6">
                    {/* Applicant Info */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg border-b pb-2">Applicant Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Full Name</p>
                          <p className="font-medium">{selectedApplication.full_name || selectedApplication.profiles?.full_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{selectedApplication.profiles?.email || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{selectedApplication.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Applicant Type</p>
                          <Badge variant="outline" className="capitalize">
                            {selectedApplication.applicant_type || 'individual'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Profile Status</p>
                          <Badge variant={selectedApplication.profile_complete ? "default" : "secondary"}>
                            {selectedApplication.profile_complete ? 'Complete' : 'Incomplete'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">National ID</p>
                          <p className="font-medium">{selectedApplication.national_id_number || 'N/A'}</p>
                        </div>
                      </div>
                      
                      {/* Service Types */}
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Services Offered</p>
                        <div className="flex gap-2 flex-wrap">
                          {selectedApplication.service_types && selectedApplication.service_types.length > 0 ? (
                            selectedApplication.service_types.map((service, idx) => (
                              <Badge key={idx} variant="secondary" className="capitalize">{service}</Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">Not specified</span>
                          )}
                        </div>
                      </div>
                      
                      {selectedApplication.about && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">About</p>
                          <p className="text-sm">{selectedApplication.about}</p>
                        </div>
                      )}
                    </div>

                    {/* Business Info */}
                    {selectedApplication.applicant_type === 'business' && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-lg border-b pb-2">Business Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Business Name</p>
                            <p className="font-medium">{selectedApplication.business_name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">TIN</p>
                            <p className="font-medium">{selectedApplication.business_tin || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hosting Info */}
                    {selectedApplication.hosting_location && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-lg border-b pb-2">Hosting Information</h3>
                        <div>
                          <p className="text-sm text-muted-foreground">Hosting Location</p>
                          <p className="font-medium">{selectedApplication.hosting_location}</p>
                        </div>
                      </div>
                    )}

                    {/* Property Listing Preview */}
                    {selectedApplication.listing_title && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-lg border-b pb-2">Property Listing Preview</h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Title</p>
                            <p className="font-medium">{selectedApplication.listing_title}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Location</p>
                              <p className="font-medium">{selectedApplication.listing_location || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Property Type</p>
                              <p className="font-medium">{selectedApplication.listing_property_type || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Price</p>
                              <p className="font-medium">
                                {selectedApplication.listing_price_per_night ? 
                                  `${selectedApplication.listing_currency || 'RWF'} ${selectedApplication.listing_price_per_night.toLocaleString()}/night` : 
                                  'N/A'
                                }
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Capacity</p>
                              <p className="font-medium">
                                {selectedApplication.listing_max_guests || 'N/A'} guests, {selectedApplication.listing_bedrooms || 'N/A'} bed, {selectedApplication.listing_bathrooms || 'N/A'} bath
                              </p>
                            </div>
                          </div>
                          {selectedApplication.listing_amenities && selectedApplication.listing_amenities.length > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Amenities</p>
                              <div className="flex flex-wrap gap-1">
                                {selectedApplication.listing_amenities.map((amenity, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {amenity}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedApplication.listing_images && selectedApplication.listing_images.length > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Images ({selectedApplication.listing_images.length})</p>
                              <div className="grid grid-cols-3 gap-2">
                                {selectedApplication.listing_images.slice(0, 6).map((img, idx) => (
                                  <img 
                                    key={idx} 
                                    src={img} 
                                    alt={`Property ${idx + 1}`}
                                    className="w-full h-24 object-cover rounded border"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Documents */}
                    {(selectedApplication.national_id_photo_url || selectedApplication.selfie_photo_url || selectedApplication.tour_license_url || selectedApplication.rdb_certificate_url) && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-lg border-b pb-2">Documents</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedApplication.national_id_photo_url && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">National ID / Passport</p>
                              <a href={selectedApplication.national_id_photo_url} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={selectedApplication.national_id_photo_url} 
                                  alt="National ID"
                                  className="max-w-full h-40 object-cover rounded border hover:opacity-80 transition"
                                />
                              </a>
                            </div>
                          )}
                          {selectedApplication.selfie_photo_url && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Selfie Photo</p>
                              <a href={selectedApplication.selfie_photo_url} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={selectedApplication.selfie_photo_url} 
                                  alt="Selfie"
                                  className="max-w-full h-40 object-cover rounded border hover:opacity-80 transition"
                                />
                              </a>
                            </div>
                          )}
                          {selectedApplication.tour_license_url && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Tour Guide License</p>
                              <a href={selectedApplication.tour_license_url} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={selectedApplication.tour_license_url} 
                                  alt="Tour License"
                                  className="max-w-full h-40 object-cover rounded border hover:opacity-80 transition"
                                />
                              </a>
                            </div>
                          )}
                          {selectedApplication.rdb_certificate_url && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">RDB Certificate</p>
                              <a href={selectedApplication.rdb_certificate_url} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={selectedApplication.rdb_certificate_url} 
                                  alt="RDB Certificate"
                                  className="max-w-full h-40 object-cover rounded border hover:opacity-80 transition"
                                />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Application Status */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Application Status</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge
                            variant={
                              selectedApplication.status === "approved"
                                ? "default"
                                : selectedApplication.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {selectedApplication.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Submitted On</p>
                          <p className="font-medium">
                            {new Date(selectedApplication.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Service Types */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Requested Services</h3>
                      <div className="flex gap-2 flex-wrap">
                        {(selectedApplication.service_types || []).map((type) => (
                          <Badge key={type} variant="outline" className="text-sm">
                            {type === 'accommodation' && <Home className="w-3 h-3 mr-1" />}
                            {type === 'tour' && <Plane className="w-3 h-3 mr-1" />}
                            {type === 'transport' && <MapPin className="w-3 h-3 mr-1" />}
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    {selectedApplication.status === "pending" && (
                      <div className="flex gap-3 pt-4 border-t">
                        <Button
                          className="flex-1"
                          onClick={() => {
                            approveApplicationMutation.mutate(selectedApplication.id);
                            setDetailsOpen(false);
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve Application
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            rejectApplicationMutation.mutate(selectedApplication.id);
                            setDetailsOpen(false);
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject Application
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>
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
                      <TableHead>Actions</TableHead>
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
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProperty(property);
                              setPropertyDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {properties.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                      <TableHead>Actions</TableHead>
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
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTour(tour);
                              setTourDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {tours.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                      <TableHead>Actions</TableHead>
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
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTransport(item);
                              setTransportDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {transport.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                setSelectedBooking(booking);
                                // If booking has order_id, fetch all bookings in that order
                                if (booking.order_id) {
                                  const { data } = await supabase
                                    .from("bookings")
                                    .select("*")
                                    .eq("order_id", booking.order_id);
                                  
                                  if (data) {
                                    // Enrich with details
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
                                    
                                    const enriched = data.map(b => {
                                      const booking = { ...b };
                                      if (b.property_id) {
                                        booking.properties = properties.find(p => p.id === b.property_id) || null;
                                      }
                                      if (b.tour_id) {
                                        booking.tour_packages = tours.find(t => t.id === b.tour_id) || null;
                                      }
                                      if (b.transport_id) {
                                        booking.transport_vehicles = vehicles.find(v => v.id === b.transport_id) || null;
                                      }
                                      return booking;
                                    });
                                    
                                    setOrderBookings(enriched as Booking[]);
                                  }
                                }
                                setBookingDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                            {(isAdmin || true) && (booking.status === "pending_confirmation" || booking.status === "pending") && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => confirmBookingMutation.mutate(booking.id)}
                                disabled={confirmBookingMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Confirm
                              </Button>
                            )}
                          </div>
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
        </Tabs>
      </main>
      <Footer />

      {/* Booking Details Dialog */}
      <Dialog open={bookingDetailsOpen} onOpenChange={setBookingDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Complete information about this booking
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
              {/* Cart Order Badge */}
              {selectedBooking.order_id && orderBookings.length > 1 && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="default" className="font-mono text-xs">
                      Cart Order: {selectedBooking.order_id.slice(0, 8)}...
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {orderBookings.length} items • Total: {selectedBooking.currency} {orderBookings.reduce((sum, b) => sum + b.total_price, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {orderBookings.map((orderBooking) => {
                      let itemName = "Unknown";
                      let itemType = orderBooking.booking_type || "property";
                      let itemIcon = "🏠";
                      
                      if (itemType === "property" && orderBooking.properties) {
                        itemName = orderBooking.properties.title;
                        itemIcon = "🏠";
                      } else if (itemType === "tour" && orderBooking.tour_packages) {
                        itemName = orderBooking.tour_packages.title;
                        itemIcon = "🗺️";
                      } else if (itemType === "transport" && orderBooking.transport_vehicles) {
                        itemName = orderBooking.transport_vehicles.title;
                        itemIcon = "🚗";
                      }
                      
                      const isCurrentBooking = orderBooking.id === selectedBooking.id;
                      
                      return (
                        <div
                          key={orderBooking.id}
                          className={`flex items-center justify-between p-2 rounded ${
                            isCurrentBooking ? "bg-primary/20 border border-primary" : "bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{itemIcon}</span>
                            <div>
                              <div className="font-medium text-sm">{itemName}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {orderBooking.host_id ? `Host: ${orderBooking.host_id}` : 'No host'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={orderBooking.status === "confirmed" ? "default" : "secondary"}>
                              {orderBooking.status.replace('_', ' ')}
                            </Badge>
                            <span className="font-mono text-sm">
                              {orderBooking.currency} {orderBooking.total_price.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Booking Information */}
              <div>
                <h3 className="font-semibold mb-3">Booking Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Booking ID</p>
                    <p className="font-mono text-sm">{selectedBooking.id}</p>
                  </div>
                  {selectedBooking.order_id && (
                    <div>
                      <p className="text-sm text-muted-foreground">Order ID</p>
                      <p className="font-mono text-sm">{selectedBooking.order_id}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Item Type</p>
                    <p className="capitalize">{selectedBooking.booking_type || 'property'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Item Name</p>
                    <p>
                      {selectedBooking.booking_type === "tour" && selectedBooking.tour_packages?.title}
                      {selectedBooking.booking_type === "transport" && selectedBooking.transport_vehicles?.title}
                      {(!selectedBooking.booking_type || selectedBooking.booking_type === "property") && selectedBooking.properties?.title}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Check-In</p>
                    <p>{new Date(selectedBooking.check_in).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Check-Out</p>
                    <p>{new Date(selectedBooking.check_out).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Number of Guests</p>
                    <p>{selectedBooking.guests}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Price</p>
                    <p className="font-mono">{selectedBooking.currency} {selectedBooking.total_price.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      variant={
                        selectedBooking.status === "confirmed"
                          ? "default"
                          : selectedBooking.status === "pending_confirmation"
                          ? "secondary"
                          : selectedBooking.status === "completed"
                          ? "outline"
                          : "destructive"
                      }
                    >
                      {selectedBooking.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Status</p>
                    <Badge variant={selectedBooking.payment_status === "paid" ? "default" : "secondary"}>
                      {selectedBooking.payment_status || 'pending'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Guest Information */}
              <div>
                <h3 className="font-semibold mb-3">Guest Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Guest Name</p>
                    <p>{selectedBooking.guest_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p>{selectedBooking.guest_email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p>{selectedBooking.guest_phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Guest Type</p>
                    <p>{selectedBooking.is_guest_booking ? 'Guest Checkout' : 'Registered User'}</p>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              {selectedBooking.payment_method && (
                <div>
                  <h3 className="font-semibold mb-3">Payment Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Method</p>
                      <p className="capitalize">{selectedBooking.payment_method}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Status</p>
                      <Badge variant={selectedBooking.payment_status === "paid" ? "default" : "secondary"}>
                        {selectedBooking.payment_status || 'pending'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Special Requests */}
              {selectedBooking.special_requests && (
                <div>
                  <h3 className="font-semibold mb-3">Special Requests</h3>
                  <p className="text-sm bg-muted p-3 rounded">{selectedBooking.special_requests}</p>
                </div>
              )}

              {/* Host Information */}
              {selectedBooking.host_id && (
                <div>
                  <h3 className="font-semibold mb-3">Host Information</h3>
                  <div>
                    <p className="text-sm text-muted-foreground">Host ID</p>
                    <p className="font-mono text-sm">{selectedBooking.host_id}</p>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div>
                <h3 className="font-semibold mb-3">Timestamps</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Created At</p>
                    <p className="text-sm">{new Date(selectedBooking.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Property Details Dialog */}
      <Dialog open={propertyDetailsOpen} onOpenChange={setPropertyDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Property Details</DialogTitle>
            <DialogDescription>
              Complete information about this property listing
            </DialogDescription>
          </DialogHeader>
          {selectedProperty && (
            <div className="space-y-6">
              {/* Property Images */}
              {selectedProperty.images && selectedProperty.images.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Images</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedProperty.images.slice(0, 4).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`${selectedProperty.title} - ${idx + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                  {selectedProperty.images.length > 4 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      +{selectedProperty.images.length - 4} more images
                    </p>
                  )}
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-3">Property Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Property ID</p>
                    <p className="font-mono text-sm">{selectedProperty.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="font-medium">{selectedProperty.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Property Type</p>
                    <p className="capitalize">{selectedProperty.property_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p>{selectedProperty.location || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={selectedProperty.is_published ? "default" : "secondary"}>
                      {selectedProperty.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  {selectedProperty.price_per_night && (
                    <div>
                      <p className="text-sm text-muted-foreground">Price per Night</p>
                      <p className="font-mono">{selectedProperty.currency || 'USD'} {selectedProperty.price_per_night.toLocaleString()}</p>
                    </div>
                  )}
                  {selectedProperty.max_guests && (
                    <div>
                      <p className="text-sm text-muted-foreground">Max Guests</p>
                      <p>{selectedProperty.max_guests}</p>
                    </div>
                  )}
                  {selectedProperty.bedrooms && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                      <p>{selectedProperty.bedrooms}</p>
                    </div>
                  )}
                  {selectedProperty.bathrooms && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bathrooms</p>
                      <p>{selectedProperty.bathrooms}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Host ID</p>
                    <p className="font-mono text-sm">{selectedProperty.host_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created At</p>
                    <p className="text-sm">{new Date(selectedProperty.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedProperty.description && (
                <div>
                  <h3 className="font-semibold mb-3">Description</h3>
                  <p className="text-sm bg-muted p-3 rounded">{selectedProperty.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tour Details Dialog */}
      <Dialog open={tourDetailsOpen} onOpenChange={setTourDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tour Package Details</DialogTitle>
            <DialogDescription>
              Complete information about this tour package
            </DialogDescription>
          </DialogHeader>
          {selectedTour && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Tour Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tour ID</p>
                    <p className="font-mono text-sm">{selectedTour.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="font-medium">{selectedTour.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      variant={
                        selectedTour.status === "approved"
                          ? "default"
                          : selectedTour.status === "pending"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {selectedTour.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Guide ID</p>
                    <p className="font-mono text-sm">{selectedTour.guide_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created At</p>
                    <p className="text-sm">{new Date(selectedTour.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transport Details Dialog */}
      <Dialog open={transportDetailsOpen} onOpenChange={setTransportDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transport Vehicle Details</DialogTitle>
            <DialogDescription>
              Complete information about this transport vehicle
            </DialogDescription>
          </DialogHeader>
          {selectedTransport && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Vehicle Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Vehicle ID</p>
                    <p className="font-mono text-sm">{selectedTransport.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="font-medium">{selectedTransport.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vehicle Type</p>
                    <p>{selectedTransport.vehicle_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={selectedTransport.is_published ? "default" : "secondary"}>
                      {selectedTransport.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created By</p>
                    <p className="font-mono text-sm">{selectedTransport.created_by}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created At</p>
                    <p className="text-sm">{new Date(selectedTransport.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SupportChat } from "@/components/SupportChat";
import { TicketActivityLogs } from "@/components/TicketActivityLogs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, MessageSquare, Mail, AlertCircle, Eye, Bell, Headset, Send, Clock } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationBadge, NotificationBadge } from "@/hooks/useNotificationBadge";

type User = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
};

type Profile = {
  user_id: string;
  full_name?: string;
  phone?: string;
  created_at?: string;
  email?: string;
};

type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  category?: string;
  status: string;
  priority: string;
  response?: string;
  created_at: string;
  user_email?: string;
};

type Booking = {
  id: string;
  property_id: string;
  guest_id?: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  status: string;
  created_at: string;
};

export default function CustomerSupportDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"overview" | "users" | "tickets" | "bookings">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketDetailsOpen, setTicketDetailsOpen] = useState(false);
  const [ticketResponse, setTicketResponse] = useState("");

  // Notification badge hook
  const { getCount, hasNew, markAsSeen, updateNotificationCount } = useNotificationBadge("customer-support");

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Subscribe to profiles changes (new users)
    const profilesChannel = supabase
      .channel('support-profiles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        console.log('[CustomerSupport] Profiles change detected - refetching...');
        queryClient.invalidateQueries({ queryKey: ['support_users'] });
      })
      .subscribe();
    channels.push(profilesChannel);

    // Subscribe to bookings changes
    const bookingsChannel = supabase
      .channel('support-bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        console.log('[CustomerSupport] Bookings change detected - refetching...');
        queryClient.invalidateQueries({ queryKey: ['support_bookings'] });
      })
      .subscribe();
    channels.push(bookingsChannel);

    // Subscribe to support_tickets changes
    const ticketsChannel = supabase
      .channel('support-tickets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        console.log('[CustomerSupport] Tickets change detected - refetching...');
        queryClient.invalidateQueries({ queryKey: ['support_tickets'] });
      })
      .subscribe();
    channels.push(ticketsChannel);

    // Subscribe to property_reviews changes (for user feedback)
    const reviewsChannel = supabase
      .channel('support-reviews-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_reviews' }, () => {
        console.log('[CustomerSupport] Reviews change detected');
        queryClient.invalidateQueries({ queryKey: ['support_reviews'] });
      })
      .subscribe();
    channels.push(reviewsChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, queryClient]);

  const { data: users = [] } = useQuery({
    queryKey: ["support_users"],
    queryFn: async () => {
      console.log('[CustomerSupport] Fetching profiles...');
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        console.error('[CustomerSupport] Profiles error:', error);
        throw error;
      }
      console.log('[CustomerSupport] Profiles fetched:', data?.length || 0);
      return (data ?? []) as Profile[];
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["support_bookings"],
    queryFn: async () => {
      console.log('[CustomerSupport] Fetching bookings...');
      const { data, error } = await supabase
        .from("bookings")
        .select("id, property_id, guest_id, guest_name, guest_email, guest_phone, check_in, check_out, guests, total_price, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        console.error('[CustomerSupport] Bookings error:', error);
        throw error;
      }
      console.log('[CustomerSupport] Bookings fetched:', data?.length || 0);
      return (data ?? []) as Booking[];
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Support tickets - fetch from database
  const { data: tickets = [], refetch: refetchTickets } = useQuery({
    queryKey: ["support_tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, user_id, subject, message, category, status, priority, response, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        // If table doesn't exist, return empty array
        if (error.message?.includes("does not exist") || error.code === "42P01" || error.code === "PGRST204") {
          console.warn("support_tickets table not yet created");
          return [];
        }
        throw error;
      }
      // Map to expected format
      return (data ?? []).map((t) => ({
        id: t.id,
        user_id: t.user_id,
        subject: t.subject,
        message: t.message,
        category: t.category,
        status: t.status || "open",
        priority: t.priority || "normal",
        response: t.response,
        created_at: t.created_at,
        user_email: "", // Will be enriched if needed
      })) as SupportTicket[];
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Parse response to extract responder name
  const parseResponse = (response?: string | null) => {
    if (!response) return { name: null as string | null, message: "" };
    const match = response.match(/^Support:\s*(.+)\n([\s\S]*)$/);
    if (match) {
      return { name: match[1].trim(), message: match[2].trim() };
    }
    return { name: null as string | null, message: response };
  };

  const notifyRefundStatus = async (ticketId: string, status: string, note?: string) => {
    try {
      await fetch("/api/booking-confirmation-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refund_status",
          ticketId,
          refundStatus: status,
          note,
          source: "support",
        }),
      });
    } catch (error) {
      console.warn("Failed to notify refund status by email", error);
    }
  };

  // Respond to ticket function
  const respondToTicket = async () => {
    if (!selectedTicket || !ticketResponse.trim()) return;
    try {
      // Fetch the staff member's name from profiles table
      let responderName = "Support Team";
      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .single();
        responderName = profile?.full_name || user?.email?.split("@")[0] || "Support Team";
      }
      
      const formattedResponse = `Support: ${responderName}\n${ticketResponse.trim()}`;
      const { error } = await supabase
        .from("support_tickets")
        .update({
          response: formattedResponse,
          status: "resolved",
        } as never)
        .eq("id", selectedTicket.id);
      if (error) throw error;
      await notifyRefundStatus(selectedTicket.id, "resolved", ticketResponse.trim());
      setTicketDetailsOpen(false);
      setTicketResponse("");
      setSelectedTicket(null);
      refetchTickets();
    } catch (e) {
      console.error("Failed to respond to ticket:", e);
    }
  };

  // Update ticket status
  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status } as never)
        .eq("id", ticketId);
      if (error) throw error;
      await notifyRefundStatus(ticketId, status);
      refetchTickets();
    } catch (e) {
      console.error("Failed to update ticket status:", e);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (user.full_name?.toLowerCase().includes(query)) ||
      (user.phone?.toLowerCase().includes(query)) ||
      (user.user_id?.toLowerCase().includes(query))
    );
  });

  const recentUsers = users.slice(0, 10);
  const openTickets = tickets.filter(t => t.status === 'open');
  const highPriorityTickets = tickets.filter(t => t.priority === 'high');
  const pendingBookings = bookings.filter(b => b.status === 'pending_confirmation');
  const recentBookings = bookings.slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Customer Support Dashboard</h1>
          <p className="text-muted-foreground">User management and support tickets</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openTickets.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting response</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{highPriorityTickets.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Urgent issues</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New This Week</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return u.created_at && new Date(u.created_at) > weekAgo;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">New users</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="bookings">
              Bookings
              {pendingBookings.length > 0 && (
                <Badge className="ml-2" variant="destructive">{pendingBookings.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tickets">
              Support Tickets
              {openTickets.length > 0 && (
                <Badge className="ml-2" variant="destructive">{openTickets.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6">
              {/* Recent Users */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Users</CardTitle>
                  <CardDescription>Latest user registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentUsers.map((user) => (
                        <TableRow key={user.user_id}>
                          <TableCell className="font-medium">
                            {user.full_name || "N/A"}
                          </TableCell>
                          <TableCell>{user.phone || "N/A"}</TableCell>
                          <TableCell className="text-sm">
                            {user.created_at
                              ? new Date(user.created_at).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {recentUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Open Tickets */}
              <Card>
                <CardHeader>
                  <CardTitle>Open Support Tickets</CardTitle>
                  <CardDescription>Tickets requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  {openTickets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No open support tickets</p>
                      <p className="text-xs mt-1">Great job! All tickets are resolved.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {openTickets.slice(0, 10).map((ticket) => (
                          <TableRow key={ticket.id}>
                            <TableCell className="font-medium">{ticket.subject}</TableCell>
                            <TableCell>{ticket.user_email}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  ticket.priority === "high"
                                    ? "destructive"
                                    : ticket.priority === "medium"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {ticket.priority}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Search and manage user accounts</CardDescription>
                <div className="mt-4">
                  <Input
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-mono text-xs">{user.user_id.slice(0, 8)}...</TableCell>
                        <TableCell className="font-medium">
                          {user.full_name || "N/A"}
                        </TableCell>
                        <TableCell>{user.phone || "N/A"}</TableCell>
                        <TableCell className="text-sm">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setUserDetailsOpen(true);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No users match your search
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
                <CardDescription>View and assist with customer bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Guest Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Guests</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-mono text-xs">{booking.id.slice(0, 8)}...</TableCell>
                        <TableCell className="font-medium">{booking.guest_name}</TableCell>
                        <TableCell>{booking.guest_email}</TableCell>
                        <TableCell>{booking.guest_phone}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(booking.check_in).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(booking.check_out).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{booking.guests}</TableCell>
                        <TableCell>${booking.total_price}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              booking.status === "confirmed"
                                ? "default"
                                : booking.status === "pending_confirmation"
                                ? "secondary"
                                : booking.status === "cancelled"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setBookingDetailsOpen(true);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {recentBookings.length === 0 && (
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

          <TabsContent value="tickets">
            <div className="grid gap-6">
              {/* Ticket Activity Logs */}
              <TicketActivityLogs limit={100} filterStorageKey="ticket_activity_filter_support_dashboard" />

              {/* Support Tickets Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Support Tickets</CardTitle>
                  <CardDescription>Manage customer support requests</CardDescription>
                </CardHeader>
                <CardContent>
                {tickets.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">No Support Tickets</p>
                    <p className="text-sm mt-2">
                      No tickets have been submitted yet.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{ticket.subject}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {ticket.category || "general"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                ticket.status === "resolved"
                                  ? "bg-green-100 text-green-800"
                                  : ticket.status === "in_progress"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-blue-100 text-blue-800"
                              }
                            >
                              {ticket.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setTicketDetailsOpen(true);
                                }}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              {ticket.status !== "resolved" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => updateTicketStatus(ticket.id, "in_progress")}
                                >
                                  In Progress
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Ticket Chat Dialog */}
        <Dialog open={ticketDetailsOpen} onOpenChange={setTicketDetailsOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
            {selectedTicket && (
              <SupportChat
                ticket={{
                  id: selectedTicket.id,
                  user_id: selectedTicket.user_id,
                  subject: selectedTicket.subject,
                  message: selectedTicket.message,
                  category: selectedTicket.category,
                  status: selectedTicket.status,
                  priority: selectedTicket.priority,
                  created_at: selectedTicket.created_at,
                }}
                userType="staff"
                onClose={() => setTicketDetailsOpen(false)}
                onStatusChange={(status) => {
                  setSelectedTicket((prev) => prev ? { ...prev, status } : null);
                  refetchTickets();
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* User Details Dialog */}
        <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Complete user account information
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-6">
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Account Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">User ID</p>
                      <p className="font-mono text-xs break-all">{selectedUser.user_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="text-sm font-medium">{selectedUser.full_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="text-sm">{selectedUser.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Created</p>
                      <p className="text-sm">
                        {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Booking Details Dialog */}
        <Dialog open={bookingDetailsOpen} onOpenChange={setBookingDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
              <DialogDescription>
                Complete booking information
              </DialogDescription>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-6">
                {/* Booking Information */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Booking Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Booking ID</p>
                      <p className="font-mono text-xs break-all">{selectedBooking.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge>{selectedBooking.status}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created Date</p>
                      <p className="text-sm">{new Date(selectedBooking.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Guest Information */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Guest Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="text-sm font-medium">{selectedBooking.guest_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm">{selectedBooking.guest_email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="text-sm">{selectedBooking.guest_phone || 'N/A'}</p>
                    </div>
                    {selectedBooking.guest_id && (
                      <div>
                        <p className="text-sm text-muted-foreground">Guest ID</p>
                        <p className="font-mono text-xs break-all">{selectedBooking.guest_id}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stay Details */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Stay Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Check-in</p>
                      <p className="text-sm font-medium">{selectedBooking.check_in}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Check-out</p>
                      <p className="text-sm font-medium">{selectedBooking.check_out}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Number of Guests</p>
                      <p className="text-sm">{selectedBooking.guests}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-lg font-bold">
                        {formatMoney(Number(selectedBooking.total_price), String(selectedBooking.currency ?? 'USD'))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}

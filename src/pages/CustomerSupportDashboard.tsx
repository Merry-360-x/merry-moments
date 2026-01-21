import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Users, MessageSquare, Mail, AlertCircle } from "lucide-react";

type User = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
};

type Profile = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  created_at?: string;
};

type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
  user_email?: string;
};

export default function CustomerSupportDashboard() {
  const [tab, setTab] = useState<"overview" | "users" | "tickets">("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["support_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  // Mock support tickets (you'll need to create this table)
  const { data: tickets = [] } = useQuery({
    queryKey: ["support_tickets"],
    queryFn: async () => {
      // For now, returning empty array since table doesn't exist yet
      // When you create the support_tickets table, this will work
      return [] as SupportTicket[];
    },
  });

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (user.email?.toLowerCase().includes(query)) ||
      (user.first_name?.toLowerCase().includes(query)) ||
      (user.last_name?.toLowerCase().includes(query))
    );
  });

  const recentUsers = users.slice(0, 10);
  const openTickets = tickets.filter(t => t.status === 'open');
  const highPriorityTickets = tickets.filter(t => t.priority === 'high');

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
                        <TableHead>Email</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.first_name && user.last_name
                              ? `${user.first_name} ${user.last_name}`
                              : "N/A"}
                          </TableCell>
                          <TableCell>{user.email || "N/A"}</TableCell>
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
                    placeholder="Search by name or email..."
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
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-xs">{user.id.slice(0, 8)}...</TableCell>
                        <TableCell className="font-medium">
                          {user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name}`
                            : "N/A"}
                        </TableCell>
                        <TableCell>{user.email || "N/A"}</TableCell>
                        <TableCell className="text-sm">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No users match your search
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets">
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
                      Support ticket system is not yet configured.
                    </p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      Contact your administrator to set up the support_tickets table.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-mono text-xs">
                            {ticket.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="font-medium">{ticket.subject}</TableCell>
                          <TableCell>{ticket.user_email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                ticket.status === "closed"
                                  ? "outline"
                                  : ticket.status === "in_progress"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {ticket.status}
                            </Badge>
                          </TableCell>
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
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

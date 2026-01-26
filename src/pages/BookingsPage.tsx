import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, AlertCircle, Package, Home, MapPin, Car } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { useToast } from "@/hooks/use-toast";

type BookingRow = any;

export default function BookingsPage() {
  const { user, isAdmin, isOperationsStaff, isCustomerSupport } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"booking" | "order">("booking");
  const [searchResults, setSearchResults] = useState<BookingRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Check if user has access
  const hasAccess = isAdmin || isOperationsStaff || isCustomerSupport;

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        variant: "destructive",
        title: "Search query required",
        description: "Please enter a booking ID or order ID"
      });
      return;
    }

    setIsSearching(true);
    try {
      let bookings: BookingRow[] = [];

      if (searchType === "booking") {
        // Search by booking ID
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", searchQuery.trim());
        
        if (error) throw error;
        bookings = data || [];

        // If it's part of a bulk order, fetch all items in that order
        if (bookings.length > 0 && bookings[0].order_id) {
          const { data: orderData } = await supabase
            .from("bookings")
            .select("*")
            .eq("order_id", bookings[0].order_id)
            .order("created_at", { ascending: false });
          
          bookings = orderData || bookings;
        }
      } else {
        // Search by order ID
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("order_id", searchQuery.trim())
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        bookings = data || [];
      }

      // Enrich bookings with related data
      if (bookings.length > 0) {
        const propertyIds = [...new Set(bookings.filter(b => b.property_id).map(b => b.property_id))];
        const tourIds = [...new Set(bookings.filter(b => b.tour_id).map(b => b.tour_id))];
        const transportIds = [...new Set(bookings.filter(b => b.transport_id).map(b => b.transport_id))];
        const hostIds = [...new Set(bookings.filter(b => b.host_id).map(b => b.host_id))];

        const [properties, tours, vehicles, hosts] = await Promise.all([
          propertyIds.length > 0 
            ? supabase.from("properties").select("id, title, images").in("id", propertyIds).then(r => r.data || [])
            : Promise.resolve([]),
          tourIds.length > 0
            ? supabase.from("tour_packages").select("id, title").in("id", tourIds).then(r => r.data || [])
            : Promise.resolve([]),
          transportIds.length > 0
            ? supabase.from("transport_vehicles").select("id, title, vehicle_type").in("id", transportIds).then(r => r.data || [])
            : Promise.resolve([]),
          hostIds.length > 0
            ? supabase.from("profiles").select("user_id, full_name, nickname, email").in("user_id", hostIds).then(r => r.data || [])
            : Promise.resolve([])
        ]);

        const enrichedBookings = bookings.map(booking => {
          const enriched = { ...booking };
          if (booking.property_id) {
            enriched.properties = properties.find(p => p.id === booking.property_id) || null;
          }
          if (booking.tour_id) {
            enriched.tour_packages = tours.find(t => t.id === booking.tour_id) || null;
          }
          if (booking.transport_id) {
            enriched.transport_vehicles = vehicles.find(v => v.id === booking.transport_id) || null;
          }
          if (booking.host_id) {
            enriched.profiles = hosts.find(h => h.user_id === booking.host_id) || null;
          }
          return enriched;
        });

        setSearchResults(enrichedBookings);
      } else {
        setSearchResults([]);
        toast({
          title: "No results",
          description: "No bookings found with that ID"
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        variant: "destructive",
        title: "Search failed",
        description: "An error occurred while searching"
      });
    } finally {
      setIsSearching(false);
    }
  };

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please sign in to access this page.
            </AlertDescription>
          </Alert>
        </div>
        <Footer />
      </>
    );
  }

  if (!hasAccess) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access this page. This page is for admin, operations staff, and customer support only.
            </AlertDescription>
          </Alert>
        </div>
        <Footer />
      </>
    );
  }

  const isBulkOrder = searchResults.length > 1 || (searchResults.length > 0 && searchResults[0].order_id);
  const totalAmount = searchResults.reduce((sum, b) => sum + (b.total_price || 0), 0);
  const currency = searchResults[0]?.currency || "RWF";

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Bookings Search</h1>
            <p className="text-muted-foreground">
              Search for bookings by booking ID or order ID (bulk bookings)
            </p>
          </div>

          {/* Search Bar */}
          <Card className="p-6 mb-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={searchType === "booking" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSearchType("booking")}
                >
                  Booking ID
                </Button>
                <Button
                  variant={searchType === "order" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSearchType("order")}
                >
                  Order ID (Bulk)
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder={`Enter ${searchType === "booking" ? "booking" : "order"} ID...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={isSearching}>
                  <Search className="w-4 h-4 mr-2" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Results */}
          {searchResults.length > 0 && (
            <div className="space-y-6">
              {/* Summary Card for Bulk Orders */}
              {isBulkOrder && (
                <Card className="p-6 border-primary/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary" />
                      <div>
                        <h2 className="font-semibold text-lg">Bulk Order</h2>
                        <p className="text-sm text-muted-foreground">
                          {searchResults.length} items in this order
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-2xl font-bold">{formatMoney(totalAmount, currency)}</p>
                    </div>
                  </div>
                  {searchResults[0].order_id && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Order ID</p>
                      <p className="font-mono text-sm">{searchResults[0].order_id}</p>
                    </div>
                  )}
                </Card>
              )}

              {/* Booking Items */}
              {searchResults.map((booking) => {
                let itemName = "Unknown Item";
                let itemIcon = <Package className="w-5 h-5" />;
                let itemType = "";

                if (booking.booking_type === "property" && booking.properties) {
                  itemName = booking.properties.title;
                  itemIcon = <Home className="w-5 h-5" />;
                  itemType = "Property";
                } else if (booking.booking_type === "tour" && booking.tour_packages) {
                  itemName = booking.tour_packages.title;
                  itemIcon = <MapPin className="w-5 h-5" />;
                  itemType = "Tour";
                } else if (booking.booking_type === "transport" && booking.transport_vehicles) {
                  itemName = `${booking.transport_vehicles.title} (${booking.transport_vehicles.vehicle_type})`;
                  itemIcon = <Car className="w-5 h-5" />;
                  itemType = "Transport";
                }

                return (
                  <Card key={booking.id} className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="text-primary">{itemIcon}</div>
                          <div>
                            <h3 className="font-semibold text-lg">{itemName}</h3>
                            <p className="text-sm text-muted-foreground">{itemType}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">{formatMoney(booking.total_price, booking.currency)}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                              {booking.status}
                            </Badge>
                            <Badge variant={booking.payment_status === 'paid' ? 'default' : 'outline'}>
                              {booking.payment_status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Booking Details Grid */}
                      <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Booking ID</p>
                          <p className="font-mono text-sm">{booking.id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Created</p>
                          <p className="text-sm">{new Date(booking.created_at).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Guest Name</p>
                          <p className="text-sm">{booking.guest_name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Email</p>
                          <p className="text-sm break-all">{booking.guest_email || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Phone</p>
                          <p className="text-sm">{booking.guest_phone || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Guests</p>
                          <p className="text-sm">{booking.guests || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Check-in</p>
                          <p className="text-sm">{booking.check_in || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Check-out</p>
                          <p className="text-sm">{booking.check_out || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Payment Method</p>
                          <p className="text-sm">{booking.payment_method || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Host</p>
                          <p className="text-sm">
                            {booking.profiles?.full_name || booking.profiles?.nickname || booking.profiles?.email || (booking.host_id ? booking.host_id.substring(0, 8) + "..." : "N/A")}
                          </p>
                          {booking.host_id && !booking.profiles && (
                            <p className="text-xs text-muted-foreground font-mono mt-1">{booking.host_id}</p>
                          )}
                        </div>
                      </div>

                      {/* Special Requests */}
                      {booking.special_requests && (
                        <div className="pt-4 border-t">
                          <p className="text-sm text-muted-foreground mb-1">Special Requests</p>
                          <p className="text-sm">{booking.special_requests}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {searchResults.length === 0 && !isSearching && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Enter a booking ID or order ID above to search
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

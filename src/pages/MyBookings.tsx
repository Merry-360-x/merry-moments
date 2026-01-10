import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Users, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Booking {
  id: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number;
  currency: string;
  status: string;
  created_at: string;
  properties: {
    title: string;
    location: string;
    property_type: string;
  } | null;
}

const MyBookings = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, properties(title, location, property_type)")
      .eq("guest_id", user!.id)
      .order("created_at", { ascending: false });

    if (data) setBookings(data as Booking[]);
    setIsLoading(false);
  };

  const cancelBooking = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("guest_id", user!.id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Booking cancelled" });
      fetchBookings();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-12">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">My Bookings</h1>
        <p className="text-muted-foreground mb-8">View and manage your reservations</p>

        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-20 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No bookings yet</h2>
            <p className="text-muted-foreground mb-6">
              Start exploring and book your first property!
            </p>
            <Button onClick={() => navigate("/accommodations")}>Browse Properties</Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-card rounded-xl p-6 shadow-card flex flex-col md:flex-row gap-6"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {booking.properties?.title || "Unknown Property"}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {booking.properties?.location}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : booking.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Check-in</p>
                      <p className="font-medium text-foreground">
                        {new Date(booking.check_in).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Check-out</p>
                      <p className="font-medium text-foreground">
                        {new Date(booking.check_out).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Guests</p>
                      <p className="font-medium text-foreground flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {booking.guests_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-semibold text-primary">
                        {Number(booking.total_price).toLocaleString()} {booking.currency}
                      </p>
                    </div>
                  </div>
                </div>

                {booking.status === "pending" && (
                  <div className="flex md:flex-col justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelBooking(booking.id)}
                      className="gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default MyBookings;

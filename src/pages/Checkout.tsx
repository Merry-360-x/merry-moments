import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/money";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { useTripCart } from "@/hooks/useTripCart";

const isoToday = () => new Date().toISOString().slice(0, 10);

function calcNights(checkIn: string, checkOut: string) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const ms = end.getTime() - start.getTime();
  const n = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function Checkout() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { guestCart, clearCart } = useTripCart();

  const mode = (params.get("mode") ?? "cart") as "cart" | "booking";
  const propertyId = params.get("propertyId") ?? "";
  const checkIn = params.get("checkIn") ?? isoToday();
  const checkOut = params.get("checkOut") ?? isoToday();
  const guests = Number(params.get("guests") ?? "1");

  const nights = useMemo(() => calcNights(checkIn, checkOut), [checkIn, checkOut]);

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const [property, setProperty] = useState<null | {
    id: string;
    title: string | null;
    name: string | null;
    currency: string | null;
    price_per_night: number | null;
    host_id: string | null;
    max_guests: number | null;
  }>(null);

  // Prefill payer info for signed-in users
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) return;
      try {
        const { data: prof, error } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!alive) return;
        if (error) throw error;
        setName(String(prof?.full_name ?? "").trim());
        setPhone(String(prof?.phone ?? "").trim());
        setEmail(String((user as any)?.email ?? "").trim().toLowerCase());
      } catch (e) {
        // Don't block checkout
        logError("checkout.prefill", e);
        setEmail(String((user as any)?.email ?? "").trim().toLowerCase());
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  // Load property summary for booking mode
  useEffect(() => {
    let alive = true;
    (async () => {
      if (mode !== "booking" || !propertyId) return;
      try {
        const { data, error } = await supabase
          .from("properties")
          .select("id, title, name, currency, price_per_night, host_id, max_guests")
          .eq("id", propertyId)
          .maybeSingle();
        if (!alive) return;
        if (error) throw error;
        if (data) setProperty(data as any);
      } catch (e) {
        logError("checkout.loadProperty", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mode, propertyId]);

  const submitBooking = async () => {
    if (!propertyId) {
      toast({ variant: "destructive", title: "Missing property", description: "Please go back and try again." });
      return;
    }
    if (nights <= 0) {
      toast({ variant: "destructive", title: "Invalid dates", description: "Check-out must be after check-in." });
      return;
    }
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name required", description: "Please enter your full name." });
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast({ variant: "destructive", title: "Email required", description: "Please enter a valid email address." });
      return;
    }

    setLoading(true);
    try {
      const nightly = Number(property?.price_per_night ?? 0);
      const currency = String(property?.currency ?? "RWF");
      const total = nights * nightly;

      const basePayload: Record<string, unknown> = {
        property_id: propertyId,
        host_id: property?.host_id ?? null,
        check_in: checkIn,
        check_out: checkOut,
        guests_count: Math.max(1, Number(guests || 1)),
        total_price: total,
        currency,
        status: "pending",
      };

      if (user) {
        basePayload.guest_id = user.id;
        basePayload.is_guest_booking = false;
      } else {
        basePayload.is_guest_booking = true;
        basePayload.guest_name = name.trim();
        basePayload.guest_email = email.trim().toLowerCase();
        basePayload.guest_phone = phone.trim() || null;
      }

      const { error } = await supabase.from("bookings").insert(basePayload as never);
      if (error) throw error;

      toast({ title: "Booking requested", description: "Your request is pending confirmation." });
      navigate(user ? "/my-bookings" : "/");
    } catch (e) {
      logError("checkout.booking.insert", e);
      toast({ variant: "destructive", title: "Could not request booking", description: uiErrorMessage(e, "Please try again.") });
    } finally {
      setLoading(false);
    }
  };

  const submitCartCheckout = async () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name required", description: "Please enter your full name." });
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast({ variant: "destructive", title: "Email required", description: "Please enter a valid email address." });
      return;
    }

    setLoading(true);
    try {
      // Snapshot cart items for this request.
      const items = user
        ? (
            await supabase
              .from("trip_cart_items")
              .select("item_type, reference_id, quantity")
              .eq("user_id", user.id)
          ).data ?? []
        : guestCart.map((i) => ({ item_type: i.item_type, reference_id: i.reference_id, quantity: i.quantity }));

      if (!items.length) {
        toast({ variant: "destructive", title: "Cart is empty", description: "Add items to your cart first." });
        return;
      }

      const payload: Record<string, unknown> = {
        user_id: user ? user.id : null,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        message: message.trim() || null,
        items,
        status: "pending",
      };

      const { error } = await supabase.from("checkout_requests").insert(payload as never);
      if (error) throw error;

      await clearCart();
      toast({ title: "Checkout submitted", description: "We received your request and will contact you shortly." });
      navigate("/");
    } catch (e) {
      logError("checkout.cart.submit", e);
      toast({ variant: "destructive", title: "Could not submit checkout", description: uiErrorMessage(e, "Please try again.") });
    } finally {
      setLoading(false);
    }
  };

  const pageTitle = mode === "booking" ? "Checkout — Booking" : "Checkout";
  const bookingTitle = property ? String(property.title ?? property.name ?? "Accommodation") : "Accommodation";
  const currency = String(property?.currency ?? "RWF");
  const nightly = Number(property?.price_per_night ?? 0);
  const bookingTotal = nights > 0 ? nights * nightly : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 lg:px-8 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{pageTitle}</h1>
          <p className="text-muted-foreground mb-8">
            {mode === "booking"
              ? "Confirm your booking details and share your contact information for payment."
              : "Share your contact information so we can confirm and send payment instructions."}
          </p>

          {mode === "booking" ? (
            <Card className="p-5 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Booking</div>
                  <div className="text-lg font-semibold text-foreground">{bookingTitle}</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {checkIn} → {checkOut} • {nights} night{nights === 1 ? "" : "s"} • {Math.max(1, guests)} guest
                    {Math.max(1, guests) === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-xl font-bold text-foreground">{formatMoney(bookingTotal, currency)}</div>
                </div>
              </div>
            </Card>
          ) : null}

          <Card className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full name *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 788 123 456"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Any notes for the host/team (optional)"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
              <Button variant="outline" type="button" onClick={() => navigate(-1)} disabled={loading}>
                Back
              </Button>
              <Button
                type="button"
                onClick={mode === "booking" ? submitBooking : submitCartCheckout}
                disabled={loading}
              >
                {loading ? "Submitting..." : mode === "booking" ? "Request booking" : "Submit checkout"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}


import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BlockedDate = {
  id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  created_at: string;
  source?: "blocked" | "booking"; // To differentiate between manual blocks and bookings
};

type CustomPrice = {
  id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  custom_price_per_night: number;
  reason?: string;
  created_at: string;
};

type AvailabilityCalendarProps = {
  propertyId: string;
  currency?: string;
};

export default function AvailabilityCalendar({ propertyId, currency = "RWF" }: AvailabilityCalendarProps) {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [customPrices, setCustomPrices] = useState<CustomPrice[]>([]);
  const [selectedRange, setSelectedRange] = useState<{ from: Date; to?: Date } | undefined>();
  const [reason, setReason] = useState("");
  const [customPriceAmount, setCustomPriceAmount] = useState("");
  const [activeTab, setActiveTab] = useState("availability");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBlockedDates();
    fetchCustomPrices();
  }, [propertyId]);

  const fetchCustomPrices = async () => {
    const { data, error } = await supabase
      .from("property_custom_prices")
      .select("*")
      .eq("property_id", propertyId)
      .order("start_date", { ascending: true });
    
    if (error) {
      console.error("Error fetching custom prices:", error);
    } else {
      setCustomPrices(data || []);
    }
  };

  const addCustomPrice = async () => {
    if (!selectedRange?.from || !customPriceAmount) {
      toast({ title: "Please select dates and enter a price", variant: "destructive" });
      return;
    }

    const price = parseFloat(customPriceAmount);
    if (isNaN(price) || price <= 0) {
      toast({ title: "Please enter a valid price", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    setLoading(true);
    const { error } = await supabase.from("property_custom_prices").insert({
      property_id: propertyId,
      start_date: format(selectedRange.from, "yyyy-MM-dd"),
      end_date: format(selectedRange.to || selectedRange.from, "yyyy-MM-dd"),
      custom_price_per_night: price,
      reason: reason || null,
      created_by: user?.id,
    });

    if (error) {
      toast({ title: "Error setting custom price", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Custom price set successfully" });
      setSelectedRange(undefined);
      setReason("");
      setCustomPriceAmount("");
      fetchCustomPrices();
    }
    setLoading(false);
  };

  const removeCustomPrice = async (id: string) => {
    const { error } = await supabase.from("property_custom_prices").delete().eq("id", id);

    if (error) {
      toast({ title: "Error removing custom price", variant: "destructive" });
    } else {
      toast({ title: "Custom price removed" });
      fetchCustomPrices();
    }
  };

  const fetchBlockedDates = async () => {
    // Fetch both manual blocked dates and bookings
    const [blockedResult, bookingsResult] = await Promise.all([
      supabase
        .from("property_blocked_dates")
        .select("*")
        .eq("property_id", propertyId)
        .order("start_date", { ascending: true }),
      supabase
        .from("bookings")
        .select("id, property_id, check_in, check_out, status, payment_status, created_at")
        .eq("property_id", propertyId)
        .in("status", ["pending", "confirmed", "completed"])
        .in("payment_status", ["pending", "paid"])
        .order("check_in", { ascending: true })
    ]);

    if (blockedResult.error) {
      console.error("Error fetching blocked dates:", blockedResult.error);
    }
    if (bookingsResult.error) {
      console.error("Error fetching bookings:", bookingsResult.error);
    }

    const manualBlocks: BlockedDate[] = (blockedResult.data || []).map(d => ({
      ...d,
      source: "blocked" as const
    }));
    
    // Convert bookings to blocked date format, excluding those already in manual blocks
    const bookingBlocks: BlockedDate[] = (bookingsResult.data || [])
      .filter(b => !manualBlocks.some(m => 
        m.start_date === b.check_in && m.end_date === b.check_out && m.reason === "Booked"
      ))
      .map(b => ({
        id: b.id,
        property_id: b.property_id,
        start_date: b.check_in,
        end_date: b.check_out,
        reason: `Booked (${b.status})`,
        created_at: b.created_at,
        source: "booking" as const
      }));

    // Combine and sort by start date
    const allBlocked = [...manualBlocks, ...bookingBlocks].sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
    
    setBlockedDates(allBlocked);
  };

  const addBlockedDate = async () => {
    if (!selectedRange?.from) {
      toast({ title: "Please select a date range", variant: "destructive" });
      return;
    }

    // Get the current user for created_by field
    const { data: { user } } = await supabase.auth.getUser();

    setLoading(true);
    const { error } = await supabase.from("property_blocked_dates").insert({
      property_id: propertyId,
      start_date: format(selectedRange.from, "yyyy-MM-dd"),
      end_date: format(selectedRange.to || selectedRange.from, "yyyy-MM-dd"),
      reason: reason || "Blocked by host",
      created_by: user?.id,
    });

    if (error) {
      toast({ title: "Error blocking dates", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dates blocked successfully" });
      setSelectedRange(undefined);
      setReason("");
      fetchBlockedDates();
    }
    setLoading(false);
  };

  const removeBlockedDate = async (id: string) => {
    const { error } = await supabase.from("property_blocked_dates").delete().eq("id", id);

    if (error) {
      toast({ title: "Error removing blocked date", variant: "destructive" });
    } else {
      toast({ title: "Date unblocked successfully" });
      fetchBlockedDates();
    }
  };

  const disabledDates = blockedDates.map((bd) => ({
    from: new Date(bd.start_date),
    to: new Date(bd.end_date),
  }));

  // Format custom price dates for calendar highlighting
  const customPriceDates = customPrices.map((cp) => ({
    from: new Date(cp.start_date),
    to: new Date(cp.end_date),
  }));

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="availability">Availability</TabsTrigger>
        <TabsTrigger value="pricing">Custom Pricing</TabsTrigger>
      </TabsList>
      
      <TabsContent value="availability" className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Block Dates</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Select dates to make unavailable for booking
          </p>
          
          <div className="flex justify-center mb-3">
            <Calendar
              mode="range"
              selected={selectedRange}
              onSelect={setSelectedRange}
              numberOfMonths={2}
              disabled={[
                { before: new Date() },
                ...disabledDates,
              ]}
              className="rounded-md border"
            />
          </div>

          {selectedRange?.from && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="w-4 h-4" />
                <span>
                  {format(selectedRange.from, "MMM d, yyyy")}
                  {selectedRange.to && ` - ${format(selectedRange.to, "MMM d, yyyy")}`}
                </span>
              </div>
              <Textarea
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button onClick={addBlockedDate} disabled={loading} size="sm">
                  Block Dates
                </Button>
                <Button
                  onClick={() => {
                    setSelectedRange(undefined);
                    setReason("");
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {blockedDates.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Unavailable Dates</Label>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {blockedDates.map((bd) => (
                <div
                  key={bd.id}
                  className={`flex items-center justify-between p-2 rounded-md text-sm ${
                    bd.source === "booking" ? "bg-primary/10 border border-primary/20" : "bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {bd.source === "booking" && (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                        Booked
                      </Badge>
                    )}
                    <div>
                      <div className="font-medium">
                        {format(new Date(bd.start_date), "MMM d, yyyy")}
                        {bd.start_date !== bd.end_date &&
                          ` - ${format(new Date(bd.end_date), "MMM d, yyyy")}`}
                      </div>
                      {bd.reason && bd.source !== "booking" && (
                        <div className="text-xs text-muted-foreground">{bd.reason}</div>
                      )}
                    </div>
                  </div>
                  {bd.source !== "booking" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => removeBlockedDate(bd.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="pricing" className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Set Custom Price</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Override the default nightly rate for specific dates
          </p>
          
          <div className="flex justify-center mb-3">
            <Calendar
              mode="range"
              selected={selectedRange}
              onSelect={setSelectedRange}
              numberOfMonths={2}
              disabled={[{ before: new Date() }]}
              className="rounded-md border"
            />
          </div>

          {selectedRange?.from && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="w-4 h-4" />
                <span>
                  {format(selectedRange.from, "MMM d, yyyy")}
                  {selectedRange.to && ` - ${format(selectedRange.to, "MMM d, yyyy")}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder={`Custom price per night (${currency})`}
                  value={customPriceAmount}
                  onChange={(e) => setCustomPriceAmount(e.target.value)}
                  min={1}
                />
              </div>
              <Textarea
                placeholder="Reason (e.g., Holiday season, Special event)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button onClick={addCustomPrice} disabled={loading || !customPriceAmount} size="sm">
                  Set Custom Price
                </Button>
                <Button
                  onClick={() => {
                    setSelectedRange(undefined);
                    setReason("");
                    setCustomPriceAmount("");
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {customPrices.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Custom Pricing Rules</Label>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {customPrices.map((cp) => (
                <div
                  key={cp.id}
                  className="flex items-center justify-between p-2 rounded-md text-sm bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                      {currency} {cp.custom_price_per_night.toLocaleString()}
                    </Badge>
                    <div>
                      <div className="font-medium">
                        {format(new Date(cp.start_date), "MMM d, yyyy")}
                        {cp.start_date !== cp.end_date &&
                          ` - ${format(new Date(cp.end_date), "MMM d, yyyy")}`}
                      </div>
                      {cp.reason && (
                        <div className="text-xs text-muted-foreground">{cp.reason}</div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => removeCustomPrice(cp.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

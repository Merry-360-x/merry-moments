import { useState } from "react";
import { Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatMoneyWithConversion } from "@/lib/money";

interface BookingDateChangeDialogProps {
  booking: {
    id: string;
    check_in: string;
    check_out: string;
    total_price: number;
    currency: string;
    property_id?: string;
    tour_id?: string | null;
    transport_id?: string | null;
    booking_type?: 'property' | 'tour' | 'transport' | null;
    properties?: {
      title: string;
      price_per_night?: number;
    } | null;
    tour_packages?: {
      title: string;
      price_per_person?: number;
    } | null;
  };
  hostId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BookingDateChangeDialog({
  booking,
  hostId,
  open,
  onOpenChange,
  onSuccess
}: BookingDateChangeDialogProps) {
  const { toast } = useToast();
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [priceInfo, setPriceInfo] = useState<{
    newPrice: number;
    priceDifference: number;
  } | null>(null);

  const calculateNewPrice = () => {
    if (!newStartDate || !newEndDate) return null;

    const originalStart = new Date(booking.check_in);
    const originalEnd = new Date(booking.check_out);
    const requestedStart = new Date(newStartDate);
    const requestedEnd = new Date(newEndDate);

    // Calculate number of days
    const originalDays = Math.ceil((originalEnd.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24));
    const newDays = Math.ceil((requestedEnd.getTime() - requestedStart.getTime()) / (1000 * 60 * 60 * 24));

    let newPrice = booking.total_price;
    
    // For properties, calculate based on days
    if (booking.booking_type === 'property' && booking.properties?.price_per_night) {
      newPrice = booking.properties.price_per_night * newDays;
    } else {
      // For tours and transport, or if price per night not available, prorate based on days
      const pricePerDay = booking.total_price / (originalDays || 1);
      newPrice = pricePerDay * newDays;
    }

    const priceDifference = newPrice - booking.total_price;

    setPriceInfo({ newPrice, priceDifference });
    return { newPrice, priceDifference };
  };

  const handleDateChange = () => {
    if (newStartDate && newEndDate) {
      calculateNewPrice();
    }
  };

  const handleSubmit = async () => {
    if (!newStartDate || !newEndDate) {
      toast({
        title: "Missing dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    const requestedStart = new Date(newStartDate);
    const requestedEnd = new Date(newEndDate);
    const originalStart = new Date(booking.check_in);

    if (requestedStart >= requestedEnd) {
      toast({
        title: "Invalid dates",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    // Don't allow changes less than 24 hours before original check-in
    const hoursDiff = (originalStart.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    if (hoursDiff < 24) {
      toast({
        title: "Too late to change",
        description: "Date changes must be requested at least 24 hours before check-in",
        variant: "destructive",
      });
      return;
    }

    const pricing = calculateNewPrice();
    if (!pricing) {
      toast({
        title: "Price calculation failed",
        description: "Unable to calculate new price. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("booking_change_requests").insert({
        booking_id: booking.id,
        user_id: userData.user.id,
        host_id: hostId,
        original_start_date: booking.check_in,
        original_end_date: booking.check_out,
        requested_start_date: newStartDate,
        requested_end_date: newEndDate,
        original_price: booking.total_price,
        new_price: pricing.newPrice,
        price_difference: pricing.priceDifference,
        currency: booking.currency,
        reason: reason.trim() || null,
        status: 'pending'
      });

      if (error) throw error;

      // TODO: Send email notification to host
      // This will be implemented when email service is set up

      toast({
        title: "Request submitted",
        description: "Your date change request has been sent to the host for approval.",
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setNewStartDate("");
      setNewEndDate("");
      setReason("");
      setPriceInfo(null);
    } catch (error: any) {
      console.error("Error submitting date change request:", error);
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getBookingTitle = () => {
    if (booking.booking_type === 'tour' && booking.tour_packages?.title) {
      return booking.tour_packages.title;
    }
    return booking.properties?.title || "Unknown booking";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Request Date Change
          </DialogTitle>
          <DialogDescription>
            Request to change dates for: <strong>{getBookingTitle()}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Dates */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium mb-2">Current Dates</p>
            <div className="text-sm text-muted-foreground">
              <p>Check-in: {new Date(booking.check_in).toLocaleDateString()}</p>
              <p>Check-out: {new Date(booking.check_out).toLocaleDateString()}</p>
              <p className="font-semibold text-foreground mt-1">
                Price: {formatMoneyWithConversion(booking.total_price, booking.currency, booking.currency, {})}
              </p>
            </div>
          </div>

          {/* New Dates */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="new-start">New Check-in Date</Label>
              <input
                type="date"
                id="new-start"
                value={newStartDate}
                onChange={(e) => {
                  setNewStartDate(e.target.value);
                  handleDateChange();
                }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <Label htmlFor="new-end">New Check-out Date</Label>
              <input
                type="date"
                id="new-end"
                value={newEndDate}
                onChange={(e) => {
                  setNewEndDate(e.target.value);
                  handleDateChange();
                }}
                min={newStartDate || new Date().toISOString().split('T')[0]}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>

            {priceInfo && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold">New Price: {formatMoneyWithConversion(priceInfo.newPrice, booking.currency, booking.currency, {})}</p>
                  {priceInfo.priceDifference !== 0 && (
                    <p className={`text-sm ${priceInfo.priceDifference > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {priceInfo.priceDifference > 0 ? 'Additional' : 'Refund'}: {formatMoneyWithConversion(Math.abs(priceInfo.priceDifference), booking.currency, booking.currency, {})}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="reason">Reason for change (optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you need to change the dates..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <Alert variant="default" className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
              The host will receive an email notification and can approve or decline your request. 
              {priceInfo && priceInfo.priceDifference > 0 && " If approved, you'll need to pay the additional amount."}
              {priceInfo && priceInfo.priceDifference < 0 && " If approved, the difference will be refunded to you."}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !newStartDate || !newEndDate}>
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

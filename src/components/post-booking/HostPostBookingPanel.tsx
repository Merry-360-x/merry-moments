import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, RefreshCcw, ShieldAlert } from "lucide-react";

type Charge = {
  id: string;
  booking_id: string;
  charge_type: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  created_at: string;
};

type HostBooking = {
  id: string;
  guest_name: string | null;
  total_price: number;
  currency: string;
};

type Dispute = {
  id: string;
  booking_id: string;
  charge_id: string | null;
  booking_modification_id: string | null;
  reason: string;
  details: string | null;
  admin_notes?: string | null;
  resolution?: string | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
};

type HostPostBookingOverview = {
  charges: Charge[];
  disputes: Dispute[];
  host_bookings: HostBooking[];
};

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function postBookingRequest(action: string, body: Record<string, unknown> = {}) {
  const token = await getAccessToken();
  const response = await fetch("/api/post-booking", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...body }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || "Request failed");
  }
  return payload;
}

async function fetchHostOverview(): Promise<HostPostBookingOverview> {
  const token = await getAccessToken();
  const response = await fetch("/api/post-booking?action=host-overview", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || "Failed to fetch post-booking data");
  }

  return {
    charges: payload.charges || [],
    disputes: payload.disputes || [],
    host_bookings: payload.host_bookings || [],
  };
}

function statusTone(status: string) {
  const value = String(status || "").toLowerCase();
  if (value === "paid" || value === "approved" || value === "settled") return "bg-emerald-100 text-emerald-700";
  if (value === "failed" || value === "rejected" || value === "cancelled") return "bg-rose-100 text-rose-700";
  if (value === "disputed" || value === "in_review") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function humanizeLabel(value: string) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function HostPostBookingPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("charges");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingCharge, setCreatingCharge] = useState(false);
  const [respondingDisputeId, setRespondingDisputeId] = useState<string | null>(null);
  const [overview, setOverview] = useState<HostPostBookingOverview>({
    charges: [],
    disputes: [],
    host_bookings: [],
  });
  const [disputeDrafts, setDisputeDrafts] = useState<Record<string, string>>({});
  const [hostChargeForm, setHostChargeForm] = useState({
    booking_id: "",
    charge_type: "extra_service",
    amount: "",
    description: "",
    currency: "RWF",
  });

  const pendingChargeTotals = useMemo(() => {
    const totals = new Map<string, number>();

    overview.charges
      .filter((charge) => charge.status === "pending")
      .forEach((charge) => {
        const currency = String(charge.currency || "USD").toUpperCase();
        totals.set(currency, (totals.get(currency) || 0) + safeNumber(charge.amount));
      });

    return Array.from(totals.entries());
  }, [overview.charges]);

  const pendingChargesHeadline = useMemo(() => {
    if (pendingChargeTotals.length === 0) return formatMoney(0, "USD");
    if (pendingChargeTotals.length === 1) {
      const [currency, amount] = pendingChargeTotals[0];
      return formatMoney(amount, currency);
    }
    return `${pendingChargeTotals.length} currencies`;
  }, [pendingChargeTotals]);

  const pendingChargesBreakdown = useMemo(() => {
    if (pendingChargeTotals.length <= 1) return "";
    return pendingChargeTotals
      .slice(0, 3)
      .map(([currency, amount]) => formatMoney(amount, currency))
      .join(" · ");
  }, [pendingChargeTotals]);

  const bookingById = useMemo(
    () => new Map(overview.host_bookings.map((booking) => [booking.id, booking])),
    [overview.host_bookings]
  );

  const activeDisputes = useMemo(
    () => overview.disputes.filter((dispute) => ["open", "in_review"].includes(String(dispute.status || "").toLowerCase())),
    [overview.disputes]
  );

  const loadOverview = useCallback(async (withSpinner = true) => {
    if (withSpinner) setLoading(true);
    setRefreshing(true);

    try {
      const data = await fetchHostOverview();
      setOverview(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load post-booking data",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadOverview(true);
  }, [loadOverview]);

  const handleHostCreateCharge = useCallback(async () => {
    if (!hostChargeForm.booking_id || !hostChargeForm.amount.trim() || !hostChargeForm.description.trim()) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Select booking, amount, and description.",
      });
      return;
    }

    const amount = Number(hostChargeForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Enter a valid charge amount greater than zero.",
      });
      return;
    }

    setCreatingCharge(true);
    try {
      await postBookingRequest("create-charge", {
        booking_id: hostChargeForm.booking_id,
        charge_type: hostChargeForm.charge_type,
        amount,
        description: hostChargeForm.description.trim(),
        currency: hostChargeForm.currency,
      });

      toast({
        title: "Charge created",
        description: "Guest was notified and can pay from My Bookings.",
      });

      setHostChargeForm((prev) => ({
        ...prev,
        amount: "",
        description: "",
      }));
      await loadOverview(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not create charge",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setCreatingCharge(false);
    }
  }, [hostChargeForm, loadOverview, toast]);

  const handleHostRespondToDispute = useCallback(async (disputeId: string) => {
    const message = (disputeDrafts[disputeId] || "").trim();
    if (!message) {
      toast({
        variant: "destructive",
        title: "Add an update first",
        description: "Enter the reply or fix you want to send to the guest.",
      });
      return;
    }

    setRespondingDisputeId(disputeId);
    try {
      await postBookingRequest("host-respond-dispute", {
        dispute_id: disputeId,
        message,
      });

      toast({
        title: "Dispute update sent",
        description: "The guest was notified by email and in-app notification.",
      });

      setDisputeDrafts((prev) => ({ ...prev, [disputeId]: "" }));
      await loadOverview(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not send update",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setRespondingDisputeId(null);
    }
  }, [disputeDrafts, loadOverview, toast]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 rounded-xl bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5" />
            Host Post-Booking
          </div>
          <h2 className="text-xl font-semibold text-foreground">Charges and Collection</h2>
          <p className="text-sm text-muted-foreground">
            Create additional charges for your guests and track whether they have paid them from their booking flow.
          </p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => void loadOverview(false)} disabled={refreshing}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-4 h-4" />
              Pending Charges
            </CardDescription>
            <CardTitle className="text-2xl">{pendingChargesHeadline}</CardTitle>
            {pendingChargesBreakdown ? <p className="text-xs text-muted-foreground pt-1">{pendingChargesBreakdown}</p> : null}
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="w-4 h-4" />
              Eligible Bookings
            </CardDescription>
            <CardTitle className="text-2xl">{overview.host_bookings.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="w-4 h-4" />
              Active Disputes
            </CardDescription>
            <CardTitle className="text-2xl">{activeDisputes.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start gap-1.5 overflow-x-auto rounded-2xl p-1.5 pr-16 md:pr-2">
          <TabsTrigger className="shrink-0" value="charges">Charges</TabsTrigger>
          <TabsTrigger className="shrink-0" value="disputes">Disputes</TabsTrigger>
          <TabsTrigger className="shrink-0" value="create-charge">Create Charge</TabsTrigger>
        </TabsList>

        <TabsContent value="charges" className="mt-6 space-y-4">
          {overview.charges.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No extra charges yet.
              </CardContent>
            </Card>
          ) : (
            overview.charges.map((charge) => (
              <Card key={charge.id} className="border-border/70">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={statusTone(charge.status)}>{charge.status}</Badge>
                        <Badge variant="outline">{humanizeLabel(charge.charge_type)}</Badge>
                        <span className="text-xs text-muted-foreground">Booking {charge.booking_id.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <p className="font-medium">{charge.description}</p>
                      <p className="text-2xl font-semibold text-rose-600">{formatMoney(charge.amount, charge.currency)}</p>
                    </div>

                    <div className="text-xs text-muted-foreground">{new Date(charge.created_at).toLocaleString()}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="disputes" className="mt-6 space-y-4">
          {overview.disputes.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No disputes have been raised on your bookings.
              </CardContent>
            </Card>
          ) : (
            overview.disputes.map((dispute) => {
              const booking = bookingById.get(dispute.booking_id);
              const canReply = ["open", "in_review"].includes(String(dispute.status || "").toLowerCase());

              return (
                <Card key={dispute.id} className="border-border/70">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={statusTone(dispute.status)}>{humanizeLabel(dispute.status)}</Badge>
                          <Badge variant="outline">{humanizeLabel(dispute.reason)}</Badge>
                          <span className="text-xs text-muted-foreground">Booking {dispute.booking_id.slice(0, 8).toUpperCase()}</span>
                          {booking?.guest_name ? <span className="text-xs text-muted-foreground">Guest: {booking.guest_name}</span> : null}
                        </div>

                        {dispute.details ? (
                          <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-foreground whitespace-pre-wrap break-words">
                            {dispute.details}
                          </div>
                        ) : null}

                        {dispute.resolution ? <p className="text-sm text-emerald-700">Resolution: {dispute.resolution}</p> : null}
                        {dispute.admin_notes ? <p className="text-sm text-muted-foreground">Support note: {dispute.admin_notes}</p> : null}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {new Date(dispute.updated_at || dispute.created_at).toLocaleString()}
                      </div>
                    </div>

                    {canReply ? (
                      <div className="space-y-2">
                        <Label htmlFor={`dispute-reply-${dispute.id}`}>Reply or proposed fix</Label>
                        <Textarea
                          id={`dispute-reply-${dispute.id}`}
                          value={disputeDrafts[dispute.id] || ""}
                          onChange={(event) => setDisputeDrafts((prev) => ({ ...prev, [dispute.id]: event.target.value }))}
                          placeholder="Explain the fix, reimbursement, or clarification you want to send to the guest"
                          rows={4}
                        />
                        <Button onClick={() => void handleHostRespondToDispute(dispute.id)} disabled={respondingDisputeId === dispute.id}>
                          {respondingDisputeId === dispute.id ? "Sending..." : "Send dispute update"}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">This dispute is no longer open for host replies.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="create-charge" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Create additional charge</CardTitle>
              <CardDescription>
                Select one of your bookings and send an extra charge request to the guest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Booking</Label>
                  <select
                    value={hostChargeForm.booking_id}
                    onChange={(event) => {
                      const bookingId = event.target.value;
                      const booking = overview.host_bookings.find((item) => item.id === bookingId);
                      setHostChargeForm((prev) => ({
                        ...prev,
                        booking_id: bookingId,
                        currency: booking?.currency || prev.currency,
                      }));
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select booking</option>
                    {overview.host_bookings.map((booking) => (
                      <option key={booking.id} value={booking.id}>
                        {String(booking.id).slice(0, 8).toUpperCase()} - {(booking.guest_name || "Guest").trim() || "Guest"} - {formatMoney(booking.total_price, booking.currency)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Charge type</Label>
                  <select
                    value={hostChargeForm.charge_type}
                    onChange={(event) => setHostChargeForm((prev) => ({ ...prev, charge_type: event.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="damage">Damage</option>
                    <option value="late_fee">Late fee</option>
                    <option value="extra_service">Extra service</option>
                    <option value="upgrade">Upgrade</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    value={hostChargeForm.amount}
                    onChange={(event) => setHostChargeForm((prev) => ({ ...prev, amount: event.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <select
                    value={hostChargeForm.currency}
                    onChange={(event) => setHostChargeForm((prev) => ({ ...prev, currency: event.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="RWF">RWF</option>
                    <option value="EUR">EUR</option>
                    <option value="KES">KES</option>
                    <option value="UGX">UGX</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={hostChargeForm.description}
                  onChange={(event) => setHostChargeForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Explain why this additional charge is needed"
                  rows={3}
                />
              </div>

              <Button onClick={() => void handleHostCreateCharge()} disabled={creatingCharge}>
                {creatingCharge ? "Creating..." : "Create charge"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
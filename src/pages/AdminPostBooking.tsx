import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import {
  ShieldAlert,
  RefreshCcw,
  PlusCircle,
  ArrowUpDown,
  Handshake,
} from "lucide-react";

type Charge = {
  id: string;
  booking_id: string;
  user_id: string;
  charge_type: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  created_at: string;
  proof_urls?: string[];
};

type BookingModification = {
  id: string;
  booking_id: string;
  user_id: string;
  modification_type: string;
  old_price: number;
  new_price: number;
  difference: number;
  currency: string;
  status: string;
  payment_status: string;
  proposal_message: string | null;
  created_at: string;
};

type Dispute = {
  id: string;
  booking_id: string;
  charge_id: string | null;
  booking_modification_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  admin_notes: string | null;
  resolution: string | null;
  created_at: string;
};

type AdminOverview = {
  charges: Charge[];
  booking_modifications: BookingModification[];
  disputes: Dispute[];
};

type ResolveDialogState = {
  open: boolean;
  disputeId: string | null;
  status: string;
  adminNotes: string;
  resolution: string;
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

async function fetchAdminOverview() {
  const token = await getAccessToken();
  const response = await fetch("/api/post-booking?action=admin-overview", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || "Failed to fetch admin post-booking data");
  }

  return {
    charges: payload.charges || [],
    booking_modifications: payload.booking_modifications || [],
    disputes: payload.disputes || [],
  } as AdminOverview;
}

function statusTone(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "paid" || s === "approved" || s === "settled") return "bg-emerald-100 text-emerald-700";
  if (s === "failed" || s === "rejected" || s === "cancelled") return "bg-rose-100 text-rose-700";
  if (s === "disputed" || s === "in_review") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default function AdminPostBooking() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("charges");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<AdminOverview>({
    charges: [],
    booking_modifications: [],
    disputes: [],
  });

  const [creatingCharge, setCreatingCharge] = useState(false);
  const [chargeForm, setChargeForm] = useState({
    booking_id: "",
    charge_type: "damage",
    amount: "",
    description: "",
    proof_urls: "",
    currency: "USD",
  });

  const [creatingModification, setCreatingModification] = useState(false);
  const [modificationForm, setModificationForm] = useState({
    booking_id: "",
    modification_type: "date_change",
    new_check_in: "",
    new_check_out: "",
    new_property_id: "",
    reason: "",
    proposal_message: "",
  });

  const [processingChargeId, setProcessingChargeId] = useState<string | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [adjustChargeDrafts, setAdjustChargeDrafts] = useState<Record<string, { amount: string; description: string }>>({});

  const [resolveDialog, setResolveDialog] = useState<ResolveDialogState>({
    open: false,
    disputeId: null,
    status: "in_review",
    adminNotes: "",
    resolution: "",
  });
  const [resolvingDispute, setResolvingDispute] = useState(false);

  const canManage = useMemo(
    () => roles.some((role) => ["admin", "financial_staff", "operations_staff", "customer_support"].includes(role)),
    [roles]
  );

  const loadOverview = useCallback(async (withSpinner = true) => {
    if (!user) return;
    if (withSpinner) setLoading(true);
    setRefreshing(true);

    try {
      const data = await fetchAdminOverview();
      setOverview(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load admin queue",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (!user) {
      navigate("/auth?mode=login&redirect=/admin/post-booking");
      return;
    }

    if (!canManage) {
      navigate("/access-denied");
      return;
    }

    void loadOverview(true);
  }, [canManage, loadOverview, navigate, user]);

  async function createCharge() {
    if (!chargeForm.booking_id.trim() || !chargeForm.amount.trim() || !chargeForm.description.trim()) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Booking ID, amount, and description are required.",
      });
      return;
    }

    setCreatingCharge(true);
    try {
      const payload = {
        booking_id: chargeForm.booking_id.trim(),
        charge_type: chargeForm.charge_type,
        amount: Number(chargeForm.amount),
        description: chargeForm.description.trim(),
        currency: chargeForm.currency,
        proof_urls: chargeForm.proof_urls
          .split(",")
          .map((url) => url.trim())
          .filter(Boolean),
      };

      await postBookingRequest("create-charge", payload);
      toast({ title: "Charge created", description: "Customer was notified." });
      setChargeForm((prev) => ({ ...prev, amount: "", description: "", proof_urls: "" }));
      await loadOverview(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to create charge",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setCreatingCharge(false);
    }
  }

  async function createModification(forceAlternative = false) {
    if (!modificationForm.booking_id.trim()) {
      toast({
        variant: "destructive",
        title: "Missing booking ID",
        description: "Booking ID is required.",
      });
      return;
    }

    setCreatingModification(true);
    try {
      const payload = {
        booking_id: modificationForm.booking_id.trim(),
        modification_type: forceAlternative ? "alternative_offer" : modificationForm.modification_type,
        new_check_in: modificationForm.new_check_in || null,
        new_check_out: modificationForm.new_check_out || null,
        new_property_id: modificationForm.new_property_id || null,
        reason: modificationForm.reason || null,
        proposal_message: modificationForm.proposal_message || null,
      };

      await postBookingRequest(forceAlternative ? "propose-alternative" : "create-modification", payload);

      toast({
        title: forceAlternative ? "Alternative proposed" : "Modification created",
        description: "Guest was notified and can accept/reject the change.",
      });

      await loadOverview(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not create modification",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setCreatingModification(false);
    }
  }

  async function updateChargeStatus(chargeId: string, status: string) {
    setProcessingChargeId(chargeId);
    try {
      await postBookingRequest("update-charge-status", {
        charge_id: chargeId,
        status,
      });
      toast({ title: "Charge updated" });
      await loadOverview(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not update charge",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setProcessingChargeId(null);
    }
  }

  async function adjustCharge(charge: Charge) {
    const draft = adjustChargeDrafts[charge.id];
    if (!draft) return;

    setProcessingChargeId(charge.id);
    try {
      await postBookingRequest("adjust-charge", {
        charge_id: charge.id,
        amount: draft.amount ? Number(draft.amount) : undefined,
        description: draft.description || undefined,
      });

      toast({ title: "Charge adjusted" });
      await loadOverview(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not adjust charge",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setProcessingChargeId(null);
    }
  }

  function openResolveDialog(dispute: Dispute) {
    setResolveDialog({
      open: true,
      disputeId: dispute.id,
      status: dispute.status === "open" ? "in_review" : dispute.status,
      adminNotes: dispute.admin_notes || "",
      resolution: dispute.resolution || "",
    });
  }

  async function submitDisputeResolution() {
    if (!resolveDialog.disputeId) return;

    setResolvingDispute(true);
    try {
      await postBookingRequest("resolve-dispute", {
        dispute_id: resolveDialog.disputeId,
        status: resolveDialog.status,
        admin_notes: resolveDialog.adminNotes,
        resolution: resolveDialog.resolution,
      });

      toast({ title: "Dispute updated" });
      setResolveDialog({ open: false, disputeId: null, status: "in_review", adminNotes: "", resolution: "" });
      await loadOverview(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not update dispute",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setResolvingDispute(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 lg:px-8 py-24">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-72 bg-muted rounded" />
            <div className="h-20 w-full bg-muted rounded-xl" />
            <div className="h-64 w-full bg-muted rounded-xl" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-8 pb-24 space-y-5">
        <section className="rounded-xl border border-border bg-card p-5 lg:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <ShieldAlert className="w-3.5 h-3.5" />
                Admin Post-Booking
              </p>
              <h1 className="text-xl lg:text-2xl font-semibold text-foreground">Post-Booking Console</h1>
              <p className="text-muted-foreground text-sm">
                Manage charges, booking changes, alternative offers, and disputes.
              </p>
            </div>
            <Button onClick={() => void loadOverview(false)} disabled={refreshing}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-1 pr-16 md:pr-2">
            <TabsTrigger className="shrink-0 rounded-md data-[state=active]:shadow-none" value="charges">Charges</TabsTrigger>
            <TabsTrigger className="shrink-0 rounded-md data-[state=active]:shadow-none" value="create-charge">Add Charge</TabsTrigger>
            <TabsTrigger className="shrink-0 rounded-md data-[state=active]:shadow-none" value="modifications">Modify Booking</TabsTrigger>
            <TabsTrigger className="shrink-0 rounded-md data-[state=active]:shadow-none" value="alternatives">Alternative Offer</TabsTrigger>
            <TabsTrigger className="shrink-0 rounded-md data-[state=active]:shadow-none" value="disputes">Disputes</TabsTrigger>
          </TabsList>

          <TabsContent value="charges" className="mt-6 space-y-4">
            {overview.charges.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">No post-booking charges yet.</CardContent>
              </Card>
            ) : (
              overview.charges.map((charge) => {
                const nextStatus = statusDrafts[charge.id] || charge.status;
                const draft = adjustChargeDrafts[charge.id] || {
                  amount: String(charge.amount || ""),
                  description: charge.description || "",
                };

                return (
                  <Card key={charge.id} className="border-border/70 shadow-none">
                    <CardContent className="pt-5 space-y-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${statusTone(charge.status)} border border-transparent`}>{charge.status}</Badge>
                            <Badge variant="outline">{humanizeLabel(charge.charge_type)}</Badge>
                            <span className="text-xs text-muted-foreground">Booking {charge.booking_id.slice(0, 8).toUpperCase()}</span>
                          </div>
                          <p className="font-medium text-sm break-words">{charge.description}</p>
                        </div>
                        <div className="md:text-right">
                          <p className="text-lg font-semibold text-rose-600">{formatMoney(charge.amount, charge.currency)}</p>
                          <p className="text-xs text-muted-foreground">{new Date(charge.created_at).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="rounded-md border border-border/80 p-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
                          <select
                            value={nextStatus}
                            onChange={(event) => setStatusDrafts((prev) => ({ ...prev, [charge.id]: event.target.value }))}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            disabled={processingChargeId === charge.id}
                          >
                            <option value="pending">pending</option>
                            <option value="paid">paid</option>
                            <option value="failed">failed</option>
                            <option value="disputed">disputed</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                        </div>
                        <Button
                          onClick={() => void updateChargeStatus(charge.id, nextStatus)}
                          disabled={processingChargeId === charge.id || nextStatus === charge.status}
                        >
                          {processingChargeId === charge.id ? "Saving..." : "Update status"}
                        </Button>
                      </div>

                      <div className="rounded-md border border-border/80 bg-muted/20 p-3 space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Adjust charge</p>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                          <Input
                            value={draft.amount}
                            onChange={(event) => setAdjustChargeDrafts((prev) => ({
                              ...prev,
                              [charge.id]: { ...draft, amount: event.target.value },
                            }))}
                            placeholder="Amount"
                          />
                          <Input
                            value={draft.description}
                            onChange={(event) => setAdjustChargeDrafts((prev) => ({
                              ...prev,
                              [charge.id]: { ...draft, description: event.target.value },
                            }))}
                            placeholder="Description"
                          />
                          <Button
                            onClick={() => void adjustCharge(charge)}
                            disabled={processingChargeId === charge.id}
                          >
                            {processingChargeId === charge.id ? "Saving..." : "Apply adjustment"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="create-charge" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5" />
                  Add Additional Charge
                </CardTitle>
                <CardDescription>
                  Add damage, late fee, extra service, or upgrade charges to an existing booking.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Booking ID</Label>
                    <Input
                      value={chargeForm.booking_id}
                      onChange={(event) => setChargeForm((prev) => ({ ...prev, booking_id: event.target.value }))}
                      placeholder="Booking UUID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Charge Type</Label>
                    <select
                      value={chargeForm.charge_type}
                      onChange={(event) => setChargeForm((prev) => ({ ...prev, charge_type: event.target.value }))}
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
                      value={chargeForm.amount}
                      onChange={(event) => setChargeForm((prev) => ({ ...prev, amount: event.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <select
                      value={chargeForm.currency}
                      onChange={(event) => setChargeForm((prev) => ({ ...prev, currency: event.target.value }))}
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
                    value={chargeForm.description}
                    onChange={(event) => setChargeForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Explain what this charge covers"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Proof URLs (comma separated)</Label>
                  <Input
                    value={chargeForm.proof_urls}
                    onChange={(event) => setChargeForm((prev) => ({ ...prev, proof_urls: event.target.value }))}
                    placeholder="https://.../image1.jpg, https://.../invoice.pdf"
                  />
                </div>

                <Button onClick={() => void createCharge()} disabled={creatingCharge}>
                  {creatingCharge ? "Creating..." : "Create charge"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modifications" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpDown className="w-5 h-5" />
                  Create Booking Modification
                </CardTitle>
                <CardDescription>
                  Recalculate old/new prices server-side and send a change request to the user.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Booking ID</Label>
                    <Input
                      value={modificationForm.booking_id}
                      onChange={(event) => setModificationForm((prev) => ({ ...prev, booking_id: event.target.value }))}
                      placeholder="Booking UUID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modification Type</Label>
                    <select
                      value={modificationForm.modification_type}
                      onChange={(event) => setModificationForm((prev) => ({ ...prev, modification_type: event.target.value }))}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="date_change">Date change</option>
                      <option value="property_change">Property change</option>
                      <option value="alternative_offer">Alternative offer</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>New check-in (optional)</Label>
                    <Input
                      type="date"
                      value={modificationForm.new_check_in}
                      onChange={(event) => setModificationForm((prev) => ({ ...prev, new_check_in: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>New check-out (optional)</Label>
                    <Input
                      type="date"
                      value={modificationForm.new_check_out}
                      onChange={(event) => setModificationForm((prev) => ({ ...prev, new_check_out: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>New property ID (optional)</Label>
                  <Input
                    value={modificationForm.new_property_id}
                    onChange={(event) => setModificationForm((prev) => ({ ...prev, new_property_id: event.target.value }))}
                    placeholder="Property UUID for upgrades/alternatives"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input
                    value={modificationForm.reason}
                    onChange={(event) => setModificationForm((prev) => ({ ...prev, reason: event.target.value }))}
                    placeholder="Operational reason"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Proposal message</Label>
                  <Textarea
                    value={modificationForm.proposal_message}
                    onChange={(event) => setModificationForm((prev) => ({ ...prev, proposal_message: event.target.value }))}
                    rows={3}
                    placeholder="Explain why this modification is proposed"
                  />
                </div>

                <Button onClick={() => void createModification(false)} disabled={creatingModification}>
                  {creatingModification ? "Creating..." : "Create modification"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Live Modification Queue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {overview.booking_modifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No modifications yet.</p>
                ) : (
                  overview.booking_modifications.slice(0, 50).map((modification) => (
                    <div key={modification.id} className="rounded-md border border-border bg-muted/20 p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={statusTone(modification.status)}>{modification.status}</Badge>
                          <Badge className={statusTone(modification.payment_status)}>{modification.payment_status}</Badge>
                          <Badge variant="outline">{humanizeLabel(modification.modification_type)}</Badge>
                        </div>
                        <p className="text-sm mt-1">Booking {modification.booking_id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(modification.old_price, modification.currency)} → {formatMoney(modification.new_price, modification.currency)}
                          {" · "}
                          Diff {modification.difference > 0 ? "+" : ""}{formatMoney(modification.difference, modification.currency)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(modification.created_at).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alternatives" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Handshake className="w-5 h-5" />
                  Suggest Alternative Property
                </CardTitle>
                <CardDescription>
                  If a listing is unavailable, propose another property and let the system compute difference automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This uses the same engine as booking modification and sends a user proposal in one action.
                </p>
                <Button onClick={() => void createModification(true)} disabled={creatingModification}>
                  {creatingModification ? "Sending..." : "Send alternative offer"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disputes" className="mt-6 space-y-4">
            {overview.disputes.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">No disputes found.</CardContent>
              </Card>
            ) : (
              overview.disputes.map((dispute) => (
                <Card key={dispute.id}>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={statusTone(dispute.status)}>{dispute.status}</Badge>
                        {dispute.charge_id && <Badge variant="outline">Charge</Badge>}
                        {dispute.booking_modification_id && <Badge variant="outline">Modification</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(dispute.created_at).toLocaleString()}</span>
                    </div>

                    <p className="font-medium">{dispute.reason}</p>
                    {dispute.details && <p className="text-sm text-muted-foreground">{dispute.details}</p>}
                    {(dispute.admin_notes || dispute.resolution) && (
                      <div className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-1">
                        {dispute.admin_notes && <p><strong>Admin notes:</strong> {dispute.admin_notes}</p>}
                        {dispute.resolution && <p><strong>Resolution:</strong> {dispute.resolution}</p>}
                      </div>
                    )}

                    <Button variant="outline" onClick={() => openResolveDialog(dispute)}>
                      Resolve / update dispute
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={resolveDialog.open} onOpenChange={(open) => setResolveDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Approve, reject, settle, or move dispute to in-review with documented notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={resolveDialog.status}
                onChange={(event) => setResolveDialog((prev) => ({ ...prev, status: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="in_review">In review</option>
                <option value="approved">Approve dispute</option>
                <option value="rejected">Reject dispute</option>
                <option value="settled">Settle</option>
                <option value="closed">Close</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Admin Notes</Label>
              <Textarea
                value={resolveDialog.adminNotes}
                onChange={(event) => setResolveDialog((prev) => ({ ...prev, adminNotes: event.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Resolution Message</Label>
              <Textarea
                value={resolveDialog.resolution}
                onChange={(event) => setResolveDialog((prev) => ({ ...prev, resolution: event.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setResolveDialog({ open: false, disputeId: null, status: "in_review", adminNotes: "", resolution: "" })}
              >
                Cancel
              </Button>
              <Button onClick={() => void submitDisputeResolution()} disabled={resolvingDispute}>
                {resolvingDispute ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

function humanizeLabel(value: string) {
  return String(value || "").replace(/_/g, " ");
}

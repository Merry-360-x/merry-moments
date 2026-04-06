import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { formatMoney } from "@/lib/money";
import {
  AlertCircle,
  ArrowRightLeft,
  CreditCard,
  ShieldAlert,
  Wallet,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock3,
  RefreshCcw,
} from "lucide-react";

type Charge = {
  id: string;
  booking_id: string;
  charge_type: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  created_at: string;
  charge_id?: string;
};

type BookingModification = {
  id: string;
  booking_id: string;
  modification_type: string;
  old_price: number;
  new_price: number;
  difference: number;
  currency: string;
  status: string;
  payment_status: string;
  proposal_message: string | null;
  charge_id: string | null;
  created_at: string;
};

type Dispute = {
  id: string;
  charge_id: string | null;
  booking_modification_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  resolution: string | null;
  admin_notes: string | null;
  created_at: string;
};

type WalletAccount = {
  user_id: string;
  balance: number;
  currency: string;
  auto_charge_consent: boolean;
};

type WalletTransaction = {
  id: string;
  tx_type: string;
  direction: "in" | "out";
  amount: number;
  balance_before: number;
  balance_after: number;
  created_at: string;
  reference_type?: string | null;
  notes?: string | null;
};

type PostBookingOverview = {
  charges: Charge[];
  booking_modifications: BookingModification[];
  disputes: Dispute[];
  wallet_account: WalletAccount | null;
  wallet_transactions: WalletTransaction[];
};

type DisputeDialogState = {
  open: boolean;
  chargeId: string | null;
  modificationId: string | null;
};

const mobileProviders = [
  { value: "MTN", label: "MTN Mobile Money" },
  { value: "AIRTEL", label: "Airtel Money" },
  { value: "MPESA", label: "M-Pesa" },
  { value: "VODACOM", label: "Vodacom M-Pesa" },
  { value: "ORANGE", label: "Orange Money" },
];

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

async function fetchUserOverview() {
  const token = await getAccessToken();
  const response = await fetch("/api/post-booking?action=user-overview", {
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
    booking_modifications: payload.booking_modifications || [],
    disputes: payload.disputes || [],
    wallet_account: payload.wallet_account || null,
    wallet_transactions: payload.wallet_transactions || [],
  } as PostBookingOverview;
}

function statusTone(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "paid" || s === "approved" || s === "settled") return "bg-emerald-100 text-emerald-700";
  if (s === "failed" || s === "rejected" || s === "cancelled") return "bg-rose-100 text-rose-700";
  if (s === "disputed" || s === "in_review") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default function PostBookingCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("charges");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<PostBookingOverview>({
    charges: [],
    booking_modifications: [],
    disputes: [],
    wallet_account: null,
    wallet_transactions: [],
  });

  const [payMethodByCharge, setPayMethodByCharge] = useState<Record<string, string>>({});
  const [mobileProviderByCharge, setMobileProviderByCharge] = useState<Record<string, string>>({});
  const [mobilePhoneByCharge, setMobilePhoneByCharge] = useState<Record<string, string>>({});
  const [processingChargeId, setProcessingChargeId] = useState<string | null>(null);

  const [walletConsent, setWalletConsent] = useState(false);
  const [walletCurrency, setWalletCurrency] = useState("USD");
  const [savingWalletSettings, setSavingWalletSettings] = useState(false);

  const [disputeDialog, setDisputeDialog] = useState<DisputeDialogState>({
    open: false,
    chargeId: null,
    modificationId: null,
  });
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDetails, setDisputeDetails] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const [respondingModificationId, setRespondingModificationId] = useState<string | null>(null);

  const pendingChargeTotals = useMemo(() => {
    const totals = new Map<string, number>();

    overview.charges
      .filter((charge) => charge.status === "pending")
      .forEach((charge) => {
        const currency = String(charge.currency || "USD").toUpperCase();
        const current = totals.get(currency) || 0;
        totals.set(currency, current + safeNumber(charge.amount));
      });

    return Array.from(totals.entries());
  }, [overview.charges]);

  const pendingChargesHeadline = useMemo(() => {
    if (pendingChargeTotals.length === 0) {
      return formatMoney(0, walletBalanceCurrency);
    }

    if (pendingChargeTotals.length === 1) {
      const [currency, amount] = pendingChargeTotals[0];
      return formatMoney(amount, currency);
    }

    return `${pendingChargeTotals.length} currencies`;
  }, [pendingChargeTotals, walletBalanceCurrency]);

  const pendingChargesBreakdown = useMemo(() => {
    if (pendingChargeTotals.length <= 1) return "";

    return pendingChargeTotals
      .slice(0, 3)
      .map(([currency, amount]) => formatMoney(amount, currency))
      .join(" · ");
  }, [pendingChargeTotals]);

  const openDisputesCount = useMemo(
    () => overview.disputes.filter((dispute) => ["open", "in_review"].includes(String(dispute.status))).length,
    [overview.disputes]
  );

  const walletBalance = safeNumber(overview.wallet_account?.balance);
  const walletBalanceCurrency = overview.wallet_account?.currency || "USD";

  const loadOverview = useCallback(async (withSpinner = true) => {
    if (!user?.id) return;

    if (withSpinner) setLoading(true);
    setRefreshing(true);

    try {
      const data = await fetchUserOverview();
      setOverview(data);
      setWalletConsent(Boolean(data.wallet_account?.auto_charge_consent));
      setWalletCurrency(data.wallet_account?.currency || "USD");
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
  }, [toast, user?.id]);

  useEffect(() => {
    if (!user) {
      navigate("/auth?mode=login&redirect=/post-booking");
      return;
    }

    void loadOverview(true);
  }, [loadOverview, navigate, user]);

  const linkedChargeMap = useMemo(() => {
    const map = new Map<string, Charge>();
    overview.charges.forEach((charge) => map.set(charge.id, charge));
    return map;
  }, [overview.charges]);

  async function handlePayCharge(charge: Charge) {
    const method = payMethodByCharge[charge.id] || "wallet";
    const provider = mobileProviderByCharge[charge.id] || "MTN";
    const phone = mobilePhoneByCharge[charge.id] || "";

    if (method === "mobile_money" && !phone.trim()) {
      toast({
        variant: "destructive",
        title: "Phone number required",
        description: "Enter a mobile money number to continue.",
      });
      return;
    }

    setProcessingChargeId(charge.id);

    try {
      const payload: Record<string, unknown> = {
        charge_id: charge.id,
        method,
      };

      if (method !== "wallet") {
        payload.initialize = true;
      }

      if (method === "mobile_money") {
        payload.provider = provider;
        payload.phone_number = phone.trim();
      }

      const result = await postBookingRequest("pay-charge", payload);

      if (method === "wallet") {
        toast({
          title: "Payment successful",
          description: "Charge was paid from your wallet.",
        });
        await loadOverview(false);
        return;
      }

      if (method === "card") {
        const redirectUrl =
          result?.flutterwave?.body?.redirectUrl ||
          result?.flutterwave?.body?.link ||
          result?.redirectUrl;

        if (redirectUrl) {
          window.location.href = redirectUrl;
          return;
        }

        if (result.checkout_id) {
          navigate(`/payment-pending?checkoutId=${encodeURIComponent(String(result.checkout_id))}&provider=flutterwave`);
          return;
        }
      }

      if (method === "mobile_money") {
        const depositId =
          result?.mobile_money?.body?.depositId ||
          result?.mobile_money?.body?.data?.depositId;

        if (result.checkout_id && depositId) {
          navigate(
            `/payment-pending?checkoutId=${encodeURIComponent(String(result.checkout_id))}&depositId=${encodeURIComponent(String(depositId))}`
          );
          return;
        }

        toast({
          title: "Payment initiated",
          description: "Follow the mobile-money prompt on your phone to complete payment.",
        });
      }

      await loadOverview(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: error instanceof Error ? error.message : "Could not process payment.",
      });
    } finally {
      setProcessingChargeId(null);
    }
  }

  async function handleRespondModification(modification: BookingModification, decision: "accept" | "reject") {
    setRespondingModificationId(modification.id);
    try {
      const result = await postBookingRequest("respond-modification", {
        booking_modification_id: modification.id,
        decision,
      });

      const paymentStatus = String(result?.booking_modification?.payment_status || "");
      if (decision === "accept" && paymentStatus === "pending") {
        toast({
          title: "Change accepted",
          description: "Complete the linked payment to finalize your booking update.",
        });
      } else {
        toast({
          title: decision === "accept" ? "Change accepted" : "Change rejected",
          description: "Your response has been recorded.",
        });
      }

      await loadOverview(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not submit response",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setRespondingModificationId(null);
    }
  }

  function openDisputeForCharge(chargeId: string) {
    setDisputeReason("");
    setDisputeDetails("");
    setDisputeDialog({ open: true, chargeId, modificationId: null });
  }

  function openDisputeForModification(modificationId: string) {
    setDisputeReason("");
    setDisputeDetails("");
    setDisputeDialog({ open: true, chargeId: null, modificationId });
  }

  async function submitDispute() {
    if (!disputeReason.trim()) {
      toast({
        variant: "destructive",
        title: "Reason is required",
        description: "Please describe why you are opening this dispute.",
      });
      return;
    }

    setSubmittingDispute(true);
    try {
      await postBookingRequest("open-dispute", {
        charge_id: disputeDialog.chargeId,
        booking_modification_id: disputeDialog.modificationId,
        reason: disputeReason.trim(),
        details: disputeDetails.trim(),
      });

      setDisputeDialog({ open: false, chargeId: null, modificationId: null });
      setDisputeReason("");
      setDisputeDetails("");

      toast({
        title: "Dispute opened",
        description: "Your case is now in review.",
      });

      await loadOverview(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to open dispute",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSubmittingDispute(false);
    }
  }

  async function saveWalletPreferences() {
    setSavingWalletSettings(true);
    try {
      await postBookingRequest("set-auto-charge-consent", {
        auto_charge_consent: walletConsent,
        currency: walletCurrency,
      });

      toast({
        title: "Wallet settings saved",
        description: "Auto-charge preferences were updated.",
      });

      await loadOverview(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not save wallet settings",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSavingWalletSettings(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 lg:px-8 py-24">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-72 bg-muted rounded" />
            <div className="h-24 w-full bg-muted rounded-xl" />
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

      <div className="container mx-auto px-4 lg:px-8 py-10 pb-24 space-y-8">
        <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 lg:p-8 text-white">
          <div className="absolute -top-16 -right-12 h-44 w-44 rounded-full bg-orange-400/25 blur-2xl" />
          <div className="absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-rose-400/25 blur-2xl" />
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/80">
                <Sparkles className="h-3.5 w-3.5" />
                Post-Booking Center
              </p>
              <h1 className="text-2xl lg:text-3xl font-semibold">Payments, Changes, and Resolution</h1>
              <p className="text-white/80 max-w-2xl text-sm lg:text-base">
                Review extra charges, approve booking changes, settle disputes, and manage wallet preferences in one secure flow.
              </p>
            </div>
            <Button
              variant="secondary"
              className="w-full lg:w-auto"
              onClick={() => void loadOverview(false)}
              disabled={refreshing}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-4 h-4" />
                Pending Charges
              </CardDescription>
              <CardTitle className="text-2xl">{pendingChargesHeadline}</CardTitle>
              {pendingChargesBreakdown ? (
                <p className="text-xs text-muted-foreground pt-1">{pendingChargesBreakdown}</p>
              ) : null}
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2 text-amber-600">
                <ShieldAlert className="w-4 h-4" />
                Open Disputes
              </CardDescription>
              <CardTitle className="text-2xl">{openDisputesCount}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2 text-emerald-600">
                <Wallet className="w-4 h-4" />
                Wallet Balance
              </CardDescription>
              <CardTitle className="text-2xl">{formatMoney(walletBalance, walletBalanceCurrency)}</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start gap-1.5 overflow-x-auto rounded-2xl p-1.5 pr-16 md:pr-2">
            <TabsTrigger className="shrink-0" value="charges">Charges</TabsTrigger>
            <TabsTrigger className="shrink-0" value="modifications">Modifications</TabsTrigger>
            <TabsTrigger className="shrink-0" value="disputes">Resolution Center</TabsTrigger>
            <TabsTrigger className="shrink-0" value="wallet">Wallet</TabsTrigger>
          </TabsList>

          <TabsContent value="charges" className="mt-6 space-y-4">
            {overview.charges.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  No extra charges yet.
                </CardContent>
              </Card>
            ) : (
              overview.charges.map((charge) => {
                const selectedMethod = payMethodByCharge[charge.id] || "wallet";
                const linkedDispute = overview.disputes.find((d) => d.charge_id === charge.id);
                return (
                  <Card key={charge.id} className="border-border/70">
                    <CardContent className="pt-6 space-y-5">
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

                        <div className="text-xs text-muted-foreground">
                          {new Date(charge.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Additional charge</span>
                          <span className="font-medium text-rose-600">{formatMoney(charge.amount, charge.currency)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Security checks</span>
                          <span className="text-muted-foreground">Server-validated</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Total due</span>
                          <span className="font-semibold">{formatMoney(charge.amount, charge.currency)}</span>
                        </div>
                      </div>

                      {charge.status === "pending" && (
                        <div className="rounded-lg border border-border p-3 space-y-3">
                          <Label className="text-sm font-medium">Choose payment method</Label>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                            <select
                              value={selectedMethod}
                              onChange={(event) => {
                                const next = event.target.value;
                                setPayMethodByCharge((prev) => ({ ...prev, [charge.id]: next }));
                              }}
                              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="wallet">Wallet</option>
                              <option value="card">Card (Flutterwave)</option>
                              <option value="mobile_money">Mobile Money (PawaPay)</option>
                            </select>

                            {selectedMethod === "mobile_money" && (
                              <select
                                value={mobileProviderByCharge[charge.id] || "MTN"}
                                onChange={(event) => {
                                  const next = event.target.value;
                                  setMobileProviderByCharge((prev) => ({ ...prev, [charge.id]: next }));
                                }}
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                              >
                                {mobileProviders.map((provider) => (
                                  <option key={provider.value} value={provider.value}>
                                    {provider.label}
                                  </option>
                                ))}
                              </select>
                            )}

                            {selectedMethod === "mobile_money" && (
                              <Input
                                value={mobilePhoneByCharge[charge.id] || ""}
                                onChange={(event) => {
                                  const next = event.target.value;
                                  setMobilePhoneByCharge((prev) => ({ ...prev, [charge.id]: next }));
                                }}
                                placeholder="Phone number"
                              />
                            )}

                            <Button
                              onClick={() => void handlePayCharge(charge)}
                              disabled={processingChargeId === charge.id}
                              className="w-full"
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              {processingChargeId === charge.id ? "Processing..." : "Pay now"}
                            </Button>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              onClick={() => openDisputeForCharge(charge.id)}
                            >
                              <ShieldAlert className="w-4 h-4 mr-2" />
                              Dispute charge
                            </Button>
                          </div>
                        </div>
                      )}

                      {linkedDispute && (
                        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                          <AlertCircle className="h-4 w-4 text-amber-700" />
                          <AlertTitle>Dispute in progress</AlertTitle>
                          <AlertDescription>
                            This charge has an active dispute with status: <strong>{linkedDispute.status}</strong>
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="modifications" className="mt-6 space-y-4">
            {overview.booking_modifications.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  No booking modification requests.
                </CardContent>
              </Card>
            ) : (
              overview.booking_modifications.map((modification) => {
                const difference = safeNumber(modification.difference);
                const linkedCharge = modification.charge_id ? linkedChargeMap.get(modification.charge_id) : null;

                return (
                  <Card key={modification.id}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={statusTone(modification.status)}>{modification.status}</Badge>
                            <Badge className={statusTone(modification.payment_status)}>{modification.payment_status}</Badge>
                            <Badge variant="outline">{humanizeLabel(modification.modification_type)}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Booking {modification.booking_id.slice(0, 8).toUpperCase()}</p>
                          {modification.proposal_message && <p className="font-medium">{modification.proposal_message}</p>}
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm text-muted-foreground">Old</p>
                          <p className="font-medium">{formatMoney(modification.old_price, modification.currency)}</p>
                          <p className="text-sm text-muted-foreground">New</p>
                          <p className="font-medium">{formatMoney(modification.new_price, modification.currency)}</p>
                          <p className={`text-sm font-semibold ${difference > 0 ? "text-rose-600" : difference < 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {difference > 0 ? "+" : ""}{formatMoney(difference, modification.currency)}
                          </p>
                        </div>
                      </div>

                      {modification.status === "pending" && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => void handleRespondModification(modification, "accept")}
                            disabled={respondingModificationId === modification.id}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {respondingModificationId === modification.id ? "Saving..." : "Accept"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => void handleRespondModification(modification, "reject")}
                            disabled={respondingModificationId === modification.id}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => openDisputeForModification(modification.id)}
                          >
                            <ShieldAlert className="w-4 h-4 mr-2" />
                            Open dispute
                          </Button>
                        </div>
                      )}

                      {modification.status === "accepted" && modification.payment_status === "pending" && linkedCharge && (
                        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                          <Clock3 className="h-4 w-4 text-amber-700" />
                          <AlertTitle>Payment required to finalize</AlertTitle>
                          <AlertDescription className="space-y-3">
                            <p>
                              Pay linked charge <strong>{formatMoney(linkedCharge.amount, linkedCharge.currency)}</strong> to apply this booking change.
                            </p>
                            <Button size="sm" onClick={() => setActiveTab("charges")}>Go to charge payment</Button>
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="disputes" className="mt-6 space-y-4">
            {overview.disputes.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  No disputes filed.
                </CardContent>
              </Card>
            ) : (
              overview.disputes.map((dispute) => (
                <Card key={dispute.id}>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={statusTone(dispute.status)}>{dispute.status}</Badge>
                        {dispute.charge_id && <Badge variant="outline">Charge dispute</Badge>}
                        {dispute.booking_modification_id && <Badge variant="outline">Modification dispute</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(dispute.created_at).toLocaleString()}</span>
                    </div>

                    <p className="font-medium">{dispute.reason}</p>
                    {dispute.details && <p className="text-sm text-muted-foreground">{dispute.details}</p>}

                    {(dispute.admin_notes || dispute.resolution) && (
                      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2 text-sm">
                        {dispute.admin_notes && (
                          <p>
                            <span className="font-medium">Admin notes:</span> {dispute.admin_notes}
                          </p>
                        )}
                        {dispute.resolution && (
                          <p>
                            <span className="font-medium">Resolution:</span> {dispute.resolution}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="wallet" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Wallet Settings
                </CardTitle>
                <CardDescription>
                  Manage refund credits and optionally allow auto-charge for approved post-booking fees.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">Current balance</p>
                    <p className="text-2xl font-semibold">{formatMoney(walletBalance, walletBalanceCurrency)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                    <p className="text-xs text-muted-foreground">Wallet currency</p>
                    <select
                      value={walletCurrency}
                      onChange={(event) => setWalletCurrency(event.target.value)}
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

                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Auto-charge consent</p>
                      <p className="text-sm text-muted-foreground">Allow wallet auto-deduction for approved extra charges.</p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={walletConsent}
                        onChange={(event) => setWalletConsent(event.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                      Enabled
                    </label>
                  </div>

                  <Button onClick={() => void saveWalletPreferences()} disabled={savingWalletSettings}>
                    {savingWalletSettings ? "Saving..." : "Save wallet preferences"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Wallet Activity</CardTitle>
                <CardDescription>Latest credits, debits, and refunds.</CardDescription>
              </CardHeader>
              <CardContent>
                {overview.wallet_transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No wallet activity yet.</p>
                ) : (
                  <div className="space-y-2">
                    {overview.wallet_transactions.slice(0, 25).map((tx) => (
                      <div key={tx.id} className="rounded-md border border-border bg-muted/20 p-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium capitalize">{humanizeLabel(tx.tx_type)}</p>
                          <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                          {tx.notes && <p className="text-xs text-muted-foreground mt-1">{tx.notes}</p>}
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${tx.direction === "in" ? "text-emerald-600" : "text-rose-600"}`}>
                            {tx.direction === "in" ? "+" : "-"}{formatMoney(tx.amount, walletBalanceCurrency)}
                          </p>
                          <p className="text-xs text-muted-foreground">Balance {formatMoney(tx.balance_after, walletBalanceCurrency)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={disputeDialog.open} onOpenChange={(open) => setDisputeDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Dispute</DialogTitle>
            <DialogDescription>
              Share what went wrong and our team will review it in the Resolution Center.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                value={disputeReason}
                onChange={(event) => setDisputeReason(event.target.value)}
                placeholder="Example: Damage amount is incorrect"
              />
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                value={disputeDetails}
                onChange={(event) => setDisputeDetails(event.target.value)}
                placeholder="Add context and evidence summary"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDisputeDialog({ open: false, chargeId: null, modificationId: null })}
              >
                Cancel
              </Button>
              <Button onClick={() => void submitDispute()} disabled={submittingDispute}>
                {submittingDispute ? "Submitting..." : "Submit dispute"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

function safeNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function humanizeLabel(value: string) {
  return String(value || "").replace(/_/g, " ");
}

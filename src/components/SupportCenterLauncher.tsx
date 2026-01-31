import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ChevronLeft, Bot, Headset, X, Ticket, Maximize2, Minimize2, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { ScrollArea } from "@/components/ui/scroll-area";

type Step = "home" | "ai" | "support" | "tickets";

type ChatMsg = { role: "user" | "assistant"; content: string };

type TicketRow = {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  response: string | null;
  created_at: string;
};

export default function SupportCenterLauncher() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("home");
  const [expanded, setExpanded] = useState(false);

  // AI chat
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: "Hi! I'm your Merry360X Trip Advisor. Tell me where you're going and your budget." },
  ]);
  const [draft, setDraft] = useState("");
  const [aiSending, setAiSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Support ticket
  const [category, setCategory] = useState("booking");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendingTicket, setSendingTicket] = useState(false);

  // My tickets
  const [myTickets, setMyTickets] = useState<TicketRow[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);

  const canSendTicket = useMemo(() => subject.trim().length > 0 && body.trim().length > 0, [body, subject]);

  const resetTicket = () => {
    setCategory("booking");
    setSubject("");
    setBody("");
  };

  // Fetch user's tickets
  const fetchMyTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, subject, message, category, status, response, created_at")
        .eq("user_id" as never, user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setMyTickets((data ?? []) as TicketRow[]);
    } catch (e) {
      console.error("Failed to fetch tickets:", e);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (step === "tickets" && user) {
      void fetchMyTickets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, user]);

  const sendTicket = async () => {
    if (!user) {
      setOpen(false);
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!canSendTicket) {
      toast({ variant: "destructive", title: "Missing info", description: "Please add a subject and message." });
      return;
    }
    setSendingTicket(true);
    try {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        category,
        subject: subject.trim(),
        message: body.trim(),
      } as never);
      if (error) throw error;

      // Send email notification to support team (fire and forget)
      fetch("/api/support-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          message: body.trim(),
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.full_name || user.user_metadata?.name || null,
        }),
      }).catch(() => {}); // Silent fail - ticket is already saved

      toast({ title: "Sent", description: "Support received your message." });
      resetTicket();
      setStep("home");
    } catch (e) {
      logError("supportTickets.insert", e);
      toast({
        variant: "destructive",
        title: "Could not send",
        description: uiErrorMessage(e, "Please try again."),
      });
    } finally {
      setSendingTicket(false);
    }
  };

  const sendAi = async () => {
    const text = draft.trim();
    if (!text || aiSending) return;
    setDraft("");
    const next: ChatMsg[] = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setAiSending(true);
    try {
      const r = await fetch("/api/ai-trip-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error("AI request failed");
      const reply = typeof out?.reply === "string" ? out.reply : "Please try again.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      queueMicrotask(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    } catch (e) {
      logError("aiTripAdvisor", e);
      toast({
        variant: "destructive",
        title: "Trip Advisor unavailable",
        description: "Please try again or use Customer Support.",
      });
    } finally {
      setAiSending(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "resolved" || status === "closed") return <CheckCircle className="h-3 w-3 text-green-500" />;
    if (status === "in_progress") return <Clock className="h-3 w-3 text-yellow-500" />;
    return <AlertCircle className="h-3 w-3 text-blue-500" />;
  };

  const statusColor = (status: string) => {
    if (status === "resolved" || status === "closed") return "bg-green-100 text-green-700";
    if (status === "in_progress") return "bg-yellow-100 text-yellow-700";
    return "bg-blue-100 text-blue-700";
  };

  // Dynamic sizing
  const popupWidth = expanded ? "w-96" : "w-80";
  const popupHeight = expanded ? "max-h-[600px]" : "max-h-[450px]";

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform hover:scale-105"
        aria-label="Help"
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setStep("home");
            setSelectedTicket(null);
          }
        }}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {/* Popup card */}
      {open && (
        <div className={`fixed bottom-20 right-5 z-50 ${popupWidth} ${popupHeight} bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200 flex flex-col transition-all`}>
          {step === "home" ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">How can we help?</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="text-muted-foreground hover:text-foreground p-1"
                    aria-label={expanded ? "Minimize" : "Expand"}
                  >
                    {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-muted-foreground hover:text-foreground p-1"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setStep("ai")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-muted transition-colors group"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">AI Trip Advisor</div>
                    <div className="text-xs text-muted-foreground truncate">Plan trips, get recommendations</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStep("support")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-muted transition-colors group"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <Headset className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">Customer Support</div>
                    <div className="text-xs text-muted-foreground truncate">Bookings, payments, issues</div>
                  </div>
                </button>

                {user && (
                  <button
                    type="button"
                    onClick={() => setStep("tickets")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-muted transition-colors group"
                  >
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                      <Ticket className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">My Tickets</div>
                      <div className="text-xs text-muted-foreground truncate">View status &amp; responses</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          ) : step === "ai" ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep("home")} aria-label="Back">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium text-foreground">AI Trip Advisor</div>
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground p-1">
                    {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <ScrollArea className="flex-1 px-3 py-2">
                <div className="space-y-2">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        m.role === "user"
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                  {aiSending && (
                    <div className="max-w-[90%] rounded-xl px-3 py-2 text-xs bg-muted text-foreground">
                      Thinking…
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              </ScrollArea>

              <div className="p-2 border-t border-border shrink-0">
                <div className="flex gap-1.5">
                  <Input
                    className="h-8 text-xs"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Ask about stays, tours…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendAi();
                      }
                    }}
                  />
                  <Button size="sm" className="h-8 px-3 text-xs" onClick={() => void sendAi()} disabled={aiSending || !draft.trim()}>
                    Send
                  </Button>
                </div>
              </div>
            </div>
          ) : step === "support" ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep("home")} aria-label="Back">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium text-foreground">Customer Support</div>
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground p-1">
                    {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                <div>
                  <Label className="text-xs">Category</Label>
                  <select
                    className="mt-1 w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="booking">Booking</option>
                    <option value="payment">Payment</option>
                    <option value="account">Account</option>
                    <option value="property">Accommodation</option>
                    <option value="tour">Tour</option>
                    <option value="transport">Transport</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs">Subject</Label>
                  <Input className="h-8 text-xs" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What's the issue?" />
                </div>

                <div>
                  <Label className="text-xs">Message</Label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write details…"
                    className="min-h-[100px] text-xs"
                  />
                </div>

                <Button
                  className="w-full h-8 text-xs"
                  onClick={() => void sendTicket()}
                  disabled={sendingTicket || !canSendTicket}
                >
                  {sendingTicket ? "Sending…" : "Send message"}
                </Button>

                {!user && (
                  <div className="text-[10px] text-muted-foreground text-center">
                    You'll be asked to sign in first.
                  </div>
                )}
              </div>
            </div>
          ) : step === "tickets" && selectedTicket ? (
            // Ticket detail view
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedTicket(null)} aria-label="Back">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium text-foreground truncate flex-1">Ticket Details</div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground p-1">
                    {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-3">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${statusColor(selectedTicket.status)}`}>
                      {selectedTicket.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {selectedTicket.category}
                    </Badge>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-foreground">{selectedTicket.subject}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(selectedTicket.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-[10px] text-muted-foreground mb-1 font-medium">Your message:</div>
                    <div className="text-xs text-foreground whitespace-pre-wrap">{selectedTicket.message}</div>
                  </div>

                  {selectedTicket.response ? (
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <div className="text-[10px] text-green-700 dark:text-green-400 mb-1 font-medium flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Support Response:
                      </div>
                      <div className="text-xs text-foreground whitespace-pre-wrap">{selectedTicket.response}</div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                      <div className="text-[10px] text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Awaiting response from support team
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            // Tickets list view
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep("home")} aria-label="Back">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium text-foreground">My Tickets</div>
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground p-1">
                    {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <ScrollArea className="flex-1">
                {loadingTickets ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : myTickets.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <Ticket className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <div className="text-sm text-muted-foreground">No tickets yet</div>
                    <Button
                      variant="link"
                      className="text-xs mt-2"
                      onClick={() => setStep("support")}
                    >
                      Create your first ticket
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {myTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => setSelectedTicket(ticket)}
                        className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          {statusIcon(ticket.status)}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">{ticket.subject}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                              <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                              <Badge className={`text-[8px] px-1.5 py-0 ${statusColor(ticket.status)}`}>
                                {ticket.status}
                              </Badge>
                            </div>
                            {ticket.response && (
                              <div className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                                <CheckCircle className="h-2.5 w-2.5" />
                                Response received
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="p-2 border-t border-border shrink-0">
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => setStep("support")}
                >
                  New Ticket
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}


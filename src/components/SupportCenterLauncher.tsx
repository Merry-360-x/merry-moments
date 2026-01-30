import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ChevronLeft, Bot, Headset, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { ScrollArea } from "@/components/ui/scroll-area";

type Step = "home" | "ai" | "support";

type ChatMsg = { role: "user" | "assistant"; content: string };

export default function SupportCenterLauncher() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("home");

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

  const canSendTicket = useMemo(() => subject.trim().length > 0 && body.trim().length > 0, [body, subject]);

  const resetTicket = () => {
    setCategory("booking");
    setSubject("");
    setBody("");
  };

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
      });
      if (error) throw error;
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
    const next = [...messages, { role: "user", content: text }];
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

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform hover:scale-105"
        aria-label="Help"
        onClick={() => {
          setOpen(!open);
          if (!open) setStep("home");
        }}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {/* Popup card */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-72 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
          {step === "home" ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">How can we help?</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
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
              </div>
            </div>
          ) : step === "ai" ? (
            <div className="flex flex-col h-80">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep("home")} aria-label="Back">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium text-foreground">AI Trip Advisor</div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ml-auto text-muted-foreground hover:text-foreground p-1"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
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
                  {aiSending ? (
                    <div className="max-w-[90%] rounded-xl px-3 py-2 text-xs bg-muted text-foreground">
                      Thinking…
                    </div>
                  ) : null}
                  <div ref={endRef} />
                </div>
              </ScrollArea>

              <div className="p-2 border-t border-border">
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
          ) : (
            <div className="flex flex-col max-h-96">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep("home")} aria-label="Back">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium text-foreground">Customer Support</div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ml-auto text-muted-foreground hover:text-foreground p-1"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-3 space-y-3 overflow-y-auto">
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
                    className="min-h-[80px] text-xs"
                  />
                </div>

                <Button
                  className="w-full h-8 text-xs"
                  onClick={() => void sendTicket()}
                  disabled={sendingTicket || !canSendTicket}
                >
                  {sendingTicket ? "Sending…" : "Send message"}
                </Button>

                {!user ? (
                  <div className="text-[10px] text-muted-foreground text-center">
                    You'll be asked to sign in first.
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}


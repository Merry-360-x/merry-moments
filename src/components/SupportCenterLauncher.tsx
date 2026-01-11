import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ChevronLeft, ArrowRight, Bot, Headset } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
    { role: "assistant", content: "Hi! I’m your Merry360X Trip Advisor. Tell me where you’re going and your budget." },
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
      <button
        type="button"
        className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90"
        aria-label="Help"
        onClick={() => {
          setOpen(true);
          setStep("home");
        }}
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setStep("home");
        }}
      >
        <DialogContent className="p-0 w-[95vw] max-w-xl overflow-hidden">
          {step === "home" ? (
            <div className="p-8">
              <div className="mx-auto mb-6 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">How can we help?</div>
                <div className="mt-2 text-muted-foreground">Choose the service you need</div>
              </div>

              <div className="mt-8 space-y-5">
                <button
                  type="button"
                  onClick={() => setStep("ai")}
                  className="w-full rounded-2xl p-6 text-left text-white shadow-md hover:shadow-lg transition bg-gradient-to-r from-rose-500 to-pink-600"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                        <Bot className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="text-xl font-bold">AI Trip Advisor</div>
                        <div className="mt-1 text-white/90 text-sm">
                          Get recommendations, plan trips, explore Rwanda
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-6 w-6 text-white/90" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStep("support")}
                  className="w-full rounded-2xl p-6 text-left text-white shadow-md hover:shadow-lg transition bg-gradient-to-r from-blue-500 to-indigo-600"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                        <Headset className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="text-xl font-bold">Customer Support</div>
                        <div className="mt-1 text-white/90 text-sm">Get help with bookings, payments, or issues</div>
                      </div>
                    </div>
                    <ArrowRight className="h-6 w-6 text-white/90" />
                  </div>
                </button>
              </div>
            </div>
          ) : step === "ai" ? (
            <div className="flex flex-col h-[75vh]">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <Button variant="ghost" size="icon" onClick={() => setStep("home")} aria-label="Back">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="font-semibold text-foreground">AI Trip Advisor</div>
                <div className="ml-auto text-xs text-muted-foreground">Website data only</div>
              </div>

              <ScrollArea className="flex-1 px-4 py-4">
                <div className="space-y-3">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                  {aiSending ? (
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-muted text-foreground">
                      Thinking…
                    </div>
                  ) : null}
                  <div ref={endRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Ask about stays, tours, or transport…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendAi();
                      }
                    }}
                  />
                  <Button onClick={() => void sendAi()} disabled={aiSending || !draft.trim()}>
                    Send
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={() => setStep("home")} aria-label="Back">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="font-semibold text-foreground">Customer Support</div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Category</Label>
                  <select
                    className="mt-1 w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
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
                  <Label>Subject</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What’s the issue?" />
                </div>

                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write details so we can help fast…"
                    className="min-h-[140px]"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={() => void sendTicket()}
                  disabled={sendingTicket || !canSendTicket}
                >
                  {sendingTicket ? "Sending…" : "Send message"}
                </Button>

                {!user ? (
                  <div className="text-xs text-muted-foreground text-center">
                    You’ll be asked to sign in before sending a support message.
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


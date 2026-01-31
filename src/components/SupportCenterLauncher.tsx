/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - support_ticket_messages table not in generated types yet
import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ChevronLeft, Bot, Headset, X, Ticket, Maximize2, Minimize2, Clock, CheckCircle, AlertCircle, Send, Paperclip, Smile, Reply, User, Image as ImageIcon, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { ScrollArea } from "@/components/ui/scroll-area";

type Step = "home" | "ai" | "support" | "tickets";

type ChatMsg = { role: "user" | "assistant"; content: string };

type TicketRow = {
  id: string;
  user_id?: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  response: string | null;
  created_at: string;
};

type TicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_type: "customer" | "staff";
  sender_name: string | null;
  message: string;
  reply_to_id: string | null;
  attachments: { url: string; name: string; type: string }[];
  created_at: string;
  reply_to?: TicketMessage | null;
};

const EMOJI_LIST = ["👍", "👎", "❤️", "😊", "😢", "😮", "🎉", "🙏", "✅", "❌", "⚠️", "📎", "💡", "🔥", "👀", "🤔"];

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

  // Ticket chat
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [ticketDraft, setTicketDraft] = useState("");
  const [sendingTicketMsg, setSendingTicketMsg] = useState(false);
  const [replyTo, setReplyTo] = useState<TicketMessage | null>(null);
  const [ticketAttachments, setTicketAttachments] = useState<{ url: string; name: string; type: string }[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const ticketFileInputRef = useRef<HTMLInputElement | null>(null);
  const ticketScrollRef = useRef<HTMLDivElement | null>(null);

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

  // Fetch ticket messages when a ticket is selected
  const fetchTicketMessages = async (ticketId: string) => {
    try {

      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      
      if (error) {
        console.log("Messages table may not exist yet:", error);
        setTicketMessages([]);
        return;
      }

      // Enrich with reply_to data
      const msgs = (data || []) as unknown as TicketMessage[];
      const enriched = msgs.map((msg: TicketMessage) => {
        if (msg.reply_to_id) {
          const replyMsg = msgs.find((m: TicketMessage) => m.id === msg.reply_to_id);
          return { ...msg, reply_to: replyMsg || null };
        }
        return msg;
      });

      setTicketMessages(enriched);
    } catch (e) {
      console.error("Failed to fetch messages:", e);
      setTicketMessages([]);
    }
  };

  // Subscribe to new messages
  useEffect(() => {
    if (!selectedTicket) return;

    void fetchTicketMessages(selectedTicket.id);

    const channel = supabase
      .channel(`customer-ticket-${selectedTicket.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${selectedTicket.id}` },
        (payload) => {
          setTicketMessages((prev) => [...prev, payload.new as TicketMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (ticketScrollRef.current) {
      ticketScrollRef.current.scrollTop = ticketScrollRef.current.scrollHeight;
    }
  }, [ticketMessages]);

  // Send message in ticket chat
  const sendTicketMessage = async () => {
    if (!selectedTicket || !user || (!ticketDraft.trim() && ticketAttachments.length === 0)) return;
    
    setSendingTicketMsg(true);
    try {
      // Get user name from profile
      let senderName = "Customer";

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();
      senderName = (profile as { full_name: string | null } | null)?.full_name || user.email?.split("@")[0] || "Customer";


      const { error } = await supabase.from("support_ticket_messages").insert({
        ticket_id: selectedTicket.id,
        sender_id: user.id,
        sender_type: "customer",
        sender_name: senderName,
        message: ticketDraft.trim(),
        reply_to_id: replyTo?.id || null,
        attachments: ticketAttachments,
      });

      if (error) throw error;

      setTicketDraft("");
      setReplyTo(null);
      setTicketAttachments([]);
    } catch (e) {
      console.error("Failed to send message:", e);
      toast({ variant: "destructive", title: "Failed to send", description: "Please try again." });
    } finally {
      setSendingTicketMsg(false);
    }
  };

  // File upload handler
  const handleTicketFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTicket) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max 5MB allowed." });
      return;
    }

    setUploadingFile(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedTicket.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("support-attachments")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload failed:", uploadError);
        toast({ variant: "destructive", title: "Upload failed", description: "File storage not configured." });
        return;
      }

      const { data: urlData } = supabase.storage
        .from("support-attachments")
        .getPublicUrl(fileName);

      setTicketAttachments((prev) => [
        ...prev,
        {
          url: urlData.publicUrl,
          name: file.name,
          type: file.type.startsWith("image/") ? "image" : "file",
        },
      ]);
    } catch (e) {
      console.error("Upload failed:", e);
    } finally {
      setUploadingFile(false);
      if (ticketFileInputRef.current) ticketFileInputRef.current.value = "";
    }
  };

  // Add emoji to ticket draft
  const addTicketEmoji = (emoji: string) => {
    setTicketDraft((prev) => prev + emoji);
  };

  // Format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

  const parseResponse = (response?: string | null) => {
    if (!response) return { name: null as string | null, message: "" };
    const match = response.match(/^Support:\s*(.+)\n([\s\S]*)$/);
    if (match) {
      return { name: match[1].trim(), message: match[2].trim() };
    }
    return { name: null as string | null, message: response };
  };

  const responseMeta = selectedTicket ? parseResponse(selectedTicket.response) : null;

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
            // Ticket chat view
            <div className="flex flex-col flex-1 min-h-0">
              {/* Header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedTicket(null); setTicketMessages([]); setTicketDraft(""); setReplyTo(null); setTicketAttachments([]); }} aria-label="Back">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{selectedTicket.subject}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge className={`text-[9px] px-1.5 py-0 ${statusColor(selectedTicket.status)}`}>
                      {selectedTicket.status}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">{selectedTicket.category}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground p-1">
                    {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-3" ref={ticketScrollRef}>
                <div className="space-y-3">
                  {/* Initial ticket message */}
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <User className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] text-muted-foreground mb-1">
                        You · {formatTime(selectedTicket.created_at)}
                      </div>
                      <div className="bg-primary/10 rounded-lg p-2.5">
                        <div className="text-xs text-foreground whitespace-pre-wrap">{selectedTicket.message}</div>
                      </div>
                    </div>
                  </div>

                  {/* Chat messages */}
                  {ticketMessages.map((msg) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.sender_id === user?.id ? "flex-row-reverse" : ""}`}>
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${msg.sender_type === "staff" ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-primary"}`}>
                        {msg.sender_type === "staff" ? <Headset className="h-3 w-3 text-white" /> : <User className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className={`flex-1 max-w-[85%] ${msg.sender_id === user?.id ? "text-right" : ""}`}>
                        <div className="text-[10px] text-muted-foreground mb-1">
                          <span className={msg.sender_type === "staff" ? "text-blue-600 dark:text-blue-400 font-medium" : ""}>
                            {msg.sender_id === user?.id ? "You" : msg.sender_name || (msg.sender_type === "staff" ? "Support" : "Customer")}
                          </span> · {formatTime(msg.created_at)}
                        </div>
                        
                        {/* Reply indicator */}
                        {msg.reply_to && (
                          <div className="bg-muted/50 rounded px-2 py-1 mb-1 text-[10px] text-muted-foreground border-l-2 border-primary inline-block text-left">
                            <Reply className="h-2.5 w-2.5 inline mr-1" />
                            {msg.reply_to.message?.slice(0, 30)}...
                          </div>
                        )}
                        
                        <div className={`rounded-lg p-2.5 inline-block text-left ${msg.sender_id === user?.id ? "bg-primary text-primary-foreground" : msg.sender_type === "staff" ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" : "bg-muted"}`}>
                          <div className="text-xs whitespace-pre-wrap">{msg.message}</div>
                          
                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.attachments.map((att, i) => (
                                <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] underline">
                                  {att.type === "image" ? <ImageIcon className="h-2.5 w-2.5" /> : <FileText className="h-2.5 w-2.5" />}
                                  {att.name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Reply button */}
                        {msg.sender_id !== user?.id && selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
                          <button className="text-[10px] text-muted-foreground hover:text-foreground mt-1 flex items-center gap-0.5" onClick={() => setReplyTo(msg)}>
                            <Reply className="h-2.5 w-2.5" /> Reply
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Awaiting response indicator */}
                  {ticketMessages.length === 0 && (
                    <div className="flex items-center gap-2 py-2">
                      <div className="flex-1 h-px bg-border" />
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 px-2">
                        <Clock className="h-3 w-3" />
                        Awaiting support response
                      </div>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input area */}
              {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" ? (
                <div className="shrink-0 border-t p-2 bg-muted/30">
                  {/* Reply indicator */}
                  {replyTo && (
                    <div className="flex items-center gap-1 mb-2 p-1.5 bg-muted rounded text-[10px]">
                      <Reply className="h-3 w-3 text-muted-foreground" />
                      <span className="flex-1 truncate text-muted-foreground">Replying to: {replyTo.message?.slice(0, 25)}...</span>
                      <button onClick={() => setReplyTo(null)} className="p-0.5 hover:bg-muted-foreground/20 rounded">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}
                  
                  {/* Attachments preview */}
                  {ticketAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {ticketAttachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-1 bg-muted rounded px-1.5 py-0.5 text-[10px]">
                          {att.type === "image" ? <ImageIcon className="h-2.5 w-2.5" /> : <FileText className="h-2.5 w-2.5" />}
                          <span className="max-w-[60px] truncate">{att.name}</span>
                          <button onClick={() => setTicketAttachments(prev => prev.filter((_, j) => j !== i))} className="hover:text-destructive">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Input row */}
                  <div className="flex gap-1.5 items-end">
                    <div className="flex-1 relative">
                      <Textarea
                        className="min-h-[50px] max-h-[80px] pr-14 resize-none text-xs"
                        placeholder="Type a message..."
                        value={ticketDraft}
                        onChange={(e) => setTicketDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void sendTicketMessage();
                          }
                        }}
                      />
                      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5">
                        {/* Emoji picker */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" align="end" side="top">
                            <div className="grid grid-cols-8 gap-0.5">
                              {EMOJI_LIST.map((emoji) => (
                                <button key={emoji} className="h-7 w-7 hover:bg-muted rounded flex items-center justify-center text-base" onClick={() => addTicketEmoji(emoji)}>
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        
                        {/* File upload */}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => ticketFileInputRef.current?.click()} disabled={uploadingFile}>
                          <Paperclip className={`h-3.5 w-3.5 ${uploadingFile ? "animate-pulse" : "text-muted-foreground"}`} />
                        </Button>
                        <input ref={ticketFileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleTicketFileUpload} />
                      </div>
                    </div>
                    <Button className="h-[50px] px-3" onClick={() => void sendTicketMessage()} disabled={sendingTicketMsg || (!ticketDraft.trim() && ticketAttachments.length === 0)}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="shrink-0 border-t p-2 bg-muted/30 text-center">
                  <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    This ticket has been resolved
                  </div>
                </div>
              )}
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


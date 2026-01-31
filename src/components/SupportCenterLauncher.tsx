/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - support_ticket_messages table not in generated types yet
import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ChevronLeft, Bot, Headset, X, Maximize2, Minimize2, Send, Paperclip, Smile, Reply, User, Image as ImageIcon, FileText, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { ScrollArea } from "@/components/ui/scroll-area";

type Step = "home" | "ai" | "chat";

type ChatMsg = { role: "user" | "assistant"; content: string };

type TicketRow = {
  id: string;
  user_id?: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  last_activity_at?: string;
  created_at: string;
};

type Message = {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_type: "customer" | "staff";
  sender_name: string | null;
  message: string;
  reply_to_id: string | null;
  attachments: { url: string; name: string; type: string }[];
  created_at: string;
  reply_to?: Message | null;
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
  const [aiMessages, setAiMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: "Hi! I'm your Merry360X Trip Advisor. Tell me where you're going and your budget." },
  ]);
  const [aiDraft, setAiDraft] = useState("");
  const [aiSending, setAiSending] = useState(false);
  const aiEndRef = useRef<HTMLDivElement | null>(null);

  // Support chat (texting window)
  const [activeTicket, setActiveTicket] = useState<TicketRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [attachments, setAttachments] = useState<{ url: string; name: string; type: string }[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [userName, setUserName] = useState<string>("Customer");

  // Get user's display name
  useEffect(() => {
    const fetchName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();
      setUserName((data as { full_name: string | null } | null)?.full_name || user.email?.split("@")[0] || "Customer");
    };
    void fetchName();
  }, [user]);

  // Find or create active ticket when opening chat
  const initializeChat = async () => {
    if (!user) {
      setOpen(false);
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setLoadingChat(true);
    try {
      // Find most recent active (non-closed) ticket
      const { data: tickets, error: ticketError } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (ticketError) throw ticketError;

      if (tickets && tickets.length > 0) {
        // Resume existing conversation
        const ticket = tickets[0] as TicketRow;
        setActiveTicket(ticket);
        await fetchMessages(ticket.id);
      } else {
        // No active ticket - user can start fresh conversation
        setActiveTicket(null);
        setMessages([]);
      }
    } catch (e) {
      console.error("Failed to initialize chat:", e);
      toast({ variant: "destructive", title: "Error", description: "Could not load chat." });
    } finally {
      setLoadingChat(false);
    }
  };

  // Fetch messages for a ticket
  const fetchMessages = async (ticketId: string) => {
    const { data, error } = await supabase
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch messages:", error);
      return;
    }

    const msgs = (data || []) as Message[];
    const enriched = msgs.map((msg) => {
      if (msg.reply_to_id) {
        const replyMsg = msgs.find((m) => m.id === msg.reply_to_id);
        return { ...msg, reply_to: replyMsg || null };
      }
      return msg;
    });
    setMessages(enriched);
  };

  // Real-time subscription
  useEffect(() => {
    if (!activeTicket) return;

    const channel = supabase
      .channel(`chat-${activeTicket.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${activeTicket.id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          // Don't add if it's our own message (already added optimistically)
          if (newMsg.sender_id !== user?.id) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTicket, user?.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize chat when step changes
  useEffect(() => {
    if (step === "chat") {
      void initializeChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Send message
  const sendMessage = async () => {
    if (!user || (!draft.trim() && attachments.length === 0)) return;

    const messageText = draft.trim();
    setSending(true);
    setDraft("");

    try {
      let ticketId = activeTicket?.id;

      // Create new ticket if needed
      if (!ticketId) {
        const { data: newTicket, error: createError } = await supabase
          .from("support_tickets")
          .insert({
            user_id: user.id,
            category: "general",
            subject: messageText.slice(0, 50) + (messageText.length > 50 ? "..." : ""),
            message: messageText,
            status: "open",
          })
          .select()
          .single();

        if (createError) throw createError;
        
        const ticket = newTicket as TicketRow;
        setActiveTicket(ticket);
        ticketId = ticket.id;

        // Send email notification
        fetch("/api/support-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: "general",
            subject: messageText.slice(0, 50),
            message: messageText,
            userId: user.id,
            userEmail: user.email,
            userName,
          }),
        }).catch(() => {});
      }

      // Add message to database
      const newMessage: Partial<Message> = {
        ticket_id: ticketId,
        sender_id: user.id,
        sender_type: "customer",
        sender_name: userName,
        message: messageText,
        reply_to_id: replyTo?.id || null,
        attachments,
      };

      // Optimistic update
      const optimisticMsg: Message = {
        ...newMessage,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
      } as Message;
      setMessages((prev) => [...prev, optimisticMsg]);

      const { data: savedMsg, error } = await supabase
        .from("support_ticket_messages")
        .insert(newMessage)
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      setMessages((prev) => prev.map((m) => 
        m.id === optimisticMsg.id ? (savedMsg as Message) : m
      ));

      setReplyTo(null);
      setAttachments([]);
    } catch (e) {
      console.error("Failed to send:", e);
      toast({ variant: "destructive", title: "Send failed", description: "Please try again." });
      setDraft(messageText); // Restore draft
      // Remove optimistic message
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
    } finally {
      setSending(false);
    }
  };

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max 5MB allowed." });
      return;
    }

    setUploadingFile(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `chat/${user?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("support-attachments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("support-attachments")
        .getPublicUrl(fileName);

      setAttachments((prev) => [
        ...prev,
        {
          url: urlData.publicUrl,
          name: file.name,
          type: file.type.startsWith("image/") ? "image" : "file",
        },
      ]);
    } catch (e) {
      console.error("Upload failed:", e);
      toast({ variant: "destructive", title: "Upload failed" });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Format time like messaging apps
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Check if ticket is about to auto-close (within 2 hours)
  const getAutoCloseWarning = () => {
    if (!activeTicket?.last_activity_at) return null;
    const lastActivity = new Date(activeTicket.last_activity_at);
    const hoursLeft = 24 - (Date.now() - lastActivity.getTime()) / 3600000;
    if (hoursLeft <= 2 && hoursLeft > 0) {
      return `This chat will close in ${Math.ceil(hoursLeft * 60)} minutes due to inactivity`;
    }
    return null;
  };

  // AI chat send
  const sendAi = async () => {
    const text = aiDraft.trim();
    if (!text || aiSending) return;
    setAiDraft("");
    const next: ChatMsg[] = [...aiMessages, { role: "user" as const, content: text }];
    setAiMessages(next);
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
      setAiMessages((m) => [...m, { role: "assistant", content: reply }]);
      queueMicrotask(() => aiEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
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

  // Dynamic sizing
  const popupWidth = expanded ? "w-96" : "w-80";
  const popupHeight = expanded ? "max-h-[600px]" : "max-h-[480px]";

  const autoCloseWarning = getAutoCloseWarning();

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
            setActiveTicket(null);
            setMessages([]);
          }
        }}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {/* Popup */}
      {open && (
        <div className={`fixed bottom-20 right-5 z-50 ${popupWidth} ${popupHeight} bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200 flex flex-col transition-all`}>
          
          {step === "home" ? (
            /* Home menu */
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">How can we help?</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground p-1">
                    {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setStep("ai")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-muted transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">AI Trip Advisor</div>
                    <div className="text-xs text-muted-foreground">Plan trips, get recommendations</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStep("chat")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-muted transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <Headset className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Chat with Support</div>
                    <div className="text-xs text-muted-foreground">Get help from our team</div>
                  </div>
                </button>
              </div>
            </div>

          ) : step === "ai" ? (
            /* AI Trip Advisor */
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep("home")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium text-foreground">AI Trip Advisor</div>
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground p-1">
                    {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <ScrollArea className="flex-1 px-3 py-2">
                <div className="space-y-2">
                  {aiMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground"
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
                  <div ref={aiEndRef} />
                </div>
              </ScrollArea>

              <div className="p-2 border-t border-border shrink-0">
                <div className="flex gap-1.5">
                  <Input
                    className="h-8 text-xs"
                    value={aiDraft}
                    onChange={(e) => setAiDraft(e.target.value)}
                    placeholder="Ask about stays, tours…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendAi();
                      }
                    }}
                  />
                  <Button size="sm" className="h-8 px-3 text-xs" onClick={() => void sendAi()} disabled={aiSending || !aiDraft.trim()}>
                    Send
                  </Button>
                </div>
              </div>
            </div>

          ) : (
            /* Support Chat - Texting Window */
            <div className="flex flex-col flex-1 min-h-0">
              {/* Header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-gradient-to-r from-blue-500 to-indigo-600 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => setStep("home")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Headset className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">Support Team</div>
                  <div className="text-[10px] text-white/70">Usually responds within minutes</div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setExpanded(!expanded)} className="text-white/70 hover:text-white p-1">
                    {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Auto-close warning */}
              {autoCloseWarning && (
                <div className="px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
                  <div className="text-[10px] text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {autoCloseWarning}
                  </div>
                </div>
              )}

              {/* Messages */}
              <ScrollArea className="flex-1 p-3" ref={scrollRef}>
                {loadingChat ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : messages.length === 0 && !activeTicket ? (
                  /* Welcome message for new conversation */
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                        <Headset className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 text-xs">
                          Hi {userName}! 👋 How can I help you today?
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">Just now</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="h-7 w-7 shrink-0" />
                      <div className="flex-1">
                        <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 text-xs">
                          You can ask about:
                          <ul className="mt-1 space-y-0.5 text-muted-foreground">
                            <li>• Bookings & reservations</li>
                            <li>• Payments & refunds</li>
                            <li>• Account issues</li>
                            <li>• Tours & accommodations</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Chat messages */
                  <div className="space-y-3">
                    {/* Initial ticket message if from old ticket */}
                    {activeTicket && messages.length === 0 && (
                      <div className="flex gap-2 flex-row-reverse">
                        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                        <div className="flex-1 text-right">
                          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 text-xs inline-block text-left">
                            {activeTicket.message}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">{formatTime(activeTicket.created_at)}</div>
                        </div>
                      </div>
                    )}

                    {messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                            isMe ? "bg-primary" : "bg-gradient-to-br from-blue-500 to-indigo-600"
                          }`}>
                            {isMe ? <User className="h-3.5 w-3.5 text-primary-foreground" /> : <Headset className="h-3.5 w-3.5 text-white" />}
                          </div>
                          <div className={`flex-1 ${isMe ? "text-right" : ""}`}>
                            {/* Reply indicator */}
                            {msg.reply_to && (
                              <div className={`text-[10px] text-muted-foreground mb-1 flex items-center gap-1 ${isMe ? "justify-end" : ""}`}>
                                <Reply className="h-2.5 w-2.5" />
                                <span className="max-w-[120px] truncate">{msg.reply_to.message}</span>
                              </div>
                            )}
                            
                            <div className={`rounded-2xl px-3 py-2 text-xs inline-block text-left max-w-[85%] ${
                              isMe 
                                ? "bg-primary text-primary-foreground rounded-tr-sm" 
                                : "bg-muted text-foreground rounded-tl-sm"
                            }`}>
                              <div className="whitespace-pre-wrap">{msg.message}</div>
                              
                              {/* Attachments */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {msg.attachments.map((att, i) => (
                                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] underline opacity-80 hover:opacity-100">
                                      {att.type === "image" ? <ImageIcon className="h-2.5 w-2.5" /> : <FileText className="h-2.5 w-2.5" />}
                                      {att.name}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <div className={`text-[10px] text-muted-foreground mt-1 flex items-center gap-1 ${isMe ? "justify-end" : ""}`}>
                              {formatTime(msg.created_at)}
                              {!isMe && (
                                <button className="hover:text-foreground ml-1" onClick={() => setReplyTo(msg)}>
                                  <Reply className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Typing/waiting indicator */}
                    {messages.length > 0 && messages[messages.length - 1]?.sender_id === user?.id && (
                      <div className="flex gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                          <Headset className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            Support will reply soon
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input area */}
              <div className="shrink-0 border-t p-2 bg-muted/30">
                {/* Reply indicator */}
                {replyTo && (
                  <div className="flex items-center gap-1 mb-2 px-2 py-1.5 bg-muted rounded text-[10px]">
                    <Reply className="h-3 w-3 text-muted-foreground" />
                    <span className="flex-1 truncate text-muted-foreground">{replyTo.message?.slice(0, 40)}...</span>
                    <button onClick={() => setReplyTo(null)} className="p-0.5 hover:bg-background rounded">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                )}

                {/* Attachments preview */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5 text-[10px]">
                        {att.type === "image" ? <ImageIcon className="h-2.5 w-2.5" /> : <FileText className="h-2.5 w-2.5" />}
                        <span className="max-w-[60px] truncate">{att.name}</span>
                        <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))} className="hover:text-destructive">
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
                      className="min-h-[40px] max-h-[80px] pr-16 resize-none text-xs rounded-2xl"
                      placeholder="Type your message..."
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendMessage();
                        }
                      }}
                    />
                    <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" align="end" side="top">
                          <div className="grid grid-cols-8 gap-0.5">
                            {EMOJI_LIST.map((emoji) => (
                              <button key={emoji} className="h-7 w-7 hover:bg-muted rounded flex items-center justify-center text-base" onClick={() => setDraft((p) => p + emoji)}>
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}>
                        <Paperclip className={`h-3.5 w-3.5 ${uploadingFile ? "animate-pulse" : "text-muted-foreground"}`} />
                      </Button>
                      <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFileUpload} />
                    </div>
                  </div>
                  <Button 
                    className="h-10 w-10 rounded-full p-0" 
                    onClick={() => void sendMessage()} 
                    disabled={sending || (!draft.trim() && attachments.length === 0)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}


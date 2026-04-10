/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - support_ticket_messages table not in generated types yet
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Paperclip, 
  Smile, 
  Reply, 
  X, 
  Image as ImageIcon,
  FileText,
  Headset,
  User,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

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

type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  category?: string;
  status: string;
  created_at: string;
};

type SupportChatProps = {
  ticket: SupportTicket;
  userType: "customer" | "staff";
  onClose?: () => void;
  onStatusChange?: (status: string) => void;
};

const EMOJI_LIST = ["�", "🤣", "😆", "😄", "😁", "😊", "🥰", "😍", "🤩", "😎", "🥳", "🤪", "😜", "😝", "🤗", "🤭", "👍", "👎", "❤️", "💖", "💯", "🎉", "🎊", "🙌", "👏", "🙏", "✅", "❌", "⚠️", "📎", "💡", "🔥", "✨", "⭐", "💪", "👀", "🤔", "😮", "😢", "🥺"];

type TypingSpeedPreset = "ultra" | "balanced" | "persistent";

const TYPING_TIMEOUT_MS_BY_PRESET: Record<TypingSpeedPreset, number> = {
  ultra: 500,
  balanced: 900,
  persistent: 1200,
};

const readTypingPreset = (): TypingSpeedPreset => {
  if (typeof window === "undefined") return "balanced";
  const raw = window.localStorage.getItem("support_typing_preset");
  if (raw === "ultra" || raw === "balanced" || raw === "persistent") {
    return raw;
  }
  return "balanced";
};

const SUPPORT_TYPING_PRESET = readTypingPreset();
const SUPPORT_TYPING_TIMEOUT_MS = TYPING_TIMEOUT_MS_BY_PRESET[SUPPORT_TYPING_PRESET];

export function SupportChat({ ticket, userType, onClose, onStatusChange }: SupportChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<{ url: string; name: string; type: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userName, setUserName] = useState<string>("");
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [activeSupportName, setActiveSupportName] = useState<string>("Support Team");
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeenAt, setOtherUserLastSeenAt] = useState<string | null>(null);

  const notifyRefundStatus = async (status: string) => {
    try {
      await fetch("/api/booking-confirmation-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refund_status",
          ticketId: ticket.id,
          refundStatus: status,
          source: "support_chat",
        }),
      });
    } catch (error) {
      console.warn("Failed to notify refund status by email", error);
    }
  };
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesChannelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);

  const maybeShowBackgroundNotification = useCallback((incoming: Message) => {
    if (!incoming) return;
    if (incoming.sender_id && incoming.sender_id === user?.id) return;
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (!("Notification" in window)) return;
    if (!(document.hidden || !document.hasFocus())) return;

    const title = (incoming.sender_name || (incoming.sender_type === "staff" ? "Support" : "Customer")).trim();
    const bodyText = (incoming.message || "").trim();

    const showNotification = () => {
      try {
        void new window.Notification(title || "Support", {
          body: bodyText.length > 140 ? `${bodyText.slice(0, 137)}...` : (bodyText || "New support message"),
          icon: "/brand/logo_dark.png",
          tag: `support-${ticket.id}`,
          renotify: true,
        });
      } catch (error) {
        console.warn("[SupportChat] Browser notification failed", error);
      }
    };

    if (window.Notification.permission === "granted") {
      showNotification();
      return;
    }

    if (window.Notification.permission === "default") {
      void window.Notification.requestPermission()
        .then((permission) => {
          if (permission === "granted") {
            showNotification();
          }
        })
        .catch(() => {});
    }
  }, [ticket.id, user?.id]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (window.Notification.permission === "default") {
      void window.Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Get user's display name
  useEffect(() => {
    const fetchName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();
      setUserName((data as { full_name: string | null } | null)?.full_name || user.email?.split("@")[0] || (userType === "staff" ? "Support" : "Customer"));
    };
    void fetchName();
  }, [user, userType]);

  // Fetch messages
  useEffect(() => {
    setOtherUserTyping(false);
    setOtherUserOnline(false);

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to fetch messages:", error);
        setMessages([]);
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

      const lastStaffMessage = [...enriched]
        .reverse()
        .find((msg) => msg.sender_type === "staff" && msg.sender_name);
      if (lastStaffMessage?.sender_name) {
        setActiveSupportName(lastStaffMessage.sender_name);
      }

      const lastOtherMessage = [...enriched]
        .reverse()
        .find((msg) => msg.sender_id && msg.sender_id !== user?.id);
      if (lastOtherMessage?.created_at) {
        setOtherUserLastSeenAt(lastOtherMessage.created_at);
      }

      setMessages(enriched);
    };

    void fetchMessages();

    // Real-time subscription for messages
    const messagesChannel = supabase
      .channel(`ticket-messages-${ticket.id}`, {
        config: {
          broadcast: { self: true },
        },
      });
    
    // Store ref immediately for broadcasting
    messagesChannelRef.current = messagesChannel;
    
    messagesChannel
      .on(
        'broadcast',
        { event: 'new-message' },
        ({ payload }) => {
          console.log('[SupportChat] Broadcast message received:', payload);
          const newMsg = payload as Message;
          setMessages((prev) => {
            // Check if message already exists (avoid duplicates)
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) {
              console.log('[SupportChat] Message already exists, skipping');
              return prev;
            }

            if (newMsg.sender_type === "staff" && newMsg.sender_name) {
              setActiveSupportName(newMsg.sender_name);
            }
            if (newMsg.sender_id && newMsg.sender_id !== user?.id) {
              setOtherUserLastSeenAt(newMsg.created_at || new Date().toISOString());
              maybeShowBackgroundNotification(newMsg);
            }

            console.log('[SupportChat] Adding broadcast message instantly');
            const updated = [...prev, newMsg];
            // Trigger immediate scroll to new message
            setTimeout(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTo({
                  top: scrollRef.current.scrollHeight,
                  behavior: 'smooth'
                });
              }
            }, 10);
            return updated;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${ticket.id}` },
        (payload) => {
          console.log('[SupportChat] DB change received:', payload.new);
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Check if message already exists
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) {
              console.log('[SupportChat] Message already exists from broadcast, skipping DB change');
              return prev;
            }

            if (newMsg.sender_type === "staff" && newMsg.sender_name) {
              setActiveSupportName(newMsg.sender_name);
            }
            if (newMsg.sender_id && newMsg.sender_id !== user?.id) {
              setOtherUserLastSeenAt(newMsg.created_at || new Date().toISOString());
              maybeShowBackgroundNotification(newMsg);
            }

            console.log('[SupportChat] Adding message from DB change');
            const updated = [...prev, newMsg];
            // Immediate scroll to new message
            setTimeout(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTo({
                  top: scrollRef.current.scrollHeight,
                  behavior: 'smooth'
                });
              }
            }, 10);
            return updated;
          });
        }
      )
      .subscribe((status) => {
        console.log('[SupportChat] Messages channel status:', status);
      });

    // Separate channel for presence/typing
    const presenceChannel = supabase
      .channel(`ticket-presence-${ticket.id}`, {
        config: {
          presence: { key: user?.id || 'anonymous' },
        },
      });
    
    // Store ref immediately for broadcasting
    presenceChannelRef.current = presenceChannel;
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const hasOtherPresence = Object.values(state).some((presences: any) => {
          return presences.some((p: any) => p.user_id !== user?.id);
        });
        setOtherUserOnline(hasOtherPresence);

        const otherPresence = Object.values(state).find((presences: any) => {
          return presences.some((p: any) => p.user_id !== user?.id && p.typing);
        });
        setOtherUserTyping(!!otherPresence);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const hasOtherJoin = newPresences.some((p: any) => p.user_id !== user?.id);
        if (hasOtherJoin) {
          setOtherUserOnline(true);
          setOtherUserLastSeenAt(new Date().toISOString());
        }

        const typing = newPresences.some((p: any) => p.user_id !== user?.id && p.typing);
        if (typing) setOtherUserTyping(true);
      })
      .on('presence', { event: 'leave' }, () => {
        const state = presenceChannel.presenceState();
        const hasOtherPresence = Object.values(state).some((presences: any) => {
          return presences.some((p: any) => p.user_id !== user?.id);
        });
        setOtherUserOnline(hasOtherPresence);
        if (!hasOtherPresence) setOtherUserTyping(false);
      })
      .subscribe(async (status) => {
        console.log('[SupportChat] Presence channel status:', status);
        if (status === 'SUBSCRIBED' && user) {
          await presenceChannel.track({
            user_id: user.id,
            user_type: userType,
            typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      console.log('[SupportChat] Cleaning up channels');
      if (user) {
        void presenceChannel.track({
          user_id: user.id,
          user_type: userType,
          typing: false,
          online_at: new Date().toISOString(),
        });
      }
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(presenceChannel);
      messagesChannelRef.current = null;
      presenceChannelRef.current = null;
    };
  }, [ticket.id, user?.id, userType, maybeShowBackgroundNotification]);

  // Auto-scroll to bottom on new messages and typing indicator
  useEffect(() => {
    if (scrollRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [messages, otherUserTyping]);

  // Separate effect to immediately scroll when typing starts
  useEffect(() => {
    if (otherUserTyping && scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 50);
    }
  }, [otherUserTyping]);

  // Safety guard: clear typing if no fresh typing signal arrives.
  useEffect(() => {
    if (!otherUserTyping) return;
    const timeout = window.setTimeout(() => {
      setOtherUserTyping(false);
    }, SUPPORT_TYPING_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [otherUserTyping, messages.length]);

  // Broadcast typing status
  const broadcastTyping = (isTyping: boolean) => {
    if (presenceChannelRef.current && user) {
      presenceChannelRef.current.track({
        user_id: user.id,
        user_type: userType,
        typing: isTyping,
        online_at: new Date().toISOString(),
      });
    }
  };

  const stopTyping = () => {
    broadcastTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // Handle typing with faster response
  const handleTyping = (value: string) => {
    setDraft(value);
    
    // Broadcast typing started immediately
    if (value.length > 0) {
      broadcastTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing shortly after input pauses.
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, SUPPORT_TYPING_TIMEOUT_MS);
    } else {
      stopTyping();
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!user || (!draft.trim() && attachments.length === 0)) return;

    const messageText = draft.trim();
    setSending(true);
    setDraft("");
    
    // Stop typing indicator
    stopTyping();

    try {
      const newMessage: Partial<Message> = {
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_type: userType,
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

      // Replace optimistic with real
      setMessages((prev) => prev.map((m) => 
        m.id === optimisticMsg.id ? (savedMsg as Message) : m
      ));

      // Broadcast message for instant delivery to other party
      if (messagesChannelRef.current) {
        await messagesChannelRef.current.send({
          type: 'broadcast',
          event: 'new-message',
          payload: savedMsg
        });
      }

      if ((savedMsg as Message | null)?.id) {
        void supabase.functions
          .invoke("send-support-push", {
            body: { messageId: (savedMsg as Message).id },
          })
          .catch((error) => {
            console.warn("[SupportChat] push notify failed", error);
          });
      }

      // Update ticket status if staff is replying
      if (userType === "staff" && ticket.status === "open") {
        await supabase
          .from("support_tickets")
          .update({ status: "in_progress" })
          .eq("id", ticket.id);
        await notifyRefundStatus("in_progress");
        onStatusChange?.("in_progress");
      }

      setReplyTo(null);
      setAttachments([]);
    } catch (e) {
      console.error("Failed to send:", e);
      toast({ variant: "destructive", title: "Send failed", description: "Please try again." });
      setDraft(messageText);
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
      toast({ variant: "destructive", title: "File too large", description: "Max 5MB" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `support/${ticket.id}/${Date.now()}.${fileExt}`;

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
      setUploading(false);
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

  const isSameDay = (a: string, b: string) => {
    const da = new Date(a);
    const db = new Date(b);
    if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
  };

  const formatDayChip = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const sortedMessages = [...messages].sort((a, b) => {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  const firstSupportMessageId = sortedMessages.find((m) => m.sender_type === "staff")?.id;
  const firstCustomerMessageId = sortedMessages.find((m) => m.sender_type === "customer")?.id;

  const customerLabel =
    sortedMessages.find((m) => m.sender_type === "customer" && m.sender_name)?.sender_name ||
    "Customer";
  const headerPersonName = userType === "customer" ? activeSupportName : customerLabel;
  const hasRecentOtherActivity =
    !!otherUserLastSeenAt && Date.now() - new Date(otherUserLastSeenAt).getTime() <= 5 * 60 * 1000;
  const headerStatus = otherUserTyping
    ? "typing..."
    : (otherUserOnline || hasRecentOtherActivity)
      ? "online"
      : "offline";
  const headerStatusClass = headerStatus === "offline" ? "text-white/70" : "text-emerald-100";

  const isClosed = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-500 to-indigo-600">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
            {userType === "staff" ? <User className="h-5 w-5 text-white" /> : <Headset className="h-5 w-5 text-white" />}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Support</div>
            <div className={`text-[10px] ${headerStatusClass}`}>
              {headerPersonName} • {headerStatus}
            </div>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => {
              stopTyping();
              onClose();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 max-h-[60vh] sm:max-h-[600px] overflow-y-auto" ref={scrollRef}>
        <div className="space-y-3">
          {(() => {
            const timeline: JSX.Element[] = [];
            const initialIsMe = ticket.user_id === user?.id;
            const initialSenderLabel = initialIsMe ? "You" : (userType === "customer" ? activeSupportName : customerLabel);
            const initialDay = formatDayChip(ticket.created_at);

            if (initialDay) {
              timeline.push(
                <div key="day-initial" className="flex justify-center py-1">
                  <div className="rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground">
                    {initialDay}
                  </div>
                </div>,
              );
            }

            timeline.push(
              <div key="initial-ticket" className={`flex gap-2 ${initialIsMe ? "flex-row-reverse" : ""}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${initialIsMe ? "bg-[#ff5a00]" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`}>
                  {initialIsMe ? <User className="h-4 w-4 text-white" /> : <Headset className="h-4 w-4 text-white" />}
                </div>
                <div className={`flex-1 ${initialIsMe ? "text-right" : ""}`}>
                  <div className="text-[11px] mb-1 font-semibold text-slate-900">
                    {initialSenderLabel} · <span className="font-normal text-muted-foreground">{formatTime(ticket.created_at)}</span>
                  </div>
                  <div className={`rounded-2xl px-3 py-2 text-sm inline-block text-left max-w-[85%] ${initialIsMe ? "bg-[#ff5a00] text-white rounded-tr-sm" : "bg-[#e7e7ea] text-slate-900 rounded-tl-sm"}`}>
                    <div className="whitespace-pre-wrap">{ticket.message}</div>
                  </div>
                </div>
              </div>,
            );

            sortedMessages.forEach((msg, index) => {
              const previousCreatedAt = index === 0 ? ticket.created_at : sortedMessages[index - 1].created_at;
              if (!isSameDay(previousCreatedAt, msg.created_at)) {
                const day = formatDayChip(msg.created_at);
                if (day) {
                  timeline.push(
                    <div key={`day-${msg.id}`} className="flex justify-center py-1">
                      <div className="rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground">
                        {day}
                      </div>
                    </div>,
                  );
                }
              }

              const isMe = msg.sender_id === user?.id;
              const isSupportMessage = msg.sender_type === "staff";
              const isNew = msg.id.startsWith("temp-") || (new Date().getTime() - new Date(msg.created_at).getTime() < 3000);
              const senderLabel = isMe ? "You" : (msg.sender_name || (isSupportMessage ? activeSupportName : customerLabel));

              const showJoinedNotice = userType === "customer"
                ? isSupportMessage && msg.id === firstSupportMessageId
                : !isSupportMessage && msg.id === firstCustomerMessageId;

              timeline.push(
                <div key={msg.id} className="space-y-1">
                  {showJoinedNotice ? (
                    <div className="flex justify-center py-1">
                      <div className="rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground">
                        {senderLabel} joined the conversation
                      </div>
                    </div>
                  ) : null}

                  <div className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""} ${isNew ? "animate-in fade-in slide-in-from-bottom-2 duration-300" : ""}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isMe ? "bg-[#ff5a00]" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`}>
                      {isMe ? <User className="h-4 w-4 text-white" /> : <Headset className="h-4 w-4 text-white" />}
                    </div>
                    <div className={`flex-1 ${isMe ? "text-right" : ""}`}>
                      {msg.reply_to ? (
                        <div className={`text-[10px] text-muted-foreground mb-1 flex items-center gap-1 ${isMe ? "justify-end" : ""}`}>
                          <Reply className="h-2.5 w-2.5" />
                          <span className="max-w-[150px] truncate">{msg.reply_to.message}</span>
                        </div>
                      ) : null}

                      <div className="text-[11px] mb-1 font-semibold text-slate-900">
                        {senderLabel} · <span className="font-normal text-muted-foreground">{formatTime(msg.created_at)}</span>
                      </div>

                      <div className={`rounded-2xl px-3 py-2 text-sm inline-block text-left max-w-[85%] ${isMe ? "bg-[#ff5a00] text-white rounded-tr-sm" : "bg-[#e7e7ea] text-slate-900 rounded-tl-sm"}`}>
                        <div className="whitespace-pre-wrap">{msg.message}</div>

                        {msg.attachments && msg.attachments.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((att, i) => (
                              <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 text-xs underline ${isMe ? "text-white/90" : "opacity-80 hover:opacity-100"}`}>
                                {att.type === "image" ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                                {att.name}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      {!isClosed ? (
                        <button className={`text-[11px] text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1 ${isMe ? "ml-auto" : ""}`} onClick={() => setReplyTo(msg)}>
                          <Reply className="h-3 w-3" /> Reply
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>,
              );
            });

            return timeline;
          })()}

          {otherUserTyping ? (
            <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                {userType === "staff" ? <User className="h-4 w-4 text-white" /> : <Headset className="h-4 w-4 text-white" />}
              </div>
              <div className="flex-1">
                <div className="text-[11px] mb-1 font-semibold text-slate-900">
                  {headerPersonName} is typing...
                </div>
                <div className="rounded-2xl px-4 py-2 text-sm inline-block bg-[#e7e7ea]">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {!otherUserTyping && sortedMessages.length > 0 && sortedMessages[sortedMessages.length - 1]?.sender_id === user?.id && !isClosed ? (
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                {userType === "staff" ? <User className="h-4 w-4 text-white" /> : <Headset className="h-4 w-4 text-white" />}
              </div>
              <div className="flex-1">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {userType === "staff" ? "Customer will reply soon" : `${activeSupportName} will reply soon`}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </ScrollArea>

      {/* Input area */}
      {!isClosed ? (
        <div className="shrink-0 border-t p-3 bg-muted/30">
          {/* Reply indicator */}
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-muted rounded text-xs">
              <Reply className="h-3 w-3 text-muted-foreground" />
              <span className="flex-1 truncate text-muted-foreground">{replyTo.message?.slice(0, 50)}...</span>
              <button onClick={() => setReplyTo(null)} className="p-0.5 hover:bg-background rounded">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-1 bg-muted rounded-full px-2 py-1 text-xs">
                  {att.type === "image" ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  <span className="max-w-[80px] truncate">{att.name}</span>
                  <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Textarea
                className="min-h-[50px] max-h-[100px] pr-20 resize-none text-base sm:text-sm rounded-2xl"
                placeholder="Type your message..."
                value={draft}
                onChange={(e) => handleTyping(e.target.value)}
                onBlur={() => stopTyping()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Smile className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="end" side="top">
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJI_LIST.map((emoji) => (
                        <button key={emoji} className="h-8 w-8 hover:bg-muted rounded flex items-center justify-center text-lg" onClick={() => setDraft((p) => p + emoji)}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Paperclip className={`h-4 w-4 ${uploading ? "animate-pulse" : "text-muted-foreground"}`} />
                </Button>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFileUpload} />
              </div>
            </div>
            <Button 
              className="h-12 w-12 rounded-full p-0" 
              onClick={() => void sendMessage()} 
              disabled={sending || (!draft.trim() && attachments.length === 0)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t p-3 bg-muted/30 text-center">
          <div className="text-sm text-muted-foreground">
            This conversation has been {ticket.status}
          </div>
          {userType === "staff" && onStatusChange && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                supabase
                  .from("support_tickets")
                  .update({ status: "open" })
                  .eq("id", ticket.id)
                  .then(async () => {
                    await notifyRefundStatus("open");
                    onStatusChange("open");
                  });
              }}
            >
              Reopen Conversation
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

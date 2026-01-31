/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - support_ticket_messages table not in generated types yet
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      setMessages(enriched);
    };

    void fetchMessages();

    // Real-time subscription for messages
    const messagesChannel = supabase
      .channel(`ticket-messages-${ticket.id}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${ticket.id}` },
        (payload) => {
          console.log('[SupportChat] New message received:', payload.new);
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Check if message already exists
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) {
              console.log('[SupportChat] Message already exists, replacing optimistic');
              return prev.map(m => m.id.startsWith('temp-') && m.created_at === newMsg.created_at ? newMsg : m);
            }
            console.log('[SupportChat] Adding new message to list');
            const updated = [...prev, newMsg];
            // Trigger immediate scroll
            setTimeout(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTo({
                  top: scrollRef.current.scrollHeight,
                  behavior: 'smooth'
                });
              }
            }, 50);
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
      })
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const otherPresence = Object.values(state).find((presences: any) => {
          return presences.some((p: any) => p.user_id !== user?.id && p.typing);
        });
        setOtherUserTyping(!!otherPresence);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const typing = newPresences.some((p: any) => p.user_id !== user?.id && p.typing);
        if (typing) setOtherUserTyping(true);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const wasTyping = leftPresences.some((p: any) => p.user_id !== user?.id && p.typing);
        if (wasTyping) setOtherUserTyping(false);
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
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [ticket.id, user?.id, userType]);

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

  // Broadcast typing status
  const broadcastTyping = (isTyping: boolean) => {
    const channel = supabase.channel(`ticket-presence-${ticket.id}`);
    channel.track({
      user_id: user?.id,
      user_type: userType,
      typing: isTyping,
      online_at: new Date().toISOString(),
    });
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
      
      // Set timeout to stop typing indicator (1 second for faster feel)
      typingTimeoutRef.current = setTimeout(() => {
        broadcastTyping(false);
      }, 1000);
    } else {
      broadcastTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!user || (!draft.trim() && attachments.length === 0)) return;

    const messageText = draft.trim();
    setSending(true);
    setDraft("");
    
    // Stop typing indicator
    broadcastTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

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

      // Update ticket status if staff is replying
      if (userType === "staff" && ticket.status === "open") {
        await supabase
          .from("support_tickets")
          .update({ status: "in_progress" })
          .eq("id", ticket.id);
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
            <div className="text-sm font-medium text-white">{ticket.subject}</div>
            <div className="text-xs text-white/80 flex items-center gap-2">
              <Badge className={`text-[10px] px-1.5 py-0 ${
                ticket.status === "resolved" || ticket.status === "closed" 
                  ? "bg-green-100 text-green-700" 
                  : ticket.status === "in_progress" 
                  ? "bg-yellow-100 text-yellow-700" 
                  : "bg-blue-100 text-blue-700"
              }`}>
                {ticket.status}
              </Badge>
              {ticket.category && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/30 text-white">{ticket.category}</Badge>}
            </div>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 max-h-[600px] overflow-y-auto" ref={scrollRef}>
        <div className="space-y-4">
          {/* Initial ticket message - always from customer (left side) */}
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-orange-500 to-red-600">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] mb-1 font-semibold text-orange-600 dark:text-orange-400">
                Customer · <span className="font-normal text-muted-foreground">{formatTime(ticket.created_at)}</span>
              </div>
              <div className="rounded-2xl px-3 py-2 text-sm inline-block text-left max-w-[85%] bg-muted text-foreground rounded-tl-sm">
                <div className="whitespace-pre-wrap">{ticket.message}</div>
              </div>
            </div>
          </div>

          {/* Chat messages */}
          {messages.map((msg) => {
            // Customer messages always go left, Staff messages always go right
            const isStaff = msg.sender_type === "staff";
            const isNew = msg.id.startsWith('temp-') || (new Date().getTime() - new Date(msg.created_at).getTime() < 3000);
            return (
              <div key={msg.id} className={`flex gap-2 ${isStaff ? "flex-row-reverse" : ""} ${isNew ? "animate-in fade-in slide-in-from-bottom-2 duration-300" : ""}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  isStaff 
                    ? "bg-gradient-to-br from-blue-500 to-indigo-600" 
                    : "bg-gradient-to-br from-orange-500 to-red-600"
                }`}>
                  {isStaff ? <Headset className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-white" />}
                </div>
                <div className={`flex-1 ${isStaff ? "text-right" : ""}`}>
                  {/* Reply indicator */}
                  {msg.reply_to && (
                    <div className={`text-[11px] text-muted-foreground mb-1 flex items-center gap-1 ${isStaff ? "justify-end" : ""}`}>
                      <Reply className="h-3 w-3" />
                      <span className="max-w-[150px] truncate">{msg.reply_to.message}</span>
                    </div>
                  )}
                  
                  <div className={`text-[11px] mb-1 font-semibold ${isStaff ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}`}>
                    {msg.sender_name || (isStaff ? "Support Team" : "Customer")} · <span className="font-normal text-muted-foreground">{formatTime(msg.created_at)}</span>
                  </div>
                  
                  <div className={`rounded-2xl px-3 py-2 text-sm inline-block text-left max-w-[85%] ${
                    isStaff 
                      ? "bg-primary text-primary-foreground rounded-tr-sm" 
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.message}</div>
                    
                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map((att, i) => (
                          <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs underline opacity-80 hover:opacity-100">
                            {att.type === "image" ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                            {att.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Reply button */}
                  {!isClosed && (
                    <button className="text-[11px] text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1" onClick={() => setReplyTo(msg)}>
                      <Reply className="h-3 w-3" /> Reply
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {otherUserTyping && (
            <div className={`flex gap-2 ${userType === "staff" ? "" : "flex-row-reverse"} animate-in fade-in slide-in-from-bottom-1 duration-200`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                userType === "staff" 
                  ? "bg-gradient-to-br from-orange-500 to-red-600" 
                  : "bg-gradient-to-br from-blue-500 to-indigo-600"
              }`}>
                {userType === "staff" ? <User className="h-4 w-4 text-white" /> : <Headset className="h-4 w-4 text-white" />}
              </div>
              <div className={`flex-1 ${userType === "staff" ? "" : "text-right"}`}>
                <div className="text-[11px] mb-1 font-semibold text-blue-600 dark:text-blue-400">
                  {userType === "staff" ? "Customer" : "Support"} is typing...
                </div>
                <div className="rounded-2xl px-4 py-2 text-sm inline-block bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Waiting indicator */}
          {!otherUserTyping && messages.length > 0 && messages[messages.length - 1]?.sender_type !== "staff" && userType === "customer" && !isClosed && (
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                <Headset className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Support will reply soon
                </div>
              </div>
            </div>
          )}
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
                className="min-h-[50px] max-h-[100px] pr-20 resize-none text-sm rounded-2xl"
                placeholder="Type your message..."
                value={draft}
                onChange={(e) => handleTyping(e.target.value)}
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
                  .then(() => onStatusChange("open"));
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

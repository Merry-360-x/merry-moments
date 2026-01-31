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
  Download,
  Headset,
  User,
  Clock,
  Check,
  CheckCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  priority?: string;
  created_at: string;
};

type SupportChatProps = {
  ticket: SupportTicket;
  userType: "customer" | "staff";
  onClose?: () => void;
  onStatusChange?: (status: string) => void;
  compact?: boolean;
};

const EMOJI_LIST = ["👍", "👎", "❤️", "😊", "😢", "😮", "🎉", "🙏", "✅", "❌", "⚠️", "📎", "💡", "🔥", "👀", "🤔"];

export function SupportChat({ ticket, userType, onClose, onStatusChange, compact = false }: SupportChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<{ url: string; name: string; type: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        // If table doesn't exist, start with initial message from ticket
        setMessages([]);
        return;
      }

      // Enrich with reply_to data
      const msgs = (data || []) as unknown as Message[];
      const enriched = msgs.map((msg: Message) => {
        if (msg.reply_to_id) {
          const replyMsg = msgs.find((m: Message) => m.id === msg.reply_to_id);
          return { ...msg, reply_to: replyMsg || null };
        }
        return msg;
      });

      setMessages(enriched);
    };

    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`ticket-messages-${ticket.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${ticket.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Get sender name
  const getSenderName = async () => {
    if (!user?.id) return userType === "staff" ? "Support Team" : "Customer";
    

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();
    
    return (profile as { full_name: string | null } | null)?.full_name || user.email?.split("@")[0] || (userType === "staff" ? "Support Team" : "Customer");
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!user?.id) return;

    setSending(true);
    try {
      const senderName = await getSenderName();


      const { error } = await supabase.from("support_ticket_messages").insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_type: userType,
        sender_name: senderName,
        message: newMessage.trim(),
        reply_to_id: replyTo?.id || null,
        attachments: attachments,
      });

      if (error) throw error;

      setNewMessage("");
      setReplyTo(null);
      setAttachments([]);

      // Update ticket status if staff is replying
      if (userType === "staff" && ticket.status === "open") {

        await supabase
          .from("support_tickets")
          .update({ status: "in_progress" })
          .eq("id", ticket.id);
        onStatusChange?.("in_progress");
      }
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setSending(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${ticket.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("support-attachments")
        .upload(fileName, file);

      if (uploadError) {
        // If bucket doesn't exist, show message
        console.error("Upload failed:", uploadError);
        alert("File upload is not configured. Please contact support.");
        return;
      }

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
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Add emoji
  const addEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    }
  };

  const isOwnMessage = (msg: Message) => msg.sender_id === user?.id;

  return (
    <div className={`flex flex-col ${compact ? "h-full" : "h-[500px]"} bg-background`}>
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{ticket.subject}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px]">{ticket.category || "general"}</Badge>
              <Badge 
                className={`text-[10px] ${
                  ticket.status === "resolved" ? "bg-green-100 text-green-800" :
                  ticket.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                  ticket.status === "closed" ? "bg-gray-100 text-gray-800" :
                  "bg-blue-100 text-blue-800"
                }`}
              >
                {ticket.status}
              </Badge>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {/* Initial ticket message */}
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1 max-w-[80%]">
              <div className="text-xs text-muted-foreground mb-1">
                Customer · {formatTime(ticket.created_at)}
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-sm whitespace-pre-wrap">{ticket.message}</div>
              </div>
            </div>
          </div>

          {/* Chat messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${isOwnMessage(msg) ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.sender_type === "staff"
                    ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                    : "bg-primary"
                }`}
              >
                {msg.sender_type === "staff" ? (
                  <Headset className="h-4 w-4 text-white" />
                ) : (
                  <User className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
              <div className={`flex-1 max-w-[80%] ${isOwnMessage(msg) ? "text-right" : ""}`}>
                <div className="text-xs text-muted-foreground mb-1">
                  <span className={msg.sender_type === "staff" ? "text-blue-600 dark:text-blue-400 font-medium" : ""}>
                    {msg.sender_name || (msg.sender_type === "staff" ? "Support" : "Customer")}
                  </span>{" "}
                  · {formatTime(msg.created_at)}
                </div>

                {/* Reply indicator */}
                {msg.reply_to && (
                  <div className="bg-muted/50 rounded px-2 py-1 mb-1 text-xs text-muted-foreground border-l-2 border-primary">
                    <Reply className="h-3 w-3 inline mr-1" />
                    {msg.reply_to.message?.slice(0, 50)}...
                  </div>
                )}

                <div
                  className={`rounded-lg p-3 inline-block text-left ${
                    isOwnMessage(msg)
                      ? "bg-primary text-primary-foreground"
                      : msg.sender_type === "staff"
                      ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                      : "bg-muted"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.message}</div>

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs underline hover:no-underline"
                        >
                          {att.type === "image" ? (
                            <>
                              <ImageIcon className="h-3 w-3" />
                              <img src={att.url} alt={att.name} className="max-w-[150px] max-h-[100px] rounded mt-1" />
                            </>
                          ) : (
                            <>
                              <FileText className="h-3 w-3" />
                              {att.name}
                              <Download className="h-3 w-3" />
                            </>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reply button */}
                {!isOwnMessage(msg) && ticket.status !== "resolved" && ticket.status !== "closed" && (
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1"
                    onClick={() => setReplyTo(msg)}
                  >
                    <Reply className="h-3 w-3" /> Reply
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex items-center gap-2 py-4 justify-center">
              <div className="flex-1 h-px bg-border max-w-[80px]" />
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {userType === "staff" ? "Awaiting your response" : "Awaiting support response"}
              </span>
              <div className="flex-1 h-px bg-border max-w-[80px]" />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      {ticket.status !== "resolved" && ticket.status !== "closed" ? (
        <div className="shrink-0 border-t p-3 bg-muted/30">
          {/* Reply indicator */}
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded text-sm">
              <Reply className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate text-muted-foreground">
                Replying to: {replyTo.message?.slice(0, 40)}...
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs">
                  {att.type === "image" ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  <span className="max-w-[100px] truncate">{att.name}</span>
                  <button onClick={() => removeAttachment(i)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                className="min-h-[60px] max-h-[120px] pr-20 resize-none"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              
              {/* Action buttons inside textarea */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                {/* Emoji picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Smile className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="end">
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          className="h-8 w-8 hover:bg-muted rounded flex items-center justify-center text-lg"
                          onClick={() => addEmoji(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* File upload */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Paperclip className={`h-4 w-4 ${uploading ? "animate-pulse" : "text-muted-foreground"}`} />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            <Button
              className="shrink-0 h-auto"
              onClick={sendMessage}
              disabled={sending || (!newMessage.trim() && attachments.length === 0)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t p-3 bg-muted/30 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {ticket.status === "resolved" ? (
              <>
                <CheckCheck className="h-4 w-4 text-green-600" />
                This ticket has been resolved
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                This ticket is closed
              </>
            )}
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
              Reopen Ticket
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

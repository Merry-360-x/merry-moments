/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - support_ticket_messages table not in generated types yet
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, ChevronLeft, ChevronDown, ChevronUp, Headset, Sparkles, X, Maximize2, Minimize2, Send, Paperclip, Smile, Reply, User, Image as ImageIcon, FileText, Clock, CheckCircle } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChatSparkIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTripCart } from "@/hooks/useTripCart";

type Step = "home" | "ai" | "chat";

type AiMode = "starter" | "freeform" | "trip-form";

type AiRecommendation = {
  id: string;
  title: string;
  location?: string;
  currency?: string;
  price?: number;
  rating?: number;
  review_count?: number;
  item_type?: string;
  property_type?: string;
  image_url?: string;
  view_url?: string;
};

type AiAction = {
  type: string;
  label: string;
  referenceId?: string;
  itemType?: string;
  bookingId?: string;
  orderId?: string;
  url?: string;
  variant?: string;
};

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  recommendations?: AiRecommendation[];
  actions?: AiAction[];
};

type TripPlanningForm = {
  leavingFrom: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  nights: string;
  travelers: string;
  budget: string;
  tripType: string;
  notes: string;
};

type TripSummary = TripPlanningForm & {
  submittedAt: string;
};

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

const EMOJI_LIST = ["�", "🤣", "😆", "😄", "😁", "😊", "🥰", "😍", "🤩", "😎", "🥳", "🤪", "😜", "😝", "🤗", "🤭", "👍", "👎", "❤️", "💖", "💯", "🎉", "🎊", "🙌", "👏", "🙏", "✅", "❌", "⚠️", "📎", "💡", "🔥", "✨", "⭐", "💪", "👀", "🤔", "😮", "😢", "🥺"];

const AI_STARTER_OPTIONS = [
  {
    id: "plan_trip",
    label: "Plan a trip",
    description: "Answer a few questions and get a trip plan",
  },
  {
    id: "ask_platform",
    label: "What is Merry360X?",
    description: "Learn what Merry can help you book",
    prompt: "What is Merry360X and what can you help me book?",
  },
  {
    id: "find_cheapest",
    label: "Find the cheapest",
    description: "Start with lower-budget options",
    prompt: "Find the cheapest trip options you can recommend for me.",
  },
  {
    id: "ask_freely",
    label: "Ask about Merry360X",
    description: "Ask anything related to Merry360X freely",
  },
];

const EMPTY_TRIP_FORM: TripPlanningForm = {
  leavingFrom: "",
  destination: "",
  checkIn: "",
  checkOut: "",
  nights: "",
  travelers: "2",
  budget: "",
  tripType: "",
  notes: "",
};

const MONTH_INDEX: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

export default function SupportCenterLauncher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { addToCart } = useTripCart();
  const aiSessionId = useMemo(() => {
    const key = "merry360x_ai_session_id";
    try {
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const generated = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(key, generated);
      return generated;
    } catch {
      return `sess_${Date.now()}`;
    }
  }, []);

  const formatRecommendationPrice = (price?: number, currency?: string) => {
    if (!Number.isFinite(price as number) || !price || price <= 0) return "Price on request";
    const safeCurrency = currency || "RWF";
    return `${Math.round(price).toLocaleString()} ${safeCurrency}`;
  };

  const getRecommendationItemType = (recommendation: AiRecommendation) => {
    const itemType = String(recommendation?.item_type || "").toLowerCase();
    if (itemType === "tour" || itemType === "tour_package" || itemType === "transport_vehicle") {
      return itemType;
    }
    return "property";
  };

  const getRecommendationViewUrl = (recommendation: AiRecommendation) => {
    if (recommendation?.view_url) return recommendation.view_url;

    switch (getRecommendationItemType(recommendation)) {
      case "tour":
      case "tour_package":
        return `/tours/${encodeURIComponent(recommendation.id)}`;
      case "transport_vehicle":
        return "/transport";
      default:
        return `/properties/${encodeURIComponent(recommendation.id)}`;
    }
  };

  const getRecommendationTypeLabel = (recommendation: AiRecommendation) => {
    const itemType = getRecommendationItemType(recommendation);
    if (recommendation?.property_type) return recommendation.property_type;
    if (itemType === "tour") return "Tour";
    if (itemType === "tour_package") return "Tour package";
    if (itemType === "transport_vehicle") return "Transport";
    return "Stay";
  };

  const getRecommendationSectionTitle = (itemType: string) => {
    switch (itemType) {
      case "tour":
        return "Available tours";
      case "tour_package":
        return "Available tour packages";
      case "transport_vehicle":
        return "Available transport";
      default:
        return "Available stays";
    }
  };

  const getRecommendationSectionHint = (itemType: string) => {
    switch (itemType) {
      case "tour":
        return "Tours that fit this trip";
      case "tour_package":
        return "Packages and event-style experiences for this destination";
      case "transport_vehicle":
        return "Transport to add to the same trip";
      default:
        return "Places available around the destination you picked";
    }
  };

  const groupRecommendations = (recommendations: AiRecommendation[] = []) => {
    const orderedTypes = ["property", "tour", "tour_package", "transport_vehicle"];
    const groups = new Map<string, AiRecommendation[]>();

    recommendations.forEach((recommendation) => {
      const itemType = getRecommendationItemType(recommendation);
      const current = groups.get(itemType) || [];
      current.push(recommendation);
      groups.set(itemType, current);
    });

    return orderedTypes
      .map((itemType) => ({
        itemType,
        title: getRecommendationSectionTitle(itemType),
        hint: getRecommendationSectionHint(itemType),
        items: groups.get(itemType) || [],
      }))
      .filter((section) => section.items.length > 0);
  };

  const getRecommendationBadge = (recommendation: AiRecommendation, itemType: string, index: number, featured = false) => {
    if (featured && index === 0) return "Recommended now";
    if (itemType === "transport_vehicle" && index === 0) {
      return Number(recommendation.price || 0) > 0 ? "Transport pick" : "Add transport";
    }
    if (Number(recommendation.rating || 0) > 0 && index === 0) return "Top rated";
    if (Number(recommendation.price || 0) > 0 && index === 0) return "Best price";
    return getRecommendationTypeLabel(recommendation);
  };

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("home");
  const [expanded, setExpanded] = useState(true);
  const [homePromptVisible, setHomePromptVisible] = useState(false);

  // AI chat
  const [aiMessages, setAiMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: "Hi, I’m Merry. Tell me what you want to book and I’ll help you move from planning to cart and checkout." },
  ]);
  const [aiMode, setAiMode] = useState<AiMode>("starter");
  const [aiDraft, setAiDraft] = useState("");
  const [tripForm, setTripForm] = useState<TripPlanningForm>(EMPTY_TRIP_FORM);
  const [tripSummary, setTripSummary] = useState<TripSummary | null>(null);
  const [tripSummaryExpanded, setTripSummaryExpanded] = useState(false);
  const [pendingTripPromptText, setPendingTripPromptText] = useState("");
  const [aiSending, setAiSending] = useState(false);
  const [aiConversationFeedback, setAiConversationFeedback] = useState<"up" | "down" | null>(null);
  const [aiFeedbackDraftType, setAiFeedbackDraftType] = useState<"up" | "down" | null>(null);
  const [aiFeedbackComment, setAiFeedbackComment] = useState("");
  const [aiRatingSending, setAiRatingSending] = useState(false);
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
  const [staffTyping, setStaffTyping] = useState(false);
  const [activeSupportName, setActiveSupportName] = useState<string>("Support Team");
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenMessageIdRef = useRef<string | null>(null);
  const messagesChannelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
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

  useEffect(() => {
    if (location.pathname !== "/" || open) {
      setHomePromptVisible(false);
      return;
    }

    setHomePromptVisible(true);
    const timeout = window.setTimeout(() => {
      setHomePromptVisible(false);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [location.pathname, open]);

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

  const formatTripDate = (value: string) => {
    if (!value) return "Flexible";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const sanitizeLocationValue = (value: string) => value
    .replace(/\b(for|with|on|starting|start|arriving|arrive|check|budget|nights?|days?|people|guests|travelers|travellers|adults|airport|pickup)\b.*$/i, "")
    .replace(/[,.]+$/g, "")
    .trim();

  const formatIsoDate = (date: Date) => {
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const parseNaturalDateToken = (monthToken: string, dayToken: string, yearToken?: string) => {
    const monthIndex = MONTH_INDEX[monthToken.toLowerCase()];
    if (monthIndex == null) return "";

    const currentYear = new Date().getFullYear();
    const explicitYear = yearToken ? Number(yearToken) : currentYear;
    const parsed = new Date(explicitYear, monthIndex, Number(dayToken));
    if (Number.isNaN(parsed.getTime())) return "";

    if (!yearToken) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (parsed < today) {
        parsed.setFullYear(parsed.getFullYear() + 1);
      }
    }

    return formatIsoDate(parsed);
  };

  const extractMentionedDates = (text: string) => {
    const found = new Set<string>();
    const isoMatches = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
    isoMatches.forEach((match) => found.add(match));

    const slashMatches = text.match(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g) || [];
    slashMatches.forEach((match) => {
      const [month, day, year] = match.split("/");
      const numericYear = year ? Number(year.length === 2 ? `20${year}` : year) : new Date().getFullYear();
      const parsed = new Date(numericYear, Number(month) - 1, Number(day));
      const iso = formatIsoDate(parsed);
      if (iso) found.add(iso);
    });

    const naturalDateRegex = /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/gi;
    let match: RegExpExecArray | null;
    while ((match = naturalDateRegex.exec(text)) !== null) {
      const iso = parseNaturalDateToken(match[1], match[2], match[3]);
      if (iso) found.add(iso);
    }

    return Array.from(found).sort();
  };

  const mergeTripFormDetails = (current: TripPlanningForm, incoming: Partial<TripPlanningForm>) => {
    const next = { ...current };
    (Object.keys(incoming) as Array<keyof TripPlanningForm>).forEach((key) => {
      const value = incoming[key];
      if (typeof value !== "string") return;
      const trimmed = value.trim();
      if (trimmed) {
        next[key] = trimmed;
      }
    });
    return next;
  };

  const inferTripFormFromText = (text: string): Partial<TripPlanningForm> => {
    const safeText = String(text || "").trim();
    if (!safeText) return {};

    const destinationMatch = safeText.match(/(?:to|towards|heading to|going to|visit|visiting|travel to|stay in|book in)\s+([a-zA-Z][a-zA-Z\s,-]{2,40})/i);
    const leavingFromMatch = safeText.match(/(?:from|leaving from|departing from|flying from)\s+([a-zA-Z][a-zA-Z\s,-]{2,40})/i);
    const nightsMatch = safeText.match(/(\d{1,2})\s*nights?/i);
    const travelersMatch = safeText.match(/(\d{1,2})\s*(?:people|persons|guests|travelers|travellers|adults|pax)/i);
    const budgetMatch = safeText.match(/(budget|cheap|cheapest|mid-range|midrange|luxury|premium|\$\s?\d+[\d,]*|under\s+\$?\s?\d+[\d,]*|within\s+\$?\s?\d+[\d,]*)/i);
    const dateMatches = extractMentionedDates(safeText);

    let tripType = "";
    if (/cheap|cheapest|budget/i.test(safeText)) tripType = "Budget";
    if (/luxury|premium/i.test(safeText)) tripType = "Luxury";
    if (/family|kids|children/i.test(safeText)) tripType = tripType || "Family";
    if (/romantic|honeymoon|couple/i.test(safeText)) tripType = tripType || "Romantic";
    if (/business|work|conference/i.test(safeText)) tripType = tripType || "Business";

    const checkIn = dateMatches[0] || "";
    const checkOut = dateMatches[1] || "";
    let inferredNights = nightsMatch?.[1] || "";
    if (!inferredNights && checkIn && checkOut) {
      const start = new Date(`${checkIn}T00:00:00`);
      const end = new Date(`${checkOut}T00:00:00`);
      const diffNights = Math.round((end.getTime() - start.getTime()) / 86400000);
      if (diffNights > 0) inferredNights = String(diffNights);
    }

    return {
      leavingFrom: sanitizeLocationValue(leavingFromMatch?.[1] || ""),
      destination: sanitizeLocationValue(destinationMatch?.[1] || ""),
      checkIn,
      checkOut,
      nights: inferredNights,
      travelers: travelersMatch?.[1] || "",
      budget: budgetMatch?.[1]?.trim() || "",
      tripType,
      notes: safeText,
    };
  };

  const looksLikeComplexTripQuestion = (text: string) => {
    const safeText = String(text || "").toLowerCase().trim();
    if (!safeText) return false;

    const hasTripIntent = /plan|trip|itinerary|travel|vacation|holiday|book.*trip|organize.*trip/.test(safeText);
    const detailHits = [
      /to\s+[a-z]/.test(safeText) || /destination|city|heading|visit|stay in/.test(safeText),
      /from\s+[a-z]/.test(safeText) || /leaving from|departing from|flying from/.test(safeText),
      /date|dates|check in|check out|arrive|arrival|departure|depart|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}/.test(safeText),
      /night|nights|days|day/.test(safeText),
      /budget|cheap|cheapest|luxury|premium|\$\s?\d|under\s+\$?\s?\d|within\s+\$?\s?\d/.test(safeText),
      /people|persons|guests|travelers|travellers|adults|pax/.test(safeText),
      /stay|hotel|tour|transport|airport|pickup|driver|car rental/.test(safeText),
    ].filter(Boolean).length;

    return detailHits >= 4 || (hasTripIntent && detailHits >= 3);
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

    const lastStaffMessage = [...enriched].reverse().find((m) => m.sender_type === "staff" && m.sender_name);
    if (lastStaffMessage?.sender_name) {
      setActiveSupportName(lastStaffMessage.sender_name);
    }

    setMessages(enriched);
  };

  const handleIncomingMessage = useCallback((newMsg: Message) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === newMsg.id);
      if (exists) return prev;

      if (newMsg.sender_type === "staff" && newMsg.sender_name) {
        setActiveSupportName(newMsg.sender_name);
      }

      if (newMsg.sender_type === "staff") {
        if (!open || step !== "chat") {
          setUnreadCount((count) => count + 1);
        } else {
          toast({
            title: `New message from ${newMsg.sender_name || "Support Team"}`,
            description: (newMsg.message || "").slice(0, 80),
          });
        }
      }

      const updated = [...prev, newMsg];
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 10);

      return updated;
    });
  }, [open, step, toast]);

  // Real-time subscription
  useEffect(() => {
    if (!activeTicket) return;

    // Messages channel
    const messagesChannel = supabase
      .channel(`ticket-messages-${activeTicket.id}`, {
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
          console.log('[CustomerChat] Broadcast message received:', payload);
          const newMsg = payload as Message;
          console.log('[CustomerChat] Adding broadcast message instantly');
          handleIncomingMessage(newMsg);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${activeTicket.id}` },
        (payload) => {
          console.log('[CustomerChat] DB change received:', payload.new);
          const newMsg = payload.new as Message;
          console.log('[CustomerChat] Adding message from DB change');
          handleIncomingMessage(newMsg);
        }
      )
      .subscribe((status) => {
        console.log('[CustomerChat] Messages channel status:', status);
      });

    // Presence channel for typing
    const presenceChannel = supabase
      .channel(`ticket-presence-${activeTicket.id}`, {
        config: {
          presence: { key: user?.id || 'anonymous' },
        },
      });
    
    // Store ref immediately for broadcasting
    presenceChannelRef.current = presenceChannel;
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const staffPresence = Object.values(state).find((presences: any) => {
          return presences.some((p: any) => p.user_type === 'staff' && p.typing);
        });
        setStaffTyping(!!staffPresence);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const typing = newPresences.some((p: any) => p.user_type === 'staff' && p.typing);
        if (typing) setStaffTyping(true);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const wasTyping = leftPresences.some((p: any) => p.user_type === 'staff' && p.typing);
        if (wasTyping) setStaffTyping(false);
      })
      .subscribe(async (status) => {
        console.log('[CustomerChat] Presence channel status:', status);
        if (status === 'SUBSCRIBED' && user) {
          await presenceChannel.track({
            user_id: user.id,
            user_type: 'customer',
            typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      console.log('[CustomerChat] Cleaning up channels');
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(presenceChannel);
      messagesChannelRef.current = null;
      presenceChannelRef.current = null;
    };
  }, [activeTicket, user, handleIncomingMessage]);

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
  }, [messages, staffTyping]);

  // Separate effect to immediately scroll when typing starts
  useEffect(() => {
    if (staffTyping && scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 50);
    }
  }, [staffTyping]);

  // Initialize chat when step changes
  useEffect(() => {
    if (step === "chat") {
      void initializeChat();
      setUnreadCount(0); // Clear unread count when entering chat
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Broadcast typing status
  const broadcastTyping = (isTyping: boolean) => {
    if (presenceChannelRef.current && user) {
      presenceChannelRef.current.track({
        user_id: user.id,
        user_type: 'customer',
        typing: isTyping,
        online_at: new Date().toISOString(),
      });
    }
  };

  // Handle typing with faster response
  const handleTyping = (value: string) => {
    setDraft(value);
    
    if (value.length > 0) {
      broadcastTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Faster timeout (1 second instead of 2)
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

        // Send email notification to support team
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

        // Send confirmation email to customer
        fetch("/api/support-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ticket_confirmation",
            ticketId: ticket.id,
            category: "general",
            subject: messageText.slice(0, 50),
            message: messageText,
            userName,
            userEmail: user.email,
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

      // Broadcast message for instant delivery to staff
      if (messagesChannelRef.current) {
        await messagesChannelRef.current.send({
          type: 'broadcast',
          event: 'new-message',
          payload: savedMsg
        });
      }

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
  const getAiRequestHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    return {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
  };

  const parseAiResponse = (out: any) => {
    const reply = typeof out?.reply === "string" ? out.reply : "Please try again.";
    const recommendations: AiRecommendation[] = Array.isArray(out?.recommendations)
      ? out.recommendations
          .filter((x: unknown) => x && typeof x === "object" && typeof (x as { id?: unknown }).id === "string")
          .map((x: any) => ({
            id: String(x.id),
            title: String(x.title || "Untitled"),
            location: x.location ? String(x.location) : undefined,
            currency: x.currency ? String(x.currency) : undefined,
            price: Number(x.price || 0),
            rating: Number(x.rating || 0),
            review_count: Number(x.review_count || 0),
            item_type: x.item_type ? String(x.item_type) : undefined,
            property_type: x.property_type ? String(x.property_type) : undefined,
            image_url: x.image_url ? String(x.image_url) : undefined,
            view_url: x.view_url ? String(x.view_url) : undefined,
          }))
          .slice(0, 8)
      : [];
    const actions: AiAction[] = Array.isArray(out?.actions)
      ? out.actions
          .filter((x: unknown) => x && typeof x === "object" && typeof (x as { type?: unknown }).type === "string")
          .map((x: any) => ({
            type: String(x.type),
            label: String(x.label || "Action"),
            referenceId: x.referenceId ? String(x.referenceId) : undefined,
            itemType: x.itemType ? String(x.itemType) : undefined,
            bookingId: x.bookingId ? String(x.bookingId) : undefined,
            orderId: x.orderId ? String(x.orderId) : undefined,
            url: x.url ? String(x.url) : undefined,
            variant: x.variant ? String(x.variant) : undefined,
          }))
      : [];
    return { reply, recommendations, actions };
  };

  const pushAssistantMessage = (content: string, actions: AiAction[] = []) => {
    setAiMessages((messages) => [...messages, { role: "assistant", content, actions }]);
    queueMicrotask(() => aiEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  };

  const updateTripForm = (field: keyof TripPlanningForm, value: string) => {
    setTripForm((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    if (!tripForm.checkIn) return;

    const start = new Date(`${tripForm.checkIn}T00:00:00`);
    if (Number.isNaN(start.getTime())) return;

    if (!tripForm.checkOut) {
      const nextDay = new Date(start);
      nextDay.setDate(nextDay.getDate() + 1);
      const suggestedCheckOut = nextDay.toISOString().slice(0, 10);
      setTripForm((current) => (current.checkOut ? current : { ...current, checkOut: suggestedCheckOut, nights: "1" }));
      return;
    }

    const end = new Date(`${tripForm.checkOut}T00:00:00`);
    if (Number.isNaN(end.getTime())) return;

    const diffNights = Math.round((end.getTime() - start.getTime()) / 86400000);
    setTripForm((current) => {
      if (diffNights <= 0) return current;
      const nextNights = String(diffNights);
      return current.nights === nextNights ? current : { ...current, nights: nextNights };
    });
  }, [tripForm.checkIn, tripForm.checkOut]);

  const buildTripPlanningPrompt = () => {
    const lines = [
      "Plan a trip for me using this form.",
      tripForm.leavingFrom.trim() ? `Leaving from: ${tripForm.leavingFrom.trim()}` : "",
      tripForm.destination.trim() ? `Heading to: ${tripForm.destination.trim()}` : "",
      tripForm.checkIn ? `Start date: ${tripForm.checkIn}` : "",
      tripForm.checkOut ? `End date: ${tripForm.checkOut}` : "",
      tripForm.nights.trim() ? `Nights: ${tripForm.nights.trim()}` : "",
      tripForm.travelers.trim() ? `Travelers: ${tripForm.travelers.trim()}` : "",
      tripForm.budget.trim() ? `Budget: ${tripForm.budget.trim()}` : "",
      tripForm.tripType.trim() ? `Trip style: ${tripForm.tripType.trim()}` : "",
      tripForm.notes.trim() ? `Extra notes: ${tripForm.notes.trim()}` : "",
      "Please recommend the best plan, the route, and booking-ready options for stays, tours, or transport.",
    ].filter(Boolean);

    return lines.join("\n");
  };

  const hasTripFormMinimum = tripForm.destination.trim().length > 0;

  const addRecommendationToTripCart = async (recommendation: AiRecommendation, goToCheckout = false) => {
    if (!recommendation?.id || aiSending) return;
    setAiSending(true);
    try {
      const added = await addToCart(getRecommendationItemType(recommendation), recommendation.id, 1);
      if (!added) return;

      pushAssistantMessage(
        `${recommendation.title} is now in your Trip Cart. ${goToCheckout ? "I’m taking you to checkout next." : "You can keep browsing or open your cart when you’re ready."}`,
        [
          { type: "open_url", label: "Open Trip Cart", url: "/trip-cart", variant: "secondary" },
          { type: "open_url", label: "Go to Checkout", url: "/checkout?mode=cart", variant: "primary" },
        ],
      );

      if (goToCheckout) {
        navigate("/checkout?mode=cart");
        setOpen(false);
      }
    } finally {
      setAiSending(false);
    }
  };

  const sendAi = async (overrideText?: string, options?: { skipTripPrompt?: boolean }) => {
    const text = String(overrideText ?? aiDraft).trim();
    if (!text || aiSending) return;

    if (!options?.skipTripPrompt && aiMode !== "trip-form" && looksLikeComplexTripQuestion(text)) {
      setAiMode("freeform");
      setPendingTripPromptText(text);
      setTripForm((current) => mergeTripFormDetails(current, inferTripFormFromText(text)));
      pushAssistantMessage(
        "This question has several trip details. Do you want to switch to the trip planner form so I can organize the dates, city, nights, budget, and route properly?",
        [
          { type: "open_trip_form", label: "Yes" , variant: "primary" },
          { type: "continue_freeform", label: "No", variant: "secondary" },
        ],
      );
      return;
    }

    if (overrideText == null) setAiDraft("");
    setAiMode("freeform");
    const next: ChatMsg[] = [...aiMessages, { role: "user" as const, content: text }];
    const compactHistory = next
      .slice(-6)
      .map((m) => ({ role: m.role, content: String(m.content || "").slice(0, 260) }));
    setAiMessages(next);
    setAiSending(true);
    try {
      const headers = await getAiRequestHeaders();
      const r = await fetch("/api/ai-trip-advisor", {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: compactHistory, userId: user?.id ?? null, sessionId: aiSessionId, channel: "web" }),
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error("AI request failed");
      const { reply, recommendations, actions } = parseAiResponse(out);
      setAiMessages((m) => [...m, { role: "assistant", content: reply, recommendations, actions }]);
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

  const submitTripPlanForm = async () => {
    if (!hasTripFormMinimum || aiSending) return;
    setTripSummary({ ...tripForm, submittedAt: new Date().toISOString() });
    setTripSummaryExpanded(false);
    setPendingTripPromptText("");
    await sendAi(buildTripPlanningPrompt(), { skipTripPrompt: true });
  };

  const handleAiStarter = async (optionId: string) => {
    const selected = AI_STARTER_OPTIONS.find((option) => option.id === optionId);
    if (!selected) return;

    if (optionId === "plan_trip") {
      setAiMode("trip-form");
      return;
    }

    if (optionId === "ask_freely") {
      setAiMode("freeform");
      return;
    }

    if (selected.prompt) {
      await sendAi(selected.prompt);
    }
  };

  const runAiAction = async (action: AiAction) => {
    if (!action?.type || aiSending) return;
    if (action.type === "open_trip_form") {
      setAiMode("trip-form");
      return;
    }
    if (action.type === "continue_freeform") {
      const deferredText = pendingTripPromptText.trim();
      setPendingTripPromptText("");
      if (deferredText) {
        await sendAi(deferredText, { skipTripPrompt: true });
      }
      return;
    }
    if (action.type === "add_to_trip_cart" && action.referenceId) {
      await addRecommendationToTripCart({
        id: action.referenceId,
        title: action.label.replace(/^Add\s+/i, "").replace(/\s+to Trip Cart$/i, "") || "This stay",
        property_type: action.itemType,
      });
      return;
    }
    if (action.type === "open_url" && action.url) {
      navigate(action.url);
      setOpen(false);
      return;
    }

    setAiSending(true);
    try {
      const headers = await getAiRequestHeaders();
      const r = await fetch("/api/ai-trip-advisor", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: action.type,
          userId: user?.id ?? null,
          sessionId: aiSessionId,
          channel: "web",
          referenceId: action.referenceId,
          itemType: action.itemType,
          bookingId: action.bookingId,
          orderId: action.orderId,
        }),
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error("AI action failed");
      const { reply, recommendations, actions } = parseAiResponse(out);
      setAiMessages((m) => [...m, { role: "assistant", content: reply, recommendations, actions }]);
      queueMicrotask(() => aiEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    } catch (e) {
      logError("aiTripAdvisor.action", e);
      toast({ variant: "destructive", title: "Action unavailable", description: "Please try again in a moment." });
    } finally {
      setAiSending(false);
    }
  };

  const submitAiFeedback = async (feedbackType: "up" | "down", comment = "") => {
    if (aiRatingSending || aiConversationFeedback !== null) return;
    setAiRatingSending(true);
    try {
      const r = await fetch("/api/ai-trip-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rate_conversation",
          feedbackType,
          comment,
          userId: user?.id ?? null,
          sessionId: aiSessionId,
          channel: "web",
        }),
      });
      if (!r.ok) throw new Error("Rating request failed");
      setAiConversationFeedback(feedbackType);
      setAiFeedbackDraftType(null);
      setAiFeedbackComment("");
      toast({ title: "Thanks", description: "Your AI chat feedback was saved." });
    } catch (e) {
      logError("aiConversationRating", e);
      toast({
        variant: "destructive",
        title: "Rating unavailable",
        description: "Please try rating again in a moment.",
      });
    } finally {
      setAiRatingSending(false);
    }
  };

  // Dynamic sizing
  const isHomeStep = step === "home";
  const popupWidth = expanded
    ? "w-[calc(100vw-1.25rem)] sm:w-[min(66.666vw,72rem)]"
    : "w-[calc(100vw-1.25rem)] sm:w-[28rem]";
  const popupAvailableHeight = "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 1.5rem)";
  const popupDefaultHeight = isHomeStep ? (expanded ? Math.round(window.innerHeight * 0.66666) : 360) : expanded ? Math.round(window.innerHeight * 0.66666) : 600;
  const popupHeight = `min(${popupDefaultHeight}px, ${popupAvailableHeight})`;

  const autoCloseWarning = getAutoCloseWarning();
  const shouldShowAiRating = aiMessages.some((m, idx) => idx > 0 && m.role === "assistant") && aiConversationFeedback === null;
  const showAiStarter = aiMode === "starter" && aiMessages.length <= 1;
  const showTripForm = aiMode === "trip-form";
  const aiInputPlaceholder = aiMode === "freeform"
    ? "Ask anything related to Merry360X, trips, stays, tours, transport, or checkout..."
    : aiMode === "trip-form"
      ? "Use the trip form above or type a question here..."
      : "Choose one of the guided options below or ask anything related to Merry360X...";

  return (
    <>
      <div
        className={`pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom,0px)+6.85rem)] right-[5.5rem] z-[109] max-w-[220px] rounded-full border border-primary/20 bg-white/96 px-3 py-2 text-[11px] font-medium text-slate-700 shadow-[0_18px_38px_rgba(15,23,42,0.14)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:bottom-[4.8rem] sm:right-[5.75rem] ${
          homePromptVisible ? "translate-x-0 scale-100 opacity-100" : "translate-x-5 scale-95 opacity-0"
        }`}
      >
        Ask your AI concierge anything
      </div>

      {/* Floating button */}
      <button
        type="button"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+6.25rem)] right-4 z-[110] h-[72px] w-[72px] bg-transparent text-slate-900 flex items-center justify-center transition-transform hover:scale-[1.03] sm:bottom-5 sm:right-5"
        aria-label="Open Merry AI and support"
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setStep("home");
            setActiveTicket(null);
            setMessages([]);
            setUnreadCount(0); // Clear unread count when opening
          }
        }}
      >
        {open ? (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_18px_36px_rgba(15,23,42,0.22)]">
            <X className="h-5 w-5" />
          </span>
        ) : (
          <>
            {/* Single ping ring */}
            <span className="absolute h-14 w-14 rounded-full animate-support-ping" style={{background: "linear-gradient(135deg, #f77e4e, #d63f6b)", pointerEvents: "none"}} />
            {/* Main icon */}
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full shadow-[0_8px_24px_rgba(234,89,51,0.28)]" style={{background: "linear-gradient(135deg, #f77e4e 0%, #e8495a 55%, #d63f6b 100%)"}}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                <path d="M12 3C7.03 3 3 6.69 3 11.2c0 2.4 1.1 4.56 2.87 6.1L5 21l3.9-1.56C9.87 19.8 10.92 20 12 20c4.97 0 9-3.69 9-8.2C21 6.69 16.97 3 12 3z" fill="white"/>
              </svg>
            </span>
          </>
        )}
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popup */}
      {open && (
        <>
          <button
            type="button"
            aria-label="Close support launcher"
            className="fixed inset-0 z-[98] bg-slate-950/34 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div
            className={`fixed left-1/2 top-1/2 z-[100] ${popupWidth} -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.38)] animate-in slide-in-from-bottom-2 fade-in duration-200 flex flex-col transition-all`}
            style={{
              height: popupHeight,
              maxHeight: popupAvailableHeight,
            }}
          >
          
          {step === "home" ? (
            /* Home menu */
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Meet Merry</div>
                  <div className="text-[11px] text-slate-500">AI concierge for booking, cart, and checkout</div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setExpanded(!expanded)} className="p-1 text-slate-400 hover:text-slate-700">
                    {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setStep("ai")}
                  className="w-full flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-3 text-left shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition-colors hover:border-primary/30"
                >
                    <div className="relative h-11 w-11 rounded-full border border-primary/10 bg-white flex items-center justify-center shrink-0 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                      <span className="absolute inset-0 rounded-full border border-white/70" />
                    <img src="/brand/logo.png" alt="Merry AI" className="relative h-6 w-6 object-contain" loading="eager" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-slate-900">Merry AI</div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                        <Sparkles className="h-2.5 w-2.5" />
                        AI
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">AI planner for stays, tours, transport, cart, and checkout</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStep("chat")}
                  className="w-full flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition-colors hover:bg-slate-50"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <Headset className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">Chat with Support</div>
                    <div className="text-xs text-slate-500">Get help from our team</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => window.open("https://wa.me/250796214719", "_blank", "noopener,noreferrer")}
                  className="w-full flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition-colors hover:bg-slate-50"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">WhatsApp</div>
                    <div className="text-xs text-slate-500">Message us on WhatsApp</div>
                  </div>
                </button>
              </div>
            </div>

          ) : step === "ai" ? (
            /* AI Trip Advisor */
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep("home")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                    <span className="absolute inset-0 rounded-full border border-white/70" />
                    <img src="/brand/logo.png" alt="Merry AI" className="relative h-6 w-6 object-contain" loading="eager" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900">Merry AI</div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                        <Sparkles className="h-2.5 w-2.5" />
                        AI powered
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">AI trip advisor and booking operator</div>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" onClick={() => setExpanded(!expanded)} className="p-1 text-slate-400 hover:text-slate-700">
                    {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <ScrollArea className="flex-1 px-4 py-3">
                <div className="space-y-3">
                  {aiMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        m.role === "user"
                          ? "ml-auto bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-900"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>
                      {m.role === "assistant" && Array.isArray(m.recommendations) && m.recommendations.length > 0 ? (() => {
                        const groupedRecommendations = groupRecommendations(m.recommendations);
                        const featuredRecommendation = m.recommendations[0];

                        return (
                          <div className="mt-3 space-y-3">
                            {featuredRecommendation ? (
                              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-white">
                                {featuredRecommendation.image_url ? (
                                  <img
                                    src={featuredRecommendation.image_url}
                                    alt={featuredRecommendation.title}
                                    className="h-28 w-full object-cover opacity-90"
                                    loading="lazy"
                                  />
                                ) : null}
                                <div className="px-3 py-3">
                                  <div className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90">
                                    {getRecommendationBadge(featuredRecommendation, getRecommendationItemType(featuredRecommendation), 0, true)}
                                  </div>
                                  <div className="mt-2 text-sm font-semibold text-white">{featuredRecommendation.title}</div>
                                  <div className="mt-1 text-[11px] text-white/70">{featuredRecommendation.location || "Selected destination"}</div>
                                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-white/80">
                                    <span className="font-semibold text-white">{formatRecommendationPrice(featuredRecommendation.price, featuredRecommendation.currency)}</span>
                                    <span>
                                      {Number.isFinite(featuredRecommendation.rating as number) && (featuredRecommendation.rating || 0) > 0
                                        ? `★ ${Number(featuredRecommendation.rating).toFixed(1)} (${featuredRecommendation.review_count || 0})`
                                        : getRecommendationTypeLabel(featuredRecommendation)}
                                    </span>
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigate(getRecommendationViewUrl(featuredRecommendation));
                                        setOpen(false);
                                      }}
                                      className="rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/10"
                                    >
                                      View details
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void addRecommendationToTripCart(featuredRecommendation)}
                                      className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-900 hover:bg-white/90"
                                    >
                                      Add to Trip Cart
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void addRecommendationToTripCart(featuredRecommendation, true)}
                                      className="rounded-full bg-emerald-400 px-3 py-1.5 text-[11px] font-medium text-slate-950 hover:bg-emerald-300"
                                    >
                                      Book now
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            {groupedRecommendations.map((section) => (
                              <div key={`${idx}-${section.itemType}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-xs font-semibold text-slate-900">{section.title}</div>
                                    <div className="mt-1 text-[11px] text-slate-500">{section.hint}</div>
                                  </div>
                                  <div className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-slate-500">
                                    {section.items.length} option{section.items.length > 1 ? "s" : ""}
                                  </div>
                                </div>

                                <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                                  {section.items.map((rec, sectionIndex) => (
                                    <div
                                      key={`${idx}-${section.itemType}-${rec.id}`}
                                      className="w-[168px] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white"
                                    >
                                      {rec.image_url ? (
                                        <img
                                          src={rec.image_url}
                                          alt={rec.title}
                                          className="h-24 w-full object-cover"
                                          loading="lazy"
                                        />
                                      ) : null}
                                      <div className="px-3 py-3">
                                        <div className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700">
                                          {getRecommendationBadge(rec, section.itemType, sectionIndex)}
                                        </div>
                                        <div className="mt-2 text-xs font-semibold text-slate-900 line-clamp-2">{rec.title}</div>
                                        <div className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                                          {rec.location || "Location not specified"}
                                        </div>
                                        <div className="mt-2 text-[11px] font-semibold text-slate-900">{formatRecommendationPrice(rec.price, rec.currency)}</div>
                                        <div className="mt-1 text-[10px] text-slate-500">
                                          {Number.isFinite(rec.rating as number) && (rec.rating || 0) > 0
                                            ? `★ ${Number(rec.rating).toFixed(1)} (${rec.review_count || 0})`
                                            : getRecommendationTypeLabel(rec)}
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              navigate(getRecommendationViewUrl(rec));
                                              setOpen(false);
                                            }}
                                            className="rounded-full border border-border px-2.5 py-1.5 text-[10px] font-medium hover:bg-muted"
                                          >
                                            View
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => void addRecommendationToTripCart(rec)}
                                            className="rounded-full bg-primary px-2.5 py-1.5 text-[10px] font-medium text-primary-foreground hover:bg-primary/90"
                                          >
                                            Add
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })() : null}
                      {m.role === "assistant" && Array.isArray(m.actions) && m.actions.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {m.actions.map((action) => (
                            <button
                              key={`${idx}-${action.type}-${action.referenceId || action.url || action.bookingId || action.orderId || action.label}`}
                              type="button"
                              onClick={() => void runAiAction(action)}
                              className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${action.variant === "primary" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {showAiStarter ? (
                    <div className="max-w-[92%] rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-900 shadow-sm">
                      <div className="text-sm font-semibold text-slate-900">What can I help with?</div>
                      <div className="mt-1 text-xs text-slate-500">Start fast with one of these options.</div>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {AI_STARTER_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => void handleAiStarter(option.id)}
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition-colors hover:border-slate-300 hover:bg-white"
                          >
                            <div className="text-sm font-medium text-slate-900">{option.label}</div>
                            <div className="mt-1 text-[11px] text-slate-500">{option.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {showTripForm ? (
                    <div className="max-w-[92%] rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-900 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Plan a trip</div>
                          <div className="mt-1 text-xs text-slate-500">Fill this once and Merry will build the trip from your details.</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAiMode("starter")}
                          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Back
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">Where are you heading?</label>
                          <Input value={tripForm.destination} onChange={(e) => updateTripForm("destination", e.target.value)} placeholder="Kigali, Musanze, Zanzibar, Nairobi..." className="h-10 text-sm" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">Leaving from</label>
                          <Input value={tripForm.leavingFrom} onChange={(e) => updateTripForm("leavingFrom", e.target.value)} placeholder="London, Kigali, Kampala..." className="h-10 text-sm" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">Trip style</label>
                          <Input value={tripForm.tripType} onChange={(e) => updateTripForm("tripType", e.target.value)} placeholder="Budget, family, luxury, romantic..." className="h-10 text-sm" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">Start date</label>
                          <Input type="date" value={tripForm.checkIn} onChange={(e) => updateTripForm("checkIn", e.target.value)} className="h-10 text-sm" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">End date</label>
                          <Input type="date" value={tripForm.checkOut} onChange={(e) => updateTripForm("checkOut", e.target.value)} className="h-10 text-sm" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">Nights</label>
                          <Input value={tripForm.nights} onChange={(e) => updateTripForm("nights", e.target.value)} inputMode="numeric" placeholder="3, 5, 7..." className="h-10 text-sm" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">Travelers</label>
                          <Input value={tripForm.travelers} onChange={(e) => updateTripForm("travelers", e.target.value)} inputMode="numeric" placeholder="2" className="h-10 text-sm" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">Budget</label>
                          <Input value={tripForm.budget} onChange={(e) => updateTripForm("budget", e.target.value)} placeholder="Budget, mid-range, luxury, or a number" className="h-10 text-sm" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">Anything else?</label>
                          <Textarea value={tripForm.notes} onChange={(e) => updateTripForm("notes", e.target.value)} placeholder="Airport pickup, gorilla trekking, cheapest route, family needs..." className="min-h-[84px] text-sm" />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" className="h-9 rounded-full px-4 text-xs" onClick={() => void submitTripPlanForm()} disabled={aiSending || !hasTripFormMinimum}>
                          Plan my trip
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            setTripForm(EMPTY_TRIP_FORM);
                            setAiMode("freeform");
                          }}
                          className="rounded-full border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Skip form and type instead
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {tripSummary ? (
                    <div className="max-w-[92%] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Current trip plan</div>
                          <div className="mt-1 text-[11px] text-slate-500">Edit the details or re-plan with the latest form.</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-[11px] text-slate-500">{formatTripDate(tripSummary.submittedAt.slice(0, 10))}</div>
                          <button
                            type="button"
                            onClick={() => setTripSummaryExpanded((current) => !current)}
                            className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-white"
                          >
                            <span className="inline-flex items-center gap-1">
                              {tripSummaryExpanded ? "Hide" : "Details"}
                              {tripSummaryExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </span>
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-700">
                        <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-900">{tripSummary.destination || "Destination pending"}</span>
                        <span className="rounded-full bg-white px-2.5 py-1">{tripSummary.nights || "Flexible"} nights</span>
                        <span className="rounded-full bg-white px-2.5 py-1">{tripSummary.travelers || "Flexible"} travelers</span>
                        <span className="rounded-full bg-white px-2.5 py-1">{formatTripDate(tripSummary.checkIn)} to {formatTripDate(tripSummary.checkOut)}</span>
                      </div>
                      {tripSummaryExpanded ? (
                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-slate-600 sm:grid-cols-4">
                          <div>
                            <div className="font-medium text-slate-900">Destination</div>
                            <div>{tripSummary.destination || "Not set"}</div>
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">Dates</div>
                            <div>{formatTripDate(tripSummary.checkIn)} to {formatTripDate(tripSummary.checkOut)}</div>
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">Nights</div>
                            <div>{tripSummary.nights || "Flexible"}</div>
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">Travelers</div>
                            <div>{tripSummary.travelers || "Flexible"}</div>
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">From</div>
                            <div>{tripSummary.leavingFrom || "Not set"}</div>
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">Budget</div>
                            <div>{tripSummary.budget || "Flexible"}</div>
                          </div>
                          <div className="col-span-2 sm:col-span-2">
                            <div className="font-medium text-slate-900">Style</div>
                            <div>{tripSummary.tripType || tripSummary.notes || "General trip planning"}</div>
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTripSummaryExpanded(true);
                            setAiMode("trip-form");
                          }}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-white"
                        >
                          Edit trip
                        </button>
                        <button
                          type="button"
                          onClick={() => void submitTripPlanForm()}
                          className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800"
                        >
                          Re-plan
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {aiSending && (
                    <div className="max-w-[92%] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-9 w-9 items-center justify-center">
                          <span className="absolute inset-0 rounded-full border border-slate-200 bg-white" />
                          <span className="absolute inset-[-3px] rounded-full bg-[conic-gradient(from_180deg,rgba(15,23,42,0)_0deg,rgba(15,23,42,0.95)_82deg,rgba(71,85,105,0.78)_170deg,rgba(15,23,42,0.92)_250deg,rgba(15,23,42,0)_320deg)] blur-[2px] animate-spin" />
                          <span className="absolute inset-[1px] rounded-full border border-white/90 bg-white" />
                          <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-[0_0_18px_rgba(15,23,42,0.16)]">
                            <img src="/brand/logo_dark.png" alt="Merry360x" className="h-4 w-4 object-contain" loading="eager" />
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Merry is thinking</div>
                          <div className="mt-1 text-xs text-slate-500">
                            Building your next step with Merry's live trip assistant.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {shouldShowAiRating ? (
                    <div className="max-w-[92%] rounded-2xl border border-slate-200 bg-white px-4 py-4 text-xs text-slate-900 shadow-sm">
                      <div className="font-medium">Was this response helpful?</div>
                      <div className="mt-1 text-slate-500">Choose thumbs up or down, then add an optional note.</div>
                      <div className="mt-2 flex items-center gap-2">
                        {([
                          ["up", "Thumbs up", "👍"],
                          ["down", "Thumbs down", "👎"],
                        ] as const).map(([value, label, icon]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setAiFeedbackDraftType(value)}
                            disabled={aiRatingSending}
                            className={`rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${aiFeedbackDraftType === value ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"}`}
                            aria-label={label}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                      {aiFeedbackDraftType ? (
                        <div className="mt-3 space-y-2">
                          <Textarea
                            value={aiFeedbackComment}
                            onChange={(e) => setAiFeedbackComment(e.target.value)}
                            placeholder="Optional: what worked well or what was missing?"
                            className="min-h-[72px] text-xs"
                            disabled={aiRatingSending}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="h-8 px-3 text-xs"
                              disabled={aiRatingSending}
                              onClick={() => void submitAiFeedback(aiFeedbackDraftType, aiFeedbackComment)}
                            >
                              Send feedback
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              disabled={aiRatingSending}
                              onClick={() => void submitAiFeedback(aiFeedbackDraftType)}
                            >
                              Skip note
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {aiConversationFeedback !== null ? (
                    <div className="max-w-[90%] rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      Feedback saved: {aiConversationFeedback === "up" ? "thumbs up" : "thumbs down"}
                    </div>
                  ) : null}
                  <div ref={aiEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t border-slate-200 bg-white p-3 shrink-0">
                <div className="mb-2 flex items-center gap-2 text-[11px] text-slate-500">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Merry can answer, save items, and route you to checkout.
                </div>
                <div className="flex gap-2">
                  <Input
                    className="h-10 rounded-full border-slate-200 bg-white text-sm"
                    value={aiDraft}
                    onChange={(e) => {
                      setAiDraft(e.target.value);
                      if (aiMode === "starter") setAiMode("freeform");
                    }}
                    placeholder={aiInputPlaceholder}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendAi();
                      }
                    }}
                  />
                  <Button size="sm" className="h-10 rounded-full px-4 text-sm" onClick={() => void sendAi()} disabled={aiSending || !aiDraft.trim()}>
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
                  <div className="text-sm font-medium text-white">{activeSupportName}</div>
                  <div className="text-[10px] text-white/70">
                    {staffTyping ? `${activeSupportName} is typing...` : "Usually responds within minutes"}
                  </div>
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
              <ScrollArea className="flex-1 min-h-0 p-3 overflow-y-auto" ref={scrollRef}>
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
                      const isNew = msg.id.startsWith('temp-') || (new Date().getTime() - new Date(msg.created_at).getTime() < 3000);
                      return (
                        <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""} ${isNew ? "animate-in fade-in slide-in-from-bottom-2 duration-300" : ""}`}>
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
                              {!isMe && (
                                <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mb-1">
                                  {msg.sender_name || activeSupportName}
                                </div>
                              )}
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

                    {/* Typing indicator */}
                    {staffTyping && (
                      <div className="flex gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                          <Headset className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="rounded-2xl px-2.5 py-1.5 text-xs inline-block bg-muted/60 animate-pulse">
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Typing indicator */}
                    {staffTyping && (
                      <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                          <Headset className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-[10px] mb-1 font-semibold text-blue-600 dark:text-blue-400">
                            Support is typing...
                          </div>
                          <div className="rounded-2xl px-3 py-1.5 text-xs inline-block bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Waiting indicator */}
                    {!staffTyping && messages.length > 0 && messages[messages.length - 1]?.sender_id === user?.id && (
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
                      className="min-h-[40px] max-h-[80px] pr-16 resize-none text-base sm:text-xs rounded-2xl"
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
        </>
      )}
    </>
  );
}


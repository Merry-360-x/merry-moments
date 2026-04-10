import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { MessageCircle, RefreshCw, Send, UserRound } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateDirectMessageDraft, toDirectMessageError } from "@/lib/chat-safety";
import { cn } from "@/lib/utils";

type DirectMessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

type ProfileLite = {
  user_id: string;
  full_name: string | null;
  nickname?: string | null;
  avatar_url: string | null;
};

type ConversationItem = {
  peerId: string;
  peerProfile: ProfileLite | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

const formatMessageTime = (rawDate: string) => {
  const dt = new Date(rawDate);
  if (!Number.isFinite(dt.getTime())) return "";

  const now = new Date();
  const isToday =
    now.getFullYear() === dt.getFullYear() &&
    now.getMonth() === dt.getMonth() &&
    now.getDate() === dt.getDate();

  if (isToday) {
    return dt.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return dt.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });
};

const resolvePeerName = (profile?: ProfileLite | null, fallback?: string | null) => {
  const nickname = String(profile?.nickname || "").trim();
  if (nickname) return nickname;

  const fullName = String(profile?.full_name || "").trim();
  if (fullName) return fullName;

  const fallbackName = String(fallback || "").trim();
  if (fallbackName) return fallbackName;

  return "Host";
};

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const requestedPeerId = String(searchParams.get("peer") || "").trim();
  const requestedPeerName = String(searchParams.get("name") || "").trim();

  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(
    requestedPeerId || null
  );
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  const threadScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!requestedPeerId) return;
    setSelectedPeerId((current) => current || requestedPeerId);
  }, [requestedPeerId]);

  const conversationsQuery = useQuery({
    queryKey: ["direct-conversations", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("direct_messages")
        .select("id, sender_id, recipient_id, body, created_at, read_at")
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(600);

      if (error) throw error;

      const rows = (data || []) as DirectMessageRow[];
      const byPeer = new Map<string, ConversationItem>();

      rows.forEach((row) => {
        const peerId = row.sender_id === user!.id ? row.recipient_id : row.sender_id;
        if (!peerId) return;

        const current = byPeer.get(peerId);
        if (!current) {
          byPeer.set(peerId, {
            peerId,
            peerProfile: null,
            lastMessage: String(row.body || ""),
            lastMessageAt: row.created_at,
            unreadCount: row.recipient_id === user!.id && !row.read_at ? 1 : 0,
          });
          return;
        }

        if (row.recipient_id === user!.id && !row.read_at) {
          current.unreadCount += 1;
        }
      });

      const peerIds = Array.from(byPeer.keys());
      if (peerIds.length > 0) {
        const { data: profiles, error: profilesError } = await (supabase as any)
          .from("profiles")
          .select("user_id, full_name, nickname, avatar_url")
          .in("user_id", peerIds);

        if (profilesError) throw profilesError;

        const profileById = new Map<string, ProfileLite>();
        (profiles || []).forEach((profile: ProfileLite) => {
          const key = String(profile?.user_id || "").trim();
          if (!key) return;
          profileById.set(key, profile);
        });

        byPeer.forEach((conversation, peerId) => {
          conversation.peerProfile = profileById.get(peerId) ?? null;
        });
      }

      return Array.from(byPeer.values()).sort((a, b) =>
        String(b.lastMessageAt || "").localeCompare(String(a.lastMessageAt || ""))
      );
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const selectedPeerProfileFromList = useMemo(() => {
    if (!selectedPeerId) return null;
    return (
      conversationsQuery.data?.find((conversation) => conversation.peerId === selectedPeerId)
        ?.peerProfile || null
    );
  }, [conversationsQuery.data, selectedPeerId]);

  const selectedPeerProfileQuery = useQuery({
    queryKey: ["direct-peer-profile", selectedPeerId],
    enabled: Boolean(selectedPeerId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, nickname, avatar_url")
        .eq("user_id", selectedPeerId)
        .maybeSingle();

      if (error) throw error;
      return (data as ProfileLite | null) ?? null;
    },
    staleTime: 60_000,
  });

  const threadQuery = useQuery({
    queryKey: ["direct-thread", user?.id, selectedPeerId],
    enabled: Boolean(user?.id && selectedPeerId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("direct_messages")
        .select("id, sender_id, recipient_id, body, created_at, read_at")
        .or(
          `and(sender_id.eq.${user!.id},recipient_id.eq.${selectedPeerId}),and(sender_id.eq.${selectedPeerId},recipient_id.eq.${user!.id})`
        )
        .order("created_at", { ascending: true })
        .limit(400);

      if (error) throw error;
      return (data || []) as DirectMessageRow[];
    },
    refetchInterval: 8_000,
    staleTime: 3_000,
  });

  useEffect(() => {
    if (!threadQuery.data || !threadQuery.data.length || !user?.id || !selectedPeerId) {
      return;
    }

    const hasUnreadIncoming = threadQuery.data.some(
      (message) => message.recipient_id === user.id && !message.read_at
    );

    if (!hasUnreadIncoming) return;

    const markRead = async () => {
      const { error } = await (supabase as any)
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .eq("sender_id", selectedPeerId)
        .is("read_at", null);

      if (error) return;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["direct-thread", user.id, selectedPeerId] }),
        queryClient.invalidateQueries({ queryKey: ["direct-conversations", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["direct-messages-unread-count", user.id] }),
      ]);
    };

    void markRead();
  }, [queryClient, selectedPeerId, threadQuery.data, user?.id]);

  useEffect(() => {
    if (!threadQuery.data?.length) return;
    const node = threadScrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [threadQuery.data?.length, isSending]);

  const conversationItems = useMemo(() => {
    const base = [...(conversationsQuery.data || [])];

    if (
      requestedPeerId &&
      user?.id &&
      requestedPeerId !== user.id &&
      !base.some((conversation) => conversation.peerId === requestedPeerId)
    ) {
      base.unshift({
        peerId: requestedPeerId,
        peerProfile: selectedPeerProfileQuery.data || null,
        lastMessage: "",
        lastMessageAt: "",
        unreadCount: 0,
      });
    }

    return base;
  }, [
    conversationsQuery.data,
    requestedPeerId,
    selectedPeerProfileQuery.data,
    user?.id,
  ]);

  const activePeerProfile = selectedPeerProfileFromList || selectedPeerProfileQuery.data;
  const activePeerName = resolvePeerName(activePeerProfile, requestedPeerName);

  const sendMessage = async () => {
    if (!user?.id || !selectedPeerId || isSending) return;

    const validationError = validateDirectMessageDraft(draft);
    if (validationError) {
      toast({
        title: "Message blocked",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const { error } = await (supabase as any).from("direct_messages").insert({
        sender_id: user.id,
        recipient_id: selectedPeerId,
        body: draft.trim(),
      });

      if (error) throw error;

      setDraft("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["direct-thread", user.id, selectedPeerId] }),
        queryClient.invalidateQueries({ queryKey: ["direct-conversations", user.id] }),
      ]);
    } catch (error) {
      toast({
        title: "Could not send",
        description: toDirectMessageError(error),
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 lg:px-8 py-10">
          <div className="max-w-xl rounded-2xl border border-border bg-card p-8 shadow-card">
            <h1 className="text-2xl font-semibold text-foreground">Messages</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Sign in to chat with hosts and keep conversations protected on Merry360x.
            </p>
            <div className="mt-5">
              <Link to="/auth">
                <Button>Sign in</Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 lg:px-8 py-8">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Messages</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Contact details and off-platform coordination are blocked to protect against scams.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              void Promise.all([
                queryClient.invalidateQueries({ queryKey: ["direct-conversations", user.id] }),
                queryClient.invalidateQueries({ queryKey: ["direct-thread", user.id, selectedPeerId] }),
              ]);
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4">
          <aside
            className={cn(
              "rounded-2xl border border-border bg-card overflow-hidden",
              selectedPeerId ? "hidden lg:block" : "block"
            )}
          >
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Conversations</h2>
            </div>
            <div className="max-h-[68vh] overflow-y-auto">
              {conversationsQuery.isLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading chats...</div>
              ) : conversationsQuery.isError ? (
                <div className="p-4 text-sm text-destructive">
                  Could not load conversations.
                </div>
              ) : conversationItems.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No conversations yet. Open a host profile and tap Message.
                </div>
              ) : (
                conversationItems.map((conversation) => {
                  const name = resolvePeerName(
                    conversation.peerProfile,
                    conversation.peerId === requestedPeerId ? requestedPeerName : null
                  );
                  const isActive = selectedPeerId === conversation.peerId;

                  return (
                    <button
                      key={conversation.peerId}
                      type="button"
                      className={cn(
                        "w-full px-4 py-3 text-left border-b border-border/70 transition-colors",
                        isActive ? "bg-primary/10" : "hover:bg-muted/40"
                      )}
                      onClick={() => setSelectedPeerId(conversation.peerId)}
                    >
                      <div className="flex items-center gap-3">
                        {conversation.peerProfile?.avatar_url ? (
                          <img
                            src={conversation.peerProfile.avatar_url}
                            alt={name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <UserRound className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{name}</p>
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {formatMessageTime(conversation.lastMessageAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {conversation.lastMessage || "Start a conversation"}
                          </p>
                        </div>
                        {conversation.unreadCount > 0 ? (
                          <span className="inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                            {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section
            className={cn(
              "rounded-2xl border border-border bg-card overflow-hidden flex flex-col",
              selectedPeerId ? "flex" : "hidden lg:flex"
            )}
          >
            {selectedPeerId ? (
              <>
                <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setSelectedPeerId(null)}
                  >
                    Back
                  </Button>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {activePeerName}
                    </div>
                    <div className="text-[11px] text-muted-foreground">Direct message</div>
                  </div>
                </div>

                <div ref={threadScrollRef} className="h-[58vh] overflow-y-auto p-4 space-y-3 bg-background/40">
                  {threadQuery.isLoading ? (
                    <div className="text-sm text-muted-foreground">Loading conversation...</div>
                  ) : threadQuery.isError ? (
                    <div className="text-sm text-destructive">Could not load messages.</div>
                  ) : threadQuery.data && threadQuery.data.length > 0 ? (
                    threadQuery.data.map((message) => {
                      const isOwn = message.sender_id === user.id;

                      return (
                        <div
                          key={message.id}
                          className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[82%] md:max-w-[70%] rounded-2xl px-3.5 py-2.5",
                              isOwn
                                ? "bg-primary text-primary-foreground"
                                : "bg-card border border-border"
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                            <p
                              className={cn(
                                "text-[11px] mt-1",
                                isOwn ? "text-primary-foreground/80" : "text-muted-foreground"
                              )}
                            >
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground px-4">
                      No messages yet. Start the conversation with a safe, on-platform message.
                    </div>
                  )}
                </div>

                <div className="border-t border-border p-3">
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Type your message"
                      className="min-h-[52px] max-h-36 resize-y"
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      className="h-[52px] shrink-0"
                      onClick={() => {
                        void sendMessage();
                      }}
                      disabled={isSending || !selectedPeerId}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[58vh] flex flex-col items-center justify-center text-center px-6">
                <MessageCircle className="w-10 h-10 text-muted-foreground" />
                <p className="mt-3 text-base font-medium text-foreground">Select a conversation</p>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                  Pick a host conversation from the left to read and send messages.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Messages;

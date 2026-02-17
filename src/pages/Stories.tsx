import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, MessageCircle, Send, Volume2, VolumeX, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type StoryRow = {
  id: string;
  title: string;
  body: string;
  location: string | null;
  media_url: string | null;
  media_type: string | null;
  image_url: string | null;
  user_id: string;
  created_at: string | null;
};

type AuthorRow = {
  user_id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
};

type StoryWithAuthor = StoryRow & {
  authorName: string;
  authorAvatar: string | null;
};

type StoryLikeRow = {
  story_id: string;
  user_id: string;
};

type StoryCommentRow = {
  id: string;
  story_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
};

type StoryGroup = {
  userId: string;
  authorName: string;
  authorAvatar: string | null;
  stories: StoryWithAuthor[];
};

const VIEWED_STORIES_KEY = "viewed_story_ids";
const IMAGE_STORY_DURATION_MS = 5500;

const isVideo = (url?: string | null) => {
  if (!url) return false;
  return /\/video\/upload\//i.test(url) || /\.(mp4|webm|mov|m4v|avi)(\?.*)?$/i.test(url);
};

export default function Stories() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [activeProgress, setActiveProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [commentDraft, setCommentDraft] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);
  const [viewedIds, setViewedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set<string>();
    try {
      const raw = localStorage.getItem(VIEWED_STORIES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return new Set<string>();
      return new Set(parsed as string[]);
    } catch {
      return new Set<string>();
    }
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const suppressTapUntilRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number; at: number } | null>(null);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["stories", "public-feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("id, title, body, location, media_url, media_type, image_url, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as StoryRow[];
    },
  });

  const storyIds = useMemo(() => stories.map((story) => story.id), [stories]);

  const { data: storyLikes = [] } = useQuery({
    queryKey: ["stories", "likes", storyIds.join("|")],
    enabled: storyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_likes")
        .select("story_id, user_id")
        .in("story_id", storyIds);
      if (error) throw error;
      return (data ?? []) as StoryLikeRow[];
    },
  });

  const { data: storyComments = [] } = useQuery({
    queryKey: ["stories", "comments", storyIds.join("|")],
    enabled: storyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_comments")
        .select("id, story_id, user_id, comment_text, created_at")
        .in("story_id", storyIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StoryCommentRow[];
    },
  });

  const profileIds = useMemo(() => {
    const ids = new Set<string>();
    stories.forEach((story) => ids.add(story.user_id));
    storyComments.forEach((comment) => ids.add(comment.user_id));
    return Array.from(ids);
  }, [stories, storyComments]);

  const { data: authors = [] } = useQuery({
    queryKey: ["stories", "authors", profileIds.join("|")],
    enabled: profileIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, nickname, avatar_url")
        .in("user_id", profileIds);
      if (error) throw error;
      return (data ?? []) as AuthorRow[];
    },
  });

  const authorMap = useMemo(() => {
    const map = new Map<string, AuthorRow>();
    authors.forEach((author) => map.set(author.user_id, author));
    return map;
  }, [authors]);

  const storiesWithAuthor = useMemo<StoryWithAuthor[]>(() => {
    return stories.map((story) => {
      const author = authorMap.get(story.user_id);
      return {
        ...story,
        authorName: author?.nickname || author?.full_name || "Traveler",
        authorAvatar: author?.avatar_url || null,
      };
    });
  }, [stories, authorMap]);

  const storyGroups = useMemo<StoryGroup[]>(() => {
    const grouped = new Map<string, StoryGroup>();

    storiesWithAuthor.forEach((story) => {
      if (!grouped.has(story.user_id)) {
        grouped.set(story.user_id, {
          userId: story.user_id,
          authorName: story.authorName,
          authorAvatar: story.authorAvatar,
          stories: [],
        });
      }

      grouped.get(story.user_id)?.stories.push(story);
    });

    return Array.from(grouped.values()).map((group) => ({
      ...group,
      stories: [...group.stories].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      }),
    }));
  }, [storiesWithAuthor]);

  const activeGroup = storyGroups[activeGroupIndex] || null;
  const activeStory = activeGroup?.stories[activeStoryIndex] || null;
  const activeMedia = activeStory ? activeStory.media_url || activeStory.image_url : null;
  const activeStoryIsVideo = activeStory ? activeStory.media_type === "video" || isVideo(activeMedia) : false;

  const likeCountByStory = useMemo(() => {
    const counts = new Map<string, number>();
    storyLikes.forEach((like) => {
      counts.set(like.story_id, (counts.get(like.story_id) || 0) + 1);
    });
    return counts;
  }, [storyLikes]);

  const likedStoryIds = useMemo(() => {
    const ids = new Set<string>();
    if (!user) return ids;
    storyLikes.forEach((like) => {
      if (like.user_id === user.id) ids.add(like.story_id);
    });
    return ids;
  }, [storyLikes, user]);

  const commentsByStory = useMemo(() => {
    const map = new Map<string, StoryCommentRow[]>();
    storyComments.forEach((comment) => {
      if (!map.has(comment.story_id)) {
        map.set(comment.story_id, []);
      }
      map.get(comment.story_id)?.push(comment);
    });
    return map;
  }, [storyComments]);

  const commentCountByStory = useMemo(() => {
    const counts = new Map<string, number>();
    commentsByStory.forEach((entries, storyId) => counts.set(storyId, entries.length));
    return counts;
  }, [commentsByStory]);

  const canDeleteStory = (story: StoryWithAuthor | StoryRow | null | undefined) => {
    if (!story || !user) return false;
    return isAdmin || story.user_id === user.id;
  };

  const saveViewed = (nextSet: Set<string>) => {
    setViewedIds(new Set(nextSet));
    if (typeof window === "undefined") return;
    localStorage.setItem(VIEWED_STORIES_KEY, JSON.stringify(Array.from(nextSet)));
  };

  const markStoryViewed = (storyId: string) => {
    const next = new Set(viewedIds);
    next.add(storyId);
    saveViewed(next);
  };

  const openGroupViewer = (groupIndex: number, storyIndex = 0) => {
    setActiveGroupIndex(groupIndex);
    setActiveStoryIndex(storyIndex);
    setViewerOpen(true);
  };

  const goToNextStory = () => {
    if (!activeGroup || !activeStory) return;
    markStoryViewed(activeStory.id);

    const hasNextInGroup = activeStoryIndex < activeGroup.stories.length - 1;
    if (hasNextInGroup) {
      setActiveStoryIndex((prev) => prev + 1);
      return;
    }

    const hasNextGroup = activeGroupIndex < storyGroups.length - 1;
    if (hasNextGroup) {
      setActiveGroupIndex((prev) => prev + 1);
      setActiveStoryIndex(0);
      return;
    }

    setViewerOpen(false);
  };

  const goToPreviousStory = () => {
    if (!activeGroup) return;

    const hasPreviousInGroup = activeStoryIndex > 0;
    if (hasPreviousInGroup) {
      setActiveStoryIndex((prev) => prev - 1);
      return;
    }

    const hasPreviousGroup = activeGroupIndex > 0;
    if (hasPreviousGroup) {
      const previousGroup = storyGroups[activeGroupIndex - 1];
      setActiveGroupIndex((prev) => prev - 1);
      setActiveStoryIndex(Math.max(0, previousGroup.stories.length - 1));
    }
  };

  useEffect(() => {
    if (!viewerOpen || !activeStory) return;
    markStoryViewed(activeStory.id);
  }, [viewerOpen, activeStory?.id]);

  useEffect(() => {
    if (!viewerOpen || !activeStory || activeStoryIsVideo) return;

    if (isHolding) return;

    const stepMs = 50;
    const progressPerStep = (100 * stepMs) / IMAGE_STORY_DURATION_MS;
    const timer = window.setInterval(() => {
      setActiveProgress((prev) => Math.min(100, prev + progressPerStep));
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [viewerOpen, activeStory?.id, activeStoryIsVideo, isHolding]);

  useEffect(() => {
    if (!viewerOpen || !activeStory || activeStoryIsVideo) return;
    if (isHolding) return;
    if (activeProgress < 100) return;
    goToNextStory();
  }, [viewerOpen, activeStory?.id, activeStoryIsVideo, activeProgress, isHolding]);

  useEffect(() => {
    if (!viewerOpen || !activeStory) return;

    setIsHolding(false);

    if (activeStoryIsVideo) {
      setActiveProgress(0);
      return;
    }

    setActiveProgress(0);
  }, [viewerOpen, activeStory?.id, activeStoryIsVideo]);

  useEffect(() => {
    if (!viewerOpen || !activeStory) return;
    setCommentDraft("");
  }, [viewerOpen, activeStory?.id]);

  useEffect(() => {
    if (!viewerOpen || !activeStory || !activeStoryIsVideo || !videoRef.current) return;

    const video = videoRef.current;
    const syncProgress = () => {
      if (!video.duration || !Number.isFinite(video.duration) || video.duration <= 0) {
        setActiveProgress(0);
        return;
      }
      setActiveProgress(Math.min(100, (video.currentTime / video.duration) * 100));
    };

    video.addEventListener("timeupdate", syncProgress);
    video.addEventListener("loadedmetadata", syncProgress);
    syncProgress();

    return () => {
      video.removeEventListener("timeupdate", syncProgress);
      video.removeEventListener("loadedmetadata", syncProgress);
    };
  }, [viewerOpen, activeStory?.id, activeStoryIsVideo]);

  const handleHoldStart = () => {
    if (!viewerOpen) return;
    holdStartRef.current = Date.now();
    setIsHolding(true);
    if (activeStoryIsVideo && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  };

  const handleHoldEnd = (direction: "next" | "prev") => {
    if (!viewerOpen) return;
    const startedAt = holdStartRef.current;
    holdStartRef.current = null;

    setIsHolding(false);

    if (activeStoryIsVideo && videoRef.current && videoRef.current.paused) {
      void videoRef.current.play().catch(() => null);
    }

    if (Date.now() < suppressTapUntilRef.current) return;

    const heldMs = startedAt ? Date.now() - startedAt : 0;
    const isTap = heldMs < 180;

    if (!isTap) return;
    if (direction === "next") goToNextStory();
    else goToPreviousStory();
  };

  const handleViewerTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, at: Date.now() };
  };

  const handleViewerTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    if (event.changedTouches.length !== 1) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const duration = Date.now() - start.at;

    const isHorizontalSwipe = Math.abs(deltaX) >= 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && duration < 700;
    if (!isHorizontalSwipe) return;

    suppressTapUntilRef.current = Date.now() + 250;

    if (deltaX < 0) goToNextStory();
    else goToPreviousStory();
  };

  useEffect(() => {
    if (!viewerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerOpen(false);
      if (event.key === "ArrowRight") goToNextStory();
      if (event.key === "ArrowLeft") goToPreviousStory();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewerOpen, goToNextStory, goToPreviousStory]);

  const deleteStory = async (story: StoryWithAuthor | StoryRow) => {
    if (!user || !canDeleteStory(story)) return;
    const confirmed = window.confirm("Delete this story?");
    if (!confirmed) return;

    setDeletingStoryId(story.id);
    try {
      let query = supabase.from("stories").delete().eq("id", story.id);
      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }
      const { error } = await query;
      if (error) throw error;

      toast({ title: "Story deleted" });

      if (activeStory?.id === story.id) {
        setViewerOpen(false);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stories", "public-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["stories"] }),
      ]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete story.",
      });
    } finally {
      setDeletingStoryId(null);
    }
  };

  const toggleLike = async (storyId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login required",
        description: "Please sign in to like stories.",
      });
      return;
    }

    const hasLiked = likedStoryIds.has(storyId);
    try {
      if (hasLiked) {
        const { error } = await supabase
          .from("story_likes")
          .delete()
          .eq("story_id", storyId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("story_likes").insert({ story_id: storyId, user_id: user.id });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["stories", "likes"] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: error instanceof Error ? error.message : "Could not update like.",
      });
    }
  };

  const submitComment = async () => {
    if (!activeStory) return;
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login required",
        description: "Please sign in to comment on stories.",
      });
      return;
    }

    const text = commentDraft.trim();
    if (!text) return;

    setIsSubmittingComment(true);
    try {
      const { error } = await supabase.from("story_comments").insert({
        story_id: activeStory.id,
        user_id: user.id,
        comment_text: text,
      });
      if (error) throw error;

      setCommentDraft("");
      await queryClient.invalidateQueries({ queryKey: ["stories", "comments"] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Comment failed",
        description: error instanceof Error ? error.message : "Could not send comment.",
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto max-w-5xl px-4 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Stories</h1>
            <p className="text-muted-foreground">Status-style stories from the community.</p>
          </div>
          <Link to={user ? "/create-story" : "/auth?redirect=/create-story"}>
            <Button>Add Story</Button>
          </Link>
        </div>

        {isLoading ? (
          <Card className="p-8 text-center text-muted-foreground">Loading stories...</Card>
        ) : stories.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-lg font-medium text-foreground">No stories yet</p>
            <p className="text-muted-foreground mt-2">Be the first to share one.</p>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="flex items-start gap-4 overflow-x-auto pb-2">
              {storyGroups.map((group, groupIndex) => {
                const latestStory = group.stories[group.stories.length - 1];
                const latestMedia = latestStory.media_url || latestStory.image_url;
                const allSeen = group.stories.every((story) => viewedIds.has(story.id));
                return (
                  <button
                    key={group.userId}
                    type="button"
                    onClick={() => openGroupViewer(groupIndex, 0)}
                    className="flex flex-col items-center gap-2 min-w-[74px]"
                  >
                    <div className={`p-[2px] rounded-full ${allSeen ? "bg-muted" : "bg-primary"}`}>
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-background border border-border">
                        {latestMedia ? (
                          isVideo(latestMedia) || latestStory.media_type === "video" ? (
                            <video src={latestMedia} className="w-full h-full object-cover" muted preload="metadata" />
                          ) : (
                            <img src={latestMedia} alt={group.authorName} className="w-full h-full object-cover" loading="lazy" />
                          )
                        ) : (
                          <Avatar className="w-full h-full rounded-none">
                            <AvatarImage src={group.authorAvatar || undefined} alt={group.authorName} />
                            <AvatarFallback>{group.authorName.slice(0, 1).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-foreground truncate max-w-[72px]">{group.authorName}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Recent Stories</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {storiesWithAuthor.map((story) => {
                  const mediaUrl = story.media_url || story.image_url;
                  const groupIndex = storyGroups.findIndex((group) => group.userId === story.user_id);
                  const storyIndex = storyGroups[groupIndex]?.stories.findIndex((entry) => entry.id === story.id) ?? 0;
                  const likeCount = likeCountByStory.get(story.id) || 0;
                  const commentCount = commentCountByStory.get(story.id) || 0;
                  const hasLiked = likedStoryIds.has(story.id);
                  const latestComment = commentsByStory.get(story.id)?.[0] || null;
                  const latestCommentAuthor = latestComment ? authorMap.get(latestComment.user_id) : null;

                  return (
                    <Card
                      key={story.id}
                      className="overflow-hidden cursor-pointer"
                      onClick={() => {
                        if (groupIndex >= 0) openGroupViewer(groupIndex, Math.max(0, storyIndex));
                      }}
                    >
                      {mediaUrl ? (
                        <div className="aspect-[16/10] bg-muted">
                          {isVideo(mediaUrl) || story.media_type === "video" ? (
                            <video src={mediaUrl} className="w-full h-full object-cover" preload="metadata" muted />
                          ) : (
                            <img src={mediaUrl} alt={story.title} className="w-full h-full object-cover" loading="lazy" />
                          )}
                        </div>
                      ) : null}

                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={story.authorAvatar || undefined} alt={story.authorName} />
                              <AvatarFallback>{story.authorName.slice(0, 1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate">{story.authorName}</span>
                          </div>
                          {story.location ? <Badge variant="outline">{story.location}</Badge> : null}
                        </div>

                        <div>
                          <h3 className="font-semibold text-foreground line-clamp-1">{story.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-3 mt-1">{story.body}</p>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {story.created_at ? new Date(story.created_at).toLocaleString() : ""}
                        </p>

                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleLike(story.id);
                            }}
                          >
                            <Heart className={`w-4 h-4 mr-1 ${hasLiked ? "fill-primary text-primary" : ""}`} />
                            {likeCount}
                          </Button>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            {commentCount}
                          </div>
                        </div>

                        {latestComment ? (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            <span className="font-medium text-foreground">
                              {latestCommentAuthor?.nickname || latestCommentAuthor?.full_name || "Traveler"}:
                            </span>{" "}
                            {latestComment.comment_text}
                          </p>
                        ) : null}

                        {canDeleteStory(story) ? (
                          <div className="pt-1">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={deletingStoryId === story.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteStory(story);
                              }}
                            >
                              {deletingStoryId === story.id ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {viewerOpen && activeStory ? (
        <div
          className="fixed inset-0 z-50 bg-black"
          onTouchStart={handleViewerTouchStart}
          onTouchEnd={handleViewerTouchEnd}
        >
          <div className="absolute inset-0">
            {activeMedia ? (
              activeStoryIsVideo ? (
                <video
                  key={activeStory.id}
                  ref={videoRef}
                  src={activeMedia}
                  className="w-full h-full object-contain"
                  autoPlay
                  playsInline
                  muted={isMuted}
                  controls
                  onEnded={goToNextStory}
                />
              ) : (
                <img src={activeMedia} alt={activeStory.title} className="w-full h-full object-contain" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">No media available</div>
            )}
          </div>

          <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 space-y-3 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex items-center gap-1.5">
              {activeGroup?.stories.map((story, index) => {
                const isDone = index < activeStoryIndex;
                const isCurrent = index === activeStoryIndex;
                return (
                  <div key={story.id} className="h-1 flex-1 rounded bg-white/30 overflow-hidden">
                    <div
                      className={`h-full ${isDone || isCurrent ? "bg-white" : "bg-transparent"}`}
                      style={{
                        width: isDone ? "100%" : isCurrent ? `${activeProgress}%` : "0%",
                        transition: isCurrent && !activeStoryIsVideo ? "width 50ms linear" : "none",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 text-white">
                <Avatar className="h-8 w-8 border border-white/40">
                  <AvatarImage src={activeStory.authorAvatar || undefined} alt={activeStory.authorName} />
                  <AvatarFallback>{activeStory.authorName.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{activeStory.authorName}</p>
                  <p className="text-xs text-white/80 truncate">
                    {activeStory.created_at ? new Date(activeStory.created_at).toLocaleString() : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeStoryIsVideo ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => setIsMuted((prev) => !prev)}
                    aria-label={isMuted ? "Unmute story video" : "Mute story video"}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                ) : null}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setViewerOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {canDeleteStory(activeStory) ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={deletingStoryId === activeStory.id}
                  onClick={() => deleteStory(activeStory)}
                >
                  {deletingStoryId === activeStory.id ? "Deleting..." : "Delete Story"}
                </Button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Previous story"
            className="absolute left-0 top-0 bottom-0 w-1/3"
            onPointerDown={handleHoldStart}
            onPointerUp={() => handleHoldEnd("prev")}
            onPointerCancel={() => handleHoldEnd("prev")}
            onPointerLeave={() => {
              if (isHolding) handleHoldEnd("prev");
            }}
          />
          <button
            type="button"
            aria-label="Next story"
            className="absolute right-0 top-0 bottom-0 w-2/3"
            onPointerDown={handleHoldStart}
            onPointerUp={() => handleHoldEnd("next")}
            onPointerCancel={() => handleHoldEnd("next")}
            onPointerLeave={() => {
              if (isHolding) handleHoldEnd("next");
            }}
          />

          <div className="absolute left-3 right-3 bottom-4">
            <Card className="bg-black/55 border-white/20 text-white p-3">
              <p className="font-medium line-clamp-1">{activeStory.title}</p>
              <p className="text-sm text-white/90 line-clamp-3 mt-1">{activeStory.body}</p>
              {activeStory.location ? (
                <Badge variant="outline" className="mt-2 border-white/50 text-white">
                  {activeStory.location}
                </Badge>
              ) : null}

              <div className="mt-3 flex items-center gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-white hover:bg-white/20"
                  onClick={() => toggleLike(activeStory.id)}
                >
                  <Heart
                    className={`w-4 h-4 mr-1 ${likedStoryIds.has(activeStory.id) ? "fill-white text-white" : "text-white"}`}
                  />
                  {likeCountByStory.get(activeStory.id) || 0}
                </Button>
                <div className="text-xs text-white/90 flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {commentCountByStory.get(activeStory.id) || 0}
                </div>
              </div>

              {(commentsByStory.get(activeStory.id)?.length || 0) > 0 ? (
                <div className="mt-2 space-y-1">
                  {(commentsByStory.get(activeStory.id) || []).slice(0, 2).map((comment) => {
                    const commentAuthor = authorMap.get(comment.user_id);
                    return (
                      <p key={comment.id} className="text-xs text-white/90 line-clamp-2">
                        <span className="font-medium text-white">
                          {commentAuthor?.nickname || commentAuthor?.full_name || "Traveler"}:
                        </span>{" "}
                        {comment.comment_text}
                      </p>
                    );
                  })}
                </div>
              ) : null}

              <div className="mt-3 flex items-center gap-2">
                <Input
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  placeholder={user ? "Reply to this story..." : "Login to comment"}
                  disabled={!user || isSubmittingComment}
                  className="h-8 bg-white/10 border-white/30 text-white placeholder:text-white/60"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void submitComment();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => void submitComment()}
                  disabled={!user || !commentDraft.trim() || isSubmittingComment}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}

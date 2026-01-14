import { Plus, MapPin, Heart, MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CloudinaryUploadDialog } from "@/components/CloudinaryUploadDialog";
import { useMemo, useState } from "react";
import { logError, uiErrorMessage } from "@/lib/ui-errors";

const Stories = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const mediaType = useMemo(() => (mediaUrl ? (/\.(mp4|webm|mov|m4v|avi)(\?.*)?$/i.test(mediaUrl) || /\/video\/upload\//i.test(mediaUrl) ? "video" : "image") : null), [mediaUrl]);
  const [saving, setSaving] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [floatingCommentsOpen, setFloatingCommentsOpen] = useState(false);
  const [floatingCommentsStoryId, setFloatingCommentsStoryId] = useState<string | null>(null);

  const canPost = Boolean(user?.id) && !authLoading;

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("id, title, body, location, media_url, media_type, image_url, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        title: string;
        body: string;
        location: string | null;
        media_url: string | null;
        media_type: string | null;
        image_url: string | null;
        user_id: string;
        created_at: string;
      }>;
    },
  });

  const { data: authorProfiles = {} } = useQuery({
    queryKey: ["stories-authors", stories.map((s) => s.user_id).join("|")],
    enabled: stories.length > 0,
    queryFn: async () => {
      const ids = Array.from(new Set(stories.map((s) => s.user_id)));
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", ids);
      if (error) return {};
      const map: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      (data ?? []).forEach((p) => {
        map[String((p as { user_id: string }).user_id)] = {
          full_name: (p as { full_name: string | null }).full_name ?? null,
          avatar_url: (p as { avatar_url: string | null }).avatar_url ?? null,
        };
      });
      return map;
    },
  });

  const activeStory = useMemo(
    () => stories.find((s) => s.id === activeStoryId) || null,
    [stories, activeStoryId]
  );

  // Get likes for active story
  const { data: likesData = [], refetch: refetchLikes } = useQuery({
    queryKey: ["story-likes", activeStoryId],
    queryFn: async () => {
      if (!activeStoryId) return [];
      const { data, error } = await supabase
        .from("story_likes")
        .select("id, user_id")
        .eq("story_id", activeStoryId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeStoryId,
  });

  // Get comments for active story
  const { data: commentsData = [], refetch: refetchComments } = useQuery({
    queryKey: ["story-comments", activeStoryId],
    queryFn: async () => {
      if (!activeStoryId) return [];
      const { data, error } = await supabase
        .from("story_comments")
        .select(`
          id, comment_text, created_at, user_id,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq("story_id", activeStoryId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeStoryId,
  });

  // Get comments for floating comment section
  const { data: floatingCommentsData = [], refetch: refetchFloatingComments } = useQuery({
    queryKey: ["floating-story-comments", floatingCommentsStoryId],
    queryFn: async () => {
      if (!floatingCommentsStoryId) return [];
      const { data, error } = await supabase
        .from("story_comments")
        .select(`
          id, comment_text, created_at, user_id,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq("story_id", floatingCommentsStoryId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!floatingCommentsStoryId && floatingCommentsOpen,
  });

  // Get engagement counts for all stories
  const { data: engagementCounts = {} } = useQuery({
    queryKey: ["story-engagement-counts", stories.map(s => s.id).join("|")],
    queryFn: async () => {
      if (stories.length === 0) return {};
      
      const storyIds = stories.map(s => s.id);
      
      // Get likes count for all stories
      const { data: likesData, error: likesError } = await supabase
        .from("story_likes")
        .select("story_id")
        .in("story_id", storyIds);
      
      // Get comments count for all stories
      const { data: commentsData, error: commentsError } = await supabase
        .from("story_comments")
        .select("story_id")
        .in("story_id", storyIds);
      
      if (likesError || commentsError) {
        console.warn("Error fetching engagement:", { likesError, commentsError });
        return {};
      }
      
      // Count engagement for each story
      const counts: Record<string, { likes: number; comments: number }> = {};
      
      storyIds.forEach(id => {
        counts[id] = {
          likes: (likesData || []).filter(like => like.story_id === id).length,
          comments: (commentsData || []).filter(comment => comment.story_id === id).length
        };
      });
      
      return counts;
    },
    enabled: stories.length > 0,
  });

  const openFloatingComments = (storyId: string) => {
    setFloatingCommentsStoryId(storyId);
    setFloatingCommentsOpen(true);
  };

  const closeFloatingComments = () => {
    setFloatingCommentsOpen(false);
    setFloatingCommentsStoryId(null);
  };

  const reset = () => {
    setLocation("");
    setBody("");
    setMediaUrl(null);
  };

  const handleLike = async () => {
    if (!user || !activeStoryId) {
      toast({ variant: "destructive", title: "Sign in required", description: "Please sign in to like stories." });
      return;
    }

    try {
      const userLiked = likesData.some(like => like.user_id === user.id);
      
      if (userLiked) {
        // Unlike
        const { error } = await supabase
          .from("story_likes")
          .delete()
          .eq("story_id", activeStoryId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from("story_likes")
          .insert({ story_id: activeStoryId, user_id: user.id });
        if (error) throw error;
      }
      
      refetchLikes();
      // Refresh engagement counts for all stories
      await qc.invalidateQueries({ queryKey: ["story-engagement-counts"] });
    } catch (e) {
      logError("story.like", e);
      toast({ variant: "destructive", title: "Error", description: "Could not update like." });
    }
  };

  const handleComment = async () => {
    if (!user || !activeStoryId || !commentText.trim()) {
      if (!user) {
        toast({ variant: "destructive", title: "Sign in required", description: "Please sign in to comment." });
      }
      return;
    }

    try {
      const { error } = await supabase
        .from("story_comments")
        .insert({ 
          story_id: activeStoryId, 
          user_id: user.id,
          comment_text: commentText.trim()
        });
      if (error) throw error;
      
      setCommentText("");
      refetchComments();
      // Refresh floating comments if viewing the same story
      if (floatingCommentsStoryId === activeStoryId) {
        refetchFloatingComments();
      }
      // Refresh engagement counts for all stories
      await qc.invalidateQueries({ queryKey: ["story-engagement-counts"] });
      toast({ title: "Comment added!" });
    } catch (e) {
      logError("story.comment", e);
      toast({ variant: "destructive", title: "Error", description: "Could not add comment." });
    }
  };

  const submit = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Sign in required", description: "Please sign in to post a story." });
      return;
    }
    if (!body.trim()) {
      toast({ variant: "destructive", title: "Missing info", description: "Please add a caption." });
      return;
    }
    if (!mediaUrl) {
      toast({ variant: "destructive", title: "Missing media", description: "Please upload an image or video." });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        title: body.trim().substring(0, 100), // Use first part of caption as title
        location: location.trim() || null,
        body: body.trim(),
        media_url: mediaUrl,
        media_type: mediaType,
        // Backward compatibility: keep image_url populated for image stories
        image_url: mediaType === "image" ? mediaUrl : null,
      });
      if (error) throw error;
      toast({ title: "Story posted" });
      setOpen(false);
      reset();
      await qc.invalidateQueries({ queryKey: ["stories"] });
    } catch (e) {
      logError("stories.insert", e);
      toast({
        variant: "destructive",
        title: "Could not post story",
        description: uiErrorMessage(e, "Please try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  const heroSubtitle = useMemo(
    () => (canPost ? "Share your moments and inspire other travelers." : "Read real traveler stories."),
    [canPost]
  );

  const markViewed = (id: string) => {
    try {
      const raw = localStorage.getItem("viewed_story_ids");
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      set.add(id);
      localStorage.setItem("viewed_story_ids", JSON.stringify(Array.from(set)));
    } catch {
      // ignore
    }
  };

  const isViewed = (id: string) => {
    try {
      const raw = localStorage.getItem("viewed_story_ids");
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      return set.has(id);
    } catch {
      return false;
    }
  };

  const openViewer = (id: string) => {
    setActiveStoryId(id);
    setViewerOpen(true);
    markViewed(id);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-primary py-12 px-4 lg:px-8">
        <div className="container mx-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-primary-foreground mb-6">Travel Stories</h1>
          <p className="text-primary-foreground/90 mb-6">{heroSubtitle}</p>

          {/* Stories row (Instagram-style) */}
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            <button
              className="flex flex-col items-center gap-2 group disabled:opacity-60"
              onClick={() => setOpen(true)}
              disabled={!canPost}
              type="button"
            >
              <div className="w-16 h-16 rounded-full bg-primary-foreground flex items-center justify-center group-hover:scale-105 transition-transform">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm text-primary-foreground">{canPost ? "Your Story" : "Sign in to post"}</span>
            </button>

            {stories.slice(0, 12).map((s) => {
              const author = authorProfiles[s.user_id];
              const media = s.media_url || s.image_url;
              const viewed = isViewed(s.id);
              const ring = viewed ? "bg-muted/40" : "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-400";
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openViewer(s.id)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`p-[2px] rounded-full ${ring}`}>
                    <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center overflow-hidden">
                      {media ? (
                        /\/video\/upload\//i.test(media) || (s.media_type === "video") ? (
                          <video
                            src={media}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <img src={media} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
                        )
                      ) : author?.avatar_url ? (
                        <img src={author.avatar_url} alt={author.full_name ?? "Traveler"} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-primary-foreground max-w-[72px] truncate">
                    {author?.full_name ?? "Traveler"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stories Content */}
      <section className="container mx-auto px-4 lg:px-8 py-12">
        {/* {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading stories…</p>
          </div>
        ) : */ stories.length === 0 ? (
          <div className="bg-card rounded-xl p-10 shadow-card text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">No stories yet</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Be the first to share a travel moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((s) => {
              const author = authorProfiles[s.user_id];
              const media = s.media_url || s.image_url;
              return (
                <div 
                  key={s.id} 
                  className="relative bg-card rounded-2xl shadow-card overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                  onClick={() => openViewer(s.id)}
                >
                  {/* Media Background */}
                  <div className="relative h-80">
                    {media ? (
                      (/\/video\/upload\//i.test(String(media)) || s.media_type === "video" ? (
                        <video
                          src={String(media)}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={String(media)}
                          alt={s.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ))
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5" />
                    )}
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />
                    
                    {/* Author Info - Top */}
                    <div className="absolute top-4 left-4 right-4 flex items-center gap-3">
                      {author?.avatar_url ? (
                        <img
                          src={author.avatar_url}
                          alt={author.full_name ?? "Traveler"}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white/50"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/50" />
                      )}
                      <div>
                        <div className="text-white text-sm font-medium drop-shadow-sm">
                          {author?.full_name ?? "Traveler"}
                        </div>
                        <div className="text-white/80 text-xs drop-shadow-sm">
                          {new Date(s.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Content Overlay - Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      {/* Caption */}
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-3">
                        <p className="text-white text-sm leading-relaxed line-clamp-3 drop-shadow-sm">
                          {s.body}
                        </p>
                        
                        {/* Location */}
                        {s.location && (
                          <div className="flex items-center gap-1 mt-2 text-white/90 text-xs">
                            <MapPin className="w-3 h-3 drop-shadow-sm" />
                            <span className="drop-shadow-sm">{s.location}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Interaction Preview */}
                      <div className="flex items-center justify-between text-white/80 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            <span>{engagementCounts[s.id]?.likes || 0}</span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openFloatingComments(s.id);
                            }}
                            className="flex items-center gap-1 hover:text-white transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>{engagementCounts[s.id]?.comments || 0}</span>
                          </button>
                        </div>
                        <div className="text-white/60 text-xs">
                          Tap to view
                        </div>
                      </div>
                    </div>
                    
                    {/* Hover Effect */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Instagram-style Story viewer */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="p-0 max-w-sm mx-auto h-[80vh] overflow-hidden rounded-2xl [&>button]:hidden">
          <div className="relative w-full h-full bg-black">
            {activeStory ? (
              (() => {
                const media = activeStory.media_url || activeStory.image_url;
                const author = authorProfiles[activeStory.user_id];
                if (!media) {
                  return <div className="h-full flex items-center justify-center text-white/70">No media</div>;
                }
                const isVid = /\/video\/upload\//i.test(media) || activeStory.media_type === "video";
                
                return (
                  <div className="relative w-full h-full">
                    {/* Media Background */}
                    {isVid ? (
                      <video 
                        src={media} 
                        className="w-full h-full object-cover" 
                        autoPlay 
                        muted 
                        loop 
                        playsInline 
                      />
                    ) : (
                      <img 
                        src={media} 
                        className="w-full h-full object-cover" 
                        alt={activeStory.title} 
                      />
                    )}
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
                    
                    {/* Top Section - Author Info */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {author?.avatar_url ? (
                          <img
                            src={author.avatar_url}
                            alt={author.full_name ?? "Traveler"}
                            className="w-8 h-8 rounded-full object-cover border-2 border-white"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white" />
                        )}
                        <div>
                          <div className="text-white text-sm font-medium">
                            {author?.full_name ?? "Traveler"}
                          </div>
                          <div className="text-white/80 text-xs">
                            {new Date(activeStory.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white"
                        onClick={() => setViewerOpen(false)}
                        aria-label="Close"
                      >
                        <span className="text-lg leading-none">×</span>
                      </button>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="absolute top-2 left-4 right-4 h-0.5 bg-white/30 rounded-full">
                      <div className="h-full w-full bg-white rounded-full" />
                    </div>
                    
                    {/* Bottom Section - Caption & Location */}
                    <div className="absolute bottom-16 left-4 right-4">
                      {/* Caption */}
                      <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 mb-3">
                        <p className="text-white text-sm leading-relaxed">
                          {activeStory.body}
                        </p>
                        {/* Location */}
                        {activeStory.location && (
                          <div className="flex items-center gap-1 mt-2 text-white/90 text-xs">
                            <MapPin className="w-3 h-3" />
                            <span>{activeStory.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Interaction Section */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center">
                      <div className="flex items-center gap-6">
                        <button 
                          onClick={handleLike}
                          className={`flex flex-col items-center gap-1 transition-colors ${
                            likesData.some(like => like.user_id === user?.id) 
                              ? 'text-red-500' 
                              : 'text-white/90 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-6 h-6 ${
                            likesData.some(like => like.user_id === user?.id) ? 'fill-current' : ''
                          }`} />
                          <span className="text-xs">{likesData.length}</span>
                        </button>
                        <button 
                          onClick={() => setShowComments(!showComments)}
                          className="flex flex-col items-center gap-1 text-white/90 hover:text-white transition-colors"
                        >
                          <MessageCircle className="w-6 h-6" />
                          <span className="text-xs">{commentsData.length}</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Comments Section */}
                    {showComments && (
                      <div className="absolute bottom-16 left-4 right-4 max-h-48 bg-black/60 backdrop-blur-sm rounded-lg">
                        <div className="p-3 max-h-32 overflow-y-auto space-y-2">
                          {commentsData.map((comment: any) => (
                            <div key={comment.id} className="flex gap-2 text-white text-xs">
                              <span className="font-medium text-white/90">
                                {comment.profiles?.full_name || 'User'}:
                              </span>
                              <span>{comment.comment_text}</span>
                            </div>
                          ))}
                          {commentsData.length === 0 && (
                            <div className="text-white/60 text-xs text-center py-2">
                              No comments yet. Be the first to comment!
                            </div>
                          )}
                        </div>
                        <div className="border-t border-white/20 p-2 flex gap-2">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a comment..."
                            className="flex-1 bg-transparent text-white text-xs placeholder-white/60 border-0 outline-0"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && commentText.trim()) {
                                handleComment();
                              }
                            }}
                          />
                          <button
                            onClick={handleComment}
                            disabled={!commentText.trim()}
                            className="text-blue-400 text-xs font-medium disabled:opacity-50"
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="h-full flex items-center justify-center text-white/70">No media</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Your Story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="storyLocation">Location</Label>
              <Input 
                id="storyLocation" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                placeholder="e.g., Kigali, Rwanda" 
              />
            </div>
            <div>
              <Label htmlFor="storyBody">Caption *</Label>
              <Textarea 
                id="storyBody" 
                value={body} 
                onChange={(e) => setBody(e.target.value)} 
                placeholder="Share your experience and what made it special..." 
                rows={4}
              />
            </div>
            <div>
              <Label>Media (Image or Video) *</Label>
              <div className="mt-2">
                <CloudinaryUploadDialog
                  title="Upload story media"
                  folder="merry360/stories"
                  multiple={false}
                  accept="image/*,video/*"
                  value={mediaUrl ? [mediaUrl] : []}
                  onChange={(urls) => setMediaUrl(urls[0] ?? null)}
                  buttonLabel={mediaUrl ? "Change media" : "Upload image/video"}
                />
                {mediaUrl && (
                  <div className="mt-3">
                    {mediaType === "video" ? (
                      <video src={mediaUrl} className="w-full h-40 object-cover rounded-lg" controls />
                    ) : (
                      <img src={mediaUrl} className="w-full h-40 object-cover rounded-lg" alt="Preview" />
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={saving || !mediaUrl || !body.trim()}>
                {saving ? "Posting..." : "Post Story"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Comment Section */}
      {floatingCommentsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">Comments</h3>
                  <p className="text-xs text-white/80">
                    {floatingCommentsData.length} {floatingCommentsData.length === 1 ? 'comment' : 'comments'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeFloatingComments}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
            
            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
              {floatingCommentsData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No comments yet</p>
                  <p className="text-xs mt-1">Be the first to share your thoughts!</p>
                </div>
              ) : (
                floatingCommentsData.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    {comment.profiles?.avatar_url ? (
                      <img
                        src={comment.profiles.avatar_url}
                        alt={comment.profiles.full_name || 'User'}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="bg-muted/50 rounded-2xl px-3 py-2">
                        <div className="font-medium text-sm text-foreground mb-1">
                          {comment.profiles?.full_name || 'Anonymous User'}
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed">
                          {comment.comment_text}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 px-3">
                        {new Date(comment.created_at).toLocaleDateString()} at {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Quick Actions */}
            <div className="border-t bg-muted/20 p-4 flex gap-2">
              <button
                onClick={() => {
                  closeFloatingComments();
                  if (floatingCommentsStoryId) {
                    openViewer(floatingCommentsStoryId);
                  }
                }}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                View Story
              </button>
              <button
                onClick={closeFloatingComments}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Stories;

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

  const reset = () => {
    setLocation("");
    setBody("");
    setMediaUrl(null);
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

  const activeStory = useMemo(() => stories.find((s) => s.id === activeStoryId) ?? null, [stories, activeStoryId]);

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
                <div key={s.id} className="bg-card rounded-xl shadow-card overflow-hidden">
                  {media ? (
                    (/\/video\/upload\//i.test(String(media)) || s.media_type === "video" ? (
                      <video
                        src={String(media)}
                        className="w-full h-56 object-cover"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={String(media)}
                        alt={s.title}
                        className="w-full h-56 object-cover"
                        loading="lazy"
                      />
                    ))
                  ) : (
                    <div className="w-full h-56 bg-gradient-to-br from-muted via-muted/70 to-muted/40" />
                  )}
                  <div className="p-5">
                    {/* Caption first */}
                    <p className="text-sm text-foreground mb-3 line-clamp-4">{s.body}</p>
                    
                    {/* Location with icon */}
                    {s.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                        <MapPin className="w-3 h-3" />
                        <span>{s.location}</span>
                      </div>
                    )}
                    
                    {/* Author info */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">
                          {author?.full_name ?? "Traveler"} · {new Date(s.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {author?.avatar_url ? (
                        <img
                          src={author.avatar_url}
                          alt={author.full_name ?? "Traveler"}
                          className="w-8 h-8 rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Instagram-style Story viewer */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="p-0 max-w-sm mx-auto h-[80vh] overflow-hidden rounded-2xl">
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
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 text-white/90 hover:text-white transition-colors">
                          <Heart className="w-5 h-5" />
                          <span className="text-sm">24</span>
                        </button>
                        <button className="flex items-center gap-2 text-white/90 hover:text-white transition-colors">
                          <MessageCircle className="w-5 h-5" />
                          <span className="text-sm">12</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          placeholder="Send message..." 
                          className="bg-white/20 backdrop-blur-sm text-white placeholder-white/60 text-sm px-3 py-2 rounded-full border-0 outline-0 w-32"
                        />
                      </div>
                    </div>
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

      <Footer />
    </div>
  );
};

export default Stories;

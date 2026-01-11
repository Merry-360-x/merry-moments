import { Plus } from "lucide-react";
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

const Stories = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const mediaType = useMemo(() => (mediaUrl ? (/\.(mp4|webm|mov|m4v|avi)(\?.*)?$/i.test(mediaUrl) || /\/video\/upload\//i.test(mediaUrl) ? "video" : "image") : null), [mediaUrl]);
  const [saving, setSaving] = useState(false);

  const canPost = Boolean(user?.id) && !authLoading;

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("id, title, body, media_url, media_type, image_url, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        title: string;
        body: string;
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
    setTitle("");
    setBody("");
    setMediaUrl(null);
  };

  const submit = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Sign in required", description: "Please sign in to post a story." });
      return;
    }
    if (!title.trim() || !body.trim()) {
      toast({ variant: "destructive", title: "Missing info", description: "Please add a title and story text." });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        title: title.trim(),
        body: body.trim(),
        media_url: mediaUrl,
        media_type: mediaType,
      });
      if (error) throw error;
      toast({ title: "Story posted" });
      setOpen(false);
      reset();
      await qc.invalidateQueries({ queryKey: ["stories"] });
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e && typeof (e as any).message === "string"
          ? String((e as any).message)
          : "Please try again.";
      toast({
        variant: "destructive",
        title: "Could not post story",
        description: msg,
      });
      // Helpful for debugging RLS/schema issues in production without exposing too much UI noise.
      // eslint-disable-next-line no-console
      console.error("Story insert failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const heroSubtitle = useMemo(
    () => (canPost ? "Share your moments and inspire other travelers." : "Read real traveler stories."),
    [canPost]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-primary py-12 px-4 lg:px-8">
        <div className="container mx-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-primary-foreground mb-6">Travel Stories</h1>
          <p className="text-primary-foreground/90 mb-6">{heroSubtitle}</p>

          {/* Add Story Button */}
          <div className="flex items-center gap-4">
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
          </div>
        </div>
      </section>

      {/* Stories Content */}
      <section className="container mx-auto px-4 lg:px-8 py-12">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading stories…</p>
          </div>
        ) : stories.length === 0 ? (
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
              return (
                <div key={s.id} className="bg-card rounded-xl shadow-card overflow-hidden">
                  {((s as any).media_url ?? s.image_url) ? (
                    (/\/video\/upload\//i.test(String((s as any).media_url ?? s.image_url)) ? (
                      <video
                        src={String((s as any).media_url ?? s.image_url)}
                        className="w-full h-56 object-cover"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={String((s as any).media_url ?? s.image_url)}
                        alt={s.title}
                        className="w-full h-56 object-cover"
                        loading="lazy"
                      />
                    ))
                  ) : (
                    <div className="w-full h-56 bg-gradient-to-br from-muted via-muted/70 to-muted/40" />
                  )}
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground line-clamp-1">{s.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {author?.full_name ?? "Traveler"} · {new Date(s.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {author?.avatar_url ? (
                        <img
                          src={author.avatar_url}
                          alt={author.full_name ?? "Traveler"}
                          className="w-9 h-9 rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-muted" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-4">{s.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Post a story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="storyTitle">Title</Label>
              <Input id="storyTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My trip to Lake Kivu…" />
            </div>
            <div>
              <Label htmlFor="storyBody">Story</Label>
              <Textarea id="storyBody" value={body} onChange={(e) => setBody(e.target.value)} placeholder="What happened? What did you love?" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <CloudinaryUploadDialog
                title="Upload story media"
                folder="stories"
                multiple={false}
                accept="image/*,video/*"
                value={mediaUrl ? [mediaUrl] : []}
                onChange={(urls) => setMediaUrl(urls[0] ?? null)}
                buttonLabel={mediaUrl ? "Replace" : "Add image/video"}
              />
              {mediaUrl ? <span className="text-xs text-muted-foreground">{mediaType === "video" ? "Video attached" : "Image attached"}</span> : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={saving}>
                {saving ? "Posting..." : "Post"}
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

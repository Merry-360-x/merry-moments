import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CloudinaryUploadDialog } from "@/components/CloudinaryUploadDialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Image as ImageIcon, Video } from "lucide-react";
import { uiErrorMessage } from "@/lib/ui-errors";

const isVideoUrl = (url: string) => /\/video\/upload\//i.test(url) || /\.(mp4|webm|mov|m4v|avi)(\?.*)?$/i.test(url);

export default function CreateStory() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const getStorageKey = useCallback(
    () => (user?.id ? `create-story-draft-${user.id}` : "create-story-draft-anonymous"),
    [user?.id]
  );
  const getAnonymousStorageKey = useCallback(() => "create-story-draft-anonymous", []);
  const getDraftLookupKeys = useCallback(() => {
    const primaryKey = getStorageKey();
    return user?.id ? [primaryKey, getAnonymousStorageKey()] : [primaryKey];
  }, [getStorageKey, getAnonymousStorageKey, user?.id]);

  const hasDraftContent = Boolean(title.trim() || location.trim() || body.trim() || mediaUrls.length > 0);

  const selectedMedia = mediaUrls[0] || "";
  const mediaType = useMemo(() => {
    if (!selectedMedia) return null;
    return isVideoUrl(selectedMedia) ? "video" : "image";
  }, [selectedMedia]);

  useEffect(() => {
    if (isLoading) return;
    if (draftLoaded) return;

    const primaryDraftKey = getStorageKey();
    let restoredFromKey: string | null = null;
    let savedDraft: string | null = null;

    for (const key of getDraftLookupKeys()) {
      const value = localStorage.getItem(key);
      if (value) {
        restoredFromKey = key;
        savedDraft = value;
        break;
      }
    }

    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (typeof draft.title === "string") setTitle(draft.title);
        if (typeof draft.location === "string") setLocation(draft.location);
        if (typeof draft.body === "string") setBody(draft.body);
        if (Array.isArray(draft.mediaUrls)) setMediaUrls(draft.mediaUrls);
        if (restoredFromKey && restoredFromKey !== primaryDraftKey) {
          localStorage.setItem(primaryDraftKey, savedDraft);
          localStorage.removeItem(restoredFromKey);
        }
        toast({ title: "Draft restored", description: "Your previous story draft has been restored." });
      } catch (error) {
        console.error("Failed to restore story draft:", error);
      }
    }

    setDraftLoaded(true);
  }, [draftLoaded, getStorageKey, getDraftLookupKeys, toast, isLoading]);

  useEffect(() => {
    if (!draftLoaded) return;
    if (!hasDraftContent) return;

    const draftKey = getStorageKey();
    const timer = setTimeout(() => {
      const draft = {
        title,
        location,
        body,
        mediaUrls,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }, 700);

    return () => clearTimeout(timer);
  }, [title, location, body, mediaUrls, draftLoaded, getStorageKey, hasDraftContent]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!hasDraftContent) return;

      const draftKey = getStorageKey();
      const draft = {
        title,
        location,
        body,
        mediaUrls,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [title, location, body, mediaUrls, getStorageKey, hasDraftContent]);

  const submitStory = async () => {
    if (!user) {
      navigate("/auth?redirect=/create-story");
      return;
    }

    const safeTitle = title.trim();
    const safeBody = body.trim();

    if (!safeTitle) {
      toast({ variant: "destructive", title: "Title required", description: "Please enter a story title." });
      return;
    }

    if (!safeBody) {
      toast({ variant: "destructive", title: "Story content required", description: "Please write your story." });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        title: safeTitle,
        body: safeBody,
        location: location.trim() || null,
        media_url: selectedMedia || null,
        image_url: mediaType === "image" ? selectedMedia : null,
        media_type: mediaType,
      };

      const { error } = await supabase.from("stories").insert(payload as never);
      if (error) throw error;

      localStorage.removeItem(getStorageKey());

      toast({ title: "Story published", description: "Your story has been posted successfully." });
      navigate("/dashboard");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not publish story",
        description: uiErrorMessage(error, "Please try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto max-w-3xl px-4 lg:px-8 py-10">
        <Card className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Add Story</h1>
            <p className="text-muted-foreground">Share your travel experience with a title, description, and optional media.</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="story-title">Title</Label>
              <Input
                id="story-title"
                placeholder="My favorite place in Rwanda"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="story-location">Location (optional)</Label>
              <Input
                id="story-location"
                placeholder="Kigali, Rwanda"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="story-body">Story</Label>
              <Textarea
                id="story-body"
                placeholder="Write your experience..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-40"
              />
            </div>

            <div>
              <Label>Media (optional)</Label>
              <div className="mt-2 flex items-center gap-3">
                <CloudinaryUploadDialog
                  title="Upload story media"
                  folder="merry360/stories"
                  accept="image/*,video/*"
                  multiple={false}
                  maxFiles={1}
                  autoStart={true}
                  value={mediaUrls}
                  onChange={setMediaUrls}
                  trigger={
                    <Button type="button" variant="outline" className="gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Media
                    </Button>
                  }
                />
                {selectedMedia ? (
                  <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
                    {mediaType === "video" ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                    Media selected
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Cancel</Button>
            <Button type="button" onClick={submitStory} disabled={saving}>
              {saving ? "Publishing..." : "Publish Story"}
            </Button>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}

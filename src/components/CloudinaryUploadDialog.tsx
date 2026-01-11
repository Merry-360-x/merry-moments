import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadFile } from "@/lib/uploads";
import { Plus, Trash2, UploadCloud, X } from "lucide-react";

type UploadItem = {
  id: string;
  file: File;
  previewUrl: string | null;
  percent: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
  url?: string;
};

const isImageUrl = (url: string) =>
  /\/image\/upload\//i.test(url) || /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url);
const isVideoUrl = (url: string) =>
  /\/video\/upload\//i.test(url) || /\.(mp4|webm|mov|m4v|avi)(\?.*)?$/i.test(url);

export function CloudinaryUploadDialog(props: {
  title: string;
  folder: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  buttonLabel?: string;
  trigger?: React.ReactNode;
  value: string[];
  onChange: (urls: string[]) => void;
  autoStart?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const autoStart = props.autoStart ?? false;
  const [dragActive, setDragActive] = useState(false);

  const canAddMore = useMemo(() => {
    const max = props.maxFiles ?? (props.multiple ? 20 : 1);
    return props.value.length < max;
  }, [props.maxFiles, props.multiple, props.value.length]);

  const pickFiles = () => inputRef.current?.click();

  const enqueue = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const max = props.maxFiles ?? (props.multiple ? 20 : 1);

    const next: UploadItem[] = [];
    for (const f of Array.from(files)) {
      if (props.value.length + next.length >= max) break;
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      next.push({
        id,
        file: f,
        previewUrl: (f.type.startsWith("image/") || f.type.startsWith("video/")) ? URL.createObjectURL(f) : null,
        percent: 0,
        status: "queued",
      });
    }
    setItems((prev) => [...prev, ...next]);
  };

  const queuedCount = items.filter((i) => i.status === "queued").length;
  const uploadedCount = items.filter((i) => i.status === "done").length;
  const totalCount = items.length;
  const averageProgress = useMemo(() => {
    if (!items.length) return 0;
    const sum = items.reduce((acc, it) => acc + Number(it.percent ?? 0), 0);
    return Math.round(sum / items.length);
  }, [items]);

  const primaryItem = items[0] ?? null;

  const startUploads = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Upload sequentially to keep the progress UI stable.
      for (const it of items) {
        if (it.status !== "queued") continue;
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: "uploading", percent: 1 } : p)));

        try {
          const res = await uploadFile(it.file, {
            folder: props.folder,
            onProgress: (percent) => {
              setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, percent } : x)));
            },
          });

          setItems((prev) =>
            prev.map((p) =>
              p.id === it.id ? { ...p, status: "done", percent: 100, url: res.url } : p
            )
          );
          props.onChange([...props.value, res.url]);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Upload failed";
          setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: "error", error: msg } : p)));
        }
      }
    } finally {
      setBusy(false);
    }
  };

  // Auto-start uploads AFTER items are enqueued (optional).
  useEffect(() => {
    if (!autoStart) return;
    if (!open) return;
    if (busy) return;
    if (!items.some((i) => i.status === "queued")) return;
    void startUploads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, open, busy, items.length]);

  const removeExisting = (url: string) => {
    props.onChange(props.value.filter((u) => u !== url));
  };

  const clearItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      const found = prev.find((p) => p.id === id);
      if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);
      return next;
    });
  };

  const closeDialog = () => {
    setOpen(false);
    setDragActive(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.trigger ? (
          props.trigger
        ) : (
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            {props.buttonLabel ?? "Upload"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="p-0 max-w-3xl overflow-hidden">
        {/* Top bar */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <button type="button" onClick={closeDialog} className="h-10 w-10 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">{props.title}</div>
            <div className="text-sm text-muted-foreground">
              {totalCount === 0
                ? "No items selected"
                : busy
                ? `${uploadedCount} of ${totalCount} items uploaded`
                : `${totalCount} item${totalCount === 1 ? "" : "s"} selected`}
            </div>
          </div>
          <button
            type="button"
            onClick={pickFiles}
            disabled={!canAddMore}
            className="h-10 w-10 rounded-full hover:bg-muted disabled:opacity-50 flex items-center justify-center"
            aria-label="Add"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        {busy ? <Progress value={averageProgress} className="h-1 rounded-none" /> : <div className="h-1" />}

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Dropzone */}
          {totalCount === 0 ? (
            <div
              className={`w-full rounded-2xl border-2 border-dashed p-10 transition-colors ${
                dragActive ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                enqueue(e.dataTransfer.files);
              }}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
                  <UploadCloud className="w-10 h-10 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-foreground">Drag and drop</div>
                <div className="text-muted-foreground">or browse for photos</div>
                <Button type="button" className="px-10" onClick={pickFiles}>
                  Browse
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center">
              <div className="relative w-full max-w-xl rounded-2xl overflow-hidden bg-muted border border-border">
                {primaryItem?.previewUrl ? (
                  primaryItem.file.type.startsWith("video/") ? (
                    <video src={primaryItem.previewUrl} className="w-full h-[320px] object-cover" controls playsInline />
                  ) : (
                    <img src={primaryItem.previewUrl} alt={primaryItem.file.name} className="w-full h-[320px] object-cover" />
                  )
                ) : (
                  <div className="w-full h-[320px]" />
                )}

                {/* remove */}
                <button
                  type="button"
                  onClick={() => (primaryItem ? clearItem(primaryItem.id) : null)}
                  className="absolute top-4 right-4 h-11 w-11 rounded-full bg-black/70 text-white flex items-center justify-center"
                  aria-label="Remove"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                {/* uploading overlay */}
                {primaryItem?.status === "uploading" ? (
                  <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                    <div className="h-14 w-14 rounded-full bg-black/35 flex items-center justify-center">
                      <div className="h-10 w-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={props.accept ?? "image/*,video/*"}
            multiple={Boolean(props.multiple)}
            className="hidden"
            onChange={(e) => {
              enqueue(e.target.files);
              e.currentTarget.value = "";
            }}
          />

          {/* Uploaded thumbnails (optional) */}
          {props.value.length ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground">Uploaded</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {props.value.map((url) => (
                  <div key={url} className="relative rounded-xl overflow-hidden border border-border bg-muted">
                    {isImageUrl(url) ? (
                      <img src={url} alt="Uploaded" className="h-24 w-full object-cover" loading="lazy" />
                    ) : isVideoUrl(url) ? (
                      <video src={url} className="h-24 w-full object-cover" muted playsInline controls preload="metadata" />
                    ) : (
                      <div className="h-24 w-full flex items-center justify-center text-xs text-muted-foreground px-2 break-all">
                        {url}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExisting(url)}
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/70 text-white flex items-center justify-center"
                      aria-label="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Status (kept intentionally minimal as requested) */}
        </div>

        {/* Bottom bar */}
        <div className="px-6 py-5 border-t border-border flex items-center justify-between">
          <button
            type="button"
            className="text-lg font-medium text-foreground"
            onClick={closeDialog}
          >
            {totalCount === 0 ? "Done" : "Cancel"}
          </button>
          <Button
            type="button"
            className="px-10 h-12 rounded-xl"
            onClick={startUploads}
            disabled={busy || queuedCount === 0}
          >
            Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


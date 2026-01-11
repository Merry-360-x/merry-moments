import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadFile } from "@/lib/uploads";
import { X, UploadCloud } from "lucide-react";

type UploadItem = {
  id: string;
  file: File;
  previewUrl: string | null;
  percent: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
  url?: string;
};

const isImageUrl = (url: string) => /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url);

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
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);

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
        previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
        percent: 0,
        status: "queued",
      });
    }
    setItems((prev) => [...prev, ...next]);
  };

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dropzone */}
          <button
            type="button"
            onClick={pickFiles}
            disabled={!canAddMore}
            className="w-full rounded-xl border border-dashed border-border p-6 text-left hover:bg-muted/40 transition-colors disabled:opacity-60"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <UploadCloud className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground">Click to select {props.multiple ? "files" : "a file"}</div>
                <div className="text-sm text-muted-foreground">
                  You’ll see real-time progress as files upload to Cloudinary.
                </div>
              </div>
            </div>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept={props.accept ?? "image/*"}
            multiple={Boolean(props.multiple)}
            className="hidden"
            onChange={(e) => {
              enqueue(e.target.files);
              e.currentTarget.value = "";
              setTimeout(() => startUploads(), 0);
            }}
          />

          {/* Existing URLs */}
          {props.value.length ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground">Uploaded</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {props.value.map((url) => (
                  <div key={url} className="relative rounded-lg overflow-hidden border border-border bg-muted">
                    {isImageUrl(url) ? (
                      <img src={url} alt="Uploaded" className="h-28 w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="h-28 w-full flex items-center justify-center text-xs text-muted-foreground px-2 break-all">
                        {url}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExisting(url)}
                      className="absolute top-1 right-1 rounded bg-background/80 px-2 py-1 text-xs hover:bg-background"
                      aria-label="Remove"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Upload queue */}
          {items.length ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground">Uploading</div>
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{it.file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {it.status === "error" ? it.error : it.status}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => clearItem(it.id)}
                        className="p-1 rounded hover:bg-muted"
                        aria-label="Remove from queue"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <Progress value={it.percent} className="h-2" />
                      <div className="text-xs text-muted-foreground mt-1">{it.percent}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}


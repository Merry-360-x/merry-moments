import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isVideoUrl } from "@/lib/media";
import { isWorkingImageUrl, optimizeCloudinaryImage } from "@/lib/cloudinary";

type Props = {
  images?: Array<string | null | undefined> | null;
  alt: string;
  className?: string;
  intervalMs?: number;
  /** Set true for cards in the initial viewport — loads first image eagerly at high priority */
  priority?: boolean;
};

export default function ListingImageCarousel({
  images,
  alt,
  className,
  intervalMs = 1200,
  priority = false,
}: Props) {
  const clean = useMemo(
    () => (images ?? []).map((x) => (typeof x === "string" ? x : "")).filter(Boolean).filter(isWorkingImageUrl),
    [images]
  );
  const [hover, setHover] = useState(false);
  const [idx, setIdx] = useState(0);
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(() => new Set([0]));
  const [errored, setErrored] = useState<Set<number>>(() => new Set());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setLoadedIndices(new Set([0]));
    setErrored(new Set());
  }, [clean.length]);

  useEffect(() => {
    if (clean.length === 0) return;
    setLoadedIndices((prev) => {
      const next = new Set(prev);
      next.add(idx);
      next.add((idx + 1) % clean.length);
      return next;
    });
  }, [idx, clean.length]);

  useEffect(() => {
    if (!hover || clean.length <= 1) return;
    timerRef.current = window.setInterval(() => {
      setIdx((v) => (v + 1) % clean.length);
    }, intervalMs);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [hover, clean.length, intervalMs]);

  useEffect(() => {
    if (!hover) setIdx(0);
  }, [hover]);

  const [imgLoaded, setImgLoaded] = useState(false);
  const handleError = useCallback((i: number) => {
    setErrored((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      if (i === 0) setImgLoaded(true);
      return next;
    });
  }, []);

  const hasAnyValidImage = useMemo(
    () => clean.some((_, i) => !errored.has(i)),
    [clean, errored]
  );

  if (clean.length === 0) {
    return (
      <div className={`bg-gradient-to-br from-muted via-muted/70 to-muted/40 ${className ?? ""}`} />
    );
  }

  return (
    <div
      className={`relative ${className ?? ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onTouchStart={() => setHover(true)}
      onTouchEnd={() => setHover(false)}
    >
      {/* Shimmer skeleton shown until first image loads */}
      {!imgLoaded && (
        <div className="absolute inset-0 bg-muted overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      )}
      <div
        className="h-full w-full flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {clean.map((src, i) => {
          if (errored.has(i)) {
            return (
              <div key={src} className="w-full h-full shrink-0 bg-gradient-to-br from-muted via-muted/70 to-muted/40" />
            );
          }
          return isVideoUrl(src) ? (
            <video
              key={src}
              src={loadedIndices.has(i) ? src : undefined}
              className="w-full h-full object-cover shrink-0"
              muted
              playsInline
              preload="metadata"
              onError={() => handleError(i)}
            />
          ) : (
            <img
              key={src}
              src={
                loadedIndices.has(i)
                  ? optimizeCloudinaryImage(src, { width: 480, height: 360, quality: 'auto:good', format: 'auto' })
                  : undefined
              }
              alt={alt}
              className="w-full h-full object-cover shrink-0"
              loading={i === 0 && priority ? "eager" : "lazy"}
              decoding={i === 0 && priority ? "sync" : "async"}
              fetchPriority={i === 0 && priority ? "high" : "auto"}
              onLoad={i === 0 ? () => setImgLoaded(true) : undefined}
              onError={() => handleError(i)}
            />
          );
        })}
      </div>

      {/* Dot indicators - Flutter style, max 5 dots */}
      {clean.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-[3px]">
          {(clean.length > 5 ? clean.slice(0, 5) : clean).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: idx === i ? 6 : 4,
                height: idx === i ? 6 : 4,
                backgroundColor: idx === i ? "#FFFFFF" : "rgba(255,255,255,0.54)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
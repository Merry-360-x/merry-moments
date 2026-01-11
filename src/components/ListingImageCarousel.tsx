import { useEffect, useMemo, useRef, useState } from "react";
import { isVideoUrl } from "@/lib/media";

type Props = {
  images?: Array<string | null | undefined> | null;
  alt: string;
  className?: string;
  intervalMs?: number;
};

export default function ListingImageCarousel({
  images,
  alt,
  className,
  intervalMs = 1200,
}: Props) {
  const clean = useMemo(
    () => (images ?? []).map((x) => (typeof x === "string" ? x : "")).filter(Boolean),
    [images]
  );
  const [hover, setHover] = useState(false);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<number | null>(null);

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

  if (clean.length === 0) {
    return <div className={className ?? ""} />;
  }

  return (
    <div
      className={className ?? ""}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onTouchStart={() => setHover(true)}
      onTouchEnd={() => setHover(false)}
    >
      <div
        className="h-full w-full flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {clean.map((src) => (
          isVideoUrl(src) ? (
            <video
              key={src}
              src={src}
              className="w-full h-full object-cover shrink-0"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              key={src}
              src={src}
              alt={alt}
              className="w-full h-full object-cover shrink-0"
              loading="lazy"
            />
          )
        ))}
      </div>
    </div>
  );
}


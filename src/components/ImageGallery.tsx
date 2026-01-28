import { useState, useMemo } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { optimizeCloudinaryImage } from "@/lib/cloudinary";
import { isVideoUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type Props = {
  images?: Array<string | null | undefined> | null;
  alt: string;
  className?: string;
};

export default function ImageGallery({ images, alt, className }: Props) {
  const clean = useMemo(
    () => (images ?? []).map((x) => (typeof x === "string" ? x : "")).filter(Boolean),
    [images]
  );

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (clean.length === 0) {
    return (
      <div className={cn("bg-muted rounded-lg flex items-center justify-center", className)}>
        <span className="text-muted-foreground">No images</span>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = "";
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % clean.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + clean.length) % clean.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") goNext();
    if (e.key === "ArrowLeft") goPrev();
  };

  // Grid layout based on number of images
  const renderGrid = () => {
    if (clean.length === 1) {
      return (
        <div 
          className="w-full aspect-[16/9] cursor-pointer overflow-hidden rounded-xl"
          onClick={() => openLightbox(0)}
        >
          {renderMedia(clean[0], 0, "w-full h-full object-cover hover:scale-105 transition-transform duration-300")}
        </div>
      );
    }

    if (clean.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-2 aspect-[16/9]">
          {clean.map((src, i) => (
            <div
              key={src}
              className="cursor-pointer overflow-hidden rounded-xl"
              onClick={() => openLightbox(i)}
            >
              {renderMedia(src, i, "w-full h-full object-cover hover:scale-105 transition-transform duration-300")}
            </div>
          ))}
        </div>
      );
    }

    if (clean.length === 3) {
      return (
        <div className="grid grid-cols-2 gap-2 aspect-[16/9]">
          <div
            className="row-span-2 cursor-pointer overflow-hidden rounded-xl"
            onClick={() => openLightbox(0)}
          >
            {renderMedia(clean[0], 0, "w-full h-full object-cover hover:scale-105 transition-transform duration-300")}
          </div>
          <div className="grid gap-2">
            {clean.slice(1).map((src, i) => (
              <div
                key={src}
                className="cursor-pointer overflow-hidden rounded-xl"
                onClick={() => openLightbox(i + 1)}
              >
                {renderMedia(src, i + 1, "w-full h-full object-cover hover:scale-105 transition-transform duration-300")}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (clean.length === 4) {
      return (
        <div className="grid grid-cols-4 gap-2">
          <div
            className="col-span-2 row-span-2 aspect-square cursor-pointer overflow-hidden rounded-xl"
            onClick={() => openLightbox(0)}
          >
            {renderMedia(clean[0], 0, "w-full h-full object-cover hover:scale-105 transition-transform duration-300")}
          </div>
          {clean.slice(1).map((src, i) => (
            <div
              key={src}
              className="aspect-square cursor-pointer overflow-hidden rounded-xl"
              onClick={() => openLightbox(i + 1)}
            >
              {renderMedia(src, i + 1, "w-full h-full object-cover hover:scale-105 transition-transform duration-300")}
            </div>
          ))}
        </div>
      );
    }

    // 5+ images: main image + 4 small ones, with "show more" overlay
    return (
      <div className="grid grid-cols-4 gap-2">
        <div
          className="col-span-2 row-span-2 aspect-square cursor-pointer overflow-hidden rounded-xl"
          onClick={() => openLightbox(0)}
        >
          {renderMedia(clean[0], 0, "w-full h-full object-cover hover:scale-105 transition-transform duration-300")}
        </div>
        {clean.slice(1, 5).map((src, i) => (
          <div
            key={src}
            className="aspect-square cursor-pointer overflow-hidden rounded-xl relative"
            onClick={() => openLightbox(i + 1)}
          >
            {renderMedia(src, i + 1, "w-full h-full object-cover hover:scale-105 transition-transform duration-300")}
            {i === 3 && clean.length > 5 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-medium">
                +{clean.length - 5} more
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderMedia = (src: string, index: number, mediaClassName: string) => {
    if (isVideoUrl(src)) {
      return (
        <video
          src={src}
          className={mediaClassName}
          muted
          playsInline
          preload="metadata"
        />
      );
    }
    return (
      <img
        src={optimizeCloudinaryImage(src, { width: 600, height: 400, quality: "auto", format: "auto" })}
        alt={`${alt} ${index + 1}`}
        className={mediaClassName}
        loading={index === 0 ? "eager" : "lazy"}
        decoding="async"
      />
    );
  };

  return (
    <>
      <div className={className}>{renderGrid()}</div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-50"
            onClick={closeLightbox}
          >
            <X className="w-8 h-8" />
          </button>

          {/* Previous button */}
          {clean.length > 1 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
            >
              <ChevronLeft className="w-10 h-10" />
            </button>
          )}

          {/* Image */}
          <div
            className="max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {isVideoUrl(clean[currentIndex]) ? (
              <video
                src={clean[currentIndex]}
                className="max-w-full max-h-[90vh] object-contain"
                controls
                autoPlay
                muted
              />
            ) : (
              <img
                src={optimizeCloudinaryImage(clean[currentIndex], { width: 1600, height: 1200, quality: "auto", format: "auto" })}
                alt={`${alt} ${currentIndex + 1}`}
                className="max-w-full max-h-[90vh] object-contain"
              />
            )}
          </div>

          {/* Next button */}
          {clean.length > 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
            >
              <ChevronRight className="w-10 h-10" />
            </button>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {currentIndex + 1} / {clean.length}
          </div>

          {/* Thumbnail strip */}
          {clean.length > 1 && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2 max-w-[80vw] overflow-x-auto pb-2">
              {clean.map((src, i) => (
                <button
                  key={src}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(i);
                  }}
                  className={cn(
                    "w-16 h-12 rounded overflow-hidden shrink-0 border-2 transition-all",
                    i === currentIndex ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  {isVideoUrl(src) ? (
                    <video src={src} className="w-full h-full object-cover" muted />
                  ) : (
                    <img
                      src={optimizeCloudinaryImage(src, { width: 100, height: 75, quality: "auto", format: "auto" })}
                      alt={`Thumbnail ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

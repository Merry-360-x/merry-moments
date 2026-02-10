import { ImgHTMLAttributes, useState } from "react";
import { useTranslation } from "react-i18next";
import { optimizeCloudinaryImage } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: 'auto' | number;
  className?: string;
  loading?: 'lazy' | 'eager';
}

/**
 * Optimized image component with automatic Cloudinary transformations
 * Features: lazy loading, responsive sizing, automatic format conversion, progressive loading
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  quality = 'auto',
  className,
  loading = 'lazy',
  ...props
}: OptimizedImageProps) {
  const { t } = useTranslation();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Optimize the image URL if it's from Cloudinary
  const optimizedSrc = optimizeCloudinaryImage(src, {
    width,
    height,
    quality,
    format: 'auto',
  });

  // Create a low-quality placeholder for better UX
  const placeholderSrc = src.includes('cloudinary.com')
    ? optimizeCloudinaryImage(src, { width: 20, quality: 30, format: 'auto' })
    : undefined;

  if (hasError) {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center text-muted-foreground text-sm",
          className
        )}
        style={{ width, height }}
      >
        <span>{t("common.imageUnavailable")}</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)} style={{ width, height }}>
      {/* Blurred placeholder */}
      {placeholderSrc && !isLoaded && (
        <img
          src={placeholderSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-md scale-110"
          aria-hidden="true"
        />
      )}
      
      {/* Main image */}
      <img
        src={optimizedSrc}
        alt={alt}
        loading={loading}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        {...props}
      />
      
      {/* Loading state */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

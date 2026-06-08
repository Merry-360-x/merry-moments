/**
 * Shared Cloudinary Configuration
 * Single source of truth for both Web and Flutter platforms
 */

export const CLOUDINARY_CONFIG = {
  /** Cloudinary cloud name - MUST be identical across all platforms */
  cloudName: 'dghg9uebh',
  
  /** Unsigned upload preset - MUST be identical across all platforms */
  uploadPreset: 'MERRY360X',
  
  /** Cloudinary cloud names that are disabled and should never be used for display */
  disabledCloudNames: ['dxdblhmbm'] as const,
  
  /** Default transformation string for optimized delivery */
  defaultTransformations: 'f_auto,q_auto:eco,dpr_auto,c_limit,w_1200',
  
  /** Base URL for Cloudinary delivery */
  get baseUrl() {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload`;
  },
  
  /** Upload API endpoint */
  get uploadUrl() {
    return `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
  },
} as const;

/**
 * Check if a Cloudinary URL is from a disabled cloud account
 */
export function isWorkingImageUrl(url: string): boolean {
  try {
    const uri = new URL(url);
    if (uri.host === 'res.cloudinary.com') {
      const segments = uri.pathname.split('/').filter(Boolean);
      if (segments.length > 0 && CLOUDINARY_CONFIG.disabledCloudNames.includes(segments[0] as any)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Optimize a Cloudinary image URL for faster loading
 * Adds automatic format conversion, quality optimization, and responsive sizing
 */
export function optimizeCloudinaryImage(
  url: string, 
  options?: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'thumb';
  }
): string {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill'
  } = options || {};
  
  // Build transformation string
  const transformations: string[] = [];
  
  transformations.push(`f_${format}`);
  transformations.push(`q_${quality}`);
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (width || height) transformations.push(`c_${crop}`);
  
  transformations.push('fl_progressive');
  
  const transformStr = transformations.join(',');
  
  // Insert transformations into the URL
  return url.replace(/\/upload\//, `/upload/${transformStr}/`);
}

/**
 * Get responsive image sizes for different breakpoints
 */
export function getResponsiveImageUrl(
  url: string, 
  size: 'thumbnail' | 'small' | 'medium' | 'large' | 'hero'
): string {
  const sizeMap = {
    thumbnail: { width: 150, height: 150, crop: 'thumb' as const },
    small: { width: 400, height: 300 },
    medium: { width: 800, height: 600 },
    large: { width: 1200, height: 900 },
    hero: { width: 1920, height: 1080 },
  };
  
  return optimizeCloudinaryImage(url, sizeMap[size]);
}

/**
 * Resolve a listing image URL to a fully qualified HTTPS URL
 * Handles various input formats: relative paths, Cloudinary public IDs, full URLs
 */
export function resolveListingImageUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  
  const trimmed = raw.trim();
  if (!trimmed) return null;
  
  // Already a full HTTP(S) URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return isWorkingImageUrl(trimmed) ? trimmed : null;
  }
  
  // Protocol-relative URL
  if (trimmed.startsWith('//')) {
    const resolved = `https:${trimmed}`;
    return isWorkingImageUrl(resolved) ? resolved : null;
  }
  
  // Cloudinary URL without protocol
  if (trimmed.startsWith('res.cloudinary.com/')) {
    const resolved = `https://${trimmed}`;
    return isWorkingImageUrl(resolved) ? resolved : null;
  }
  
  // Assume it's a Cloudinary public ID - apply default transformations
  const resolved = `${CLOUDINARY_CONFIG.baseUrl}/${CLOUDINARY_CONFIG.defaultTransformations}/${trimmed}`;
  return isWorkingImageUrl(resolved) ? resolved : null;
}

/**
 * Resolve all images for a listing (carousel support)
 */
export function resolveListingImages(
  images: (string | null | undefined)[] | null | undefined,
  mainImage?: string | null
): string[] {
  const urls = new Set<string>();
  
  // Process images array
  if (Array.isArray(images)) {
    for (const img of images) {
      const resolved = resolveListingImageUrl(img);
      if (resolved) urls.add(resolved);
    }
  }
  
  // Process main image as fallback
  if (urls.size === 0 && mainImage) {
    const resolved = resolveListingImageUrl(mainImage);
    if (resolved) urls.add(resolved);
  }
  
  return Array.from(urls);
}

export type { CLOUDINARY_CONFIG };
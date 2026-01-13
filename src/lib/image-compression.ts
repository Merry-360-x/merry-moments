/**
 * Client-side image compression to reduce upload time
 * Compresses images before uploading to Cloudinary
 */

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  useWebWorker?: boolean;
}

/**
 * Compress an image file before upload
 * Reduces file size by 60-90% for faster uploads
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // Skip compression for non-images or already small files
  if (!file.type.startsWith('image/') || file.size < 100 * 1024) {
    return file;
  }

  // Skip compression for formats that might not be supported
  const unsupportedTypes = ['image/heic', 'image/heif', 'image/tiff', 'image/bmp'];
  if (unsupportedTypes.includes(file.type.toLowerCase())) {
    console.log('[compression] Skipping unsupported format:', file.type);
    return file;
  }

  const {
    maxSizeMB = 1, // Target max size 1MB
    maxWidthOrHeight = 1920, // Max dimension 1920px
    quality = 0.8, // 80% quality
  } = options;

  try {
    // Create image element
    const img = await createImageBitmap(file);
    
    // Calculate new dimensions
    let { width, height } = img;
    
    if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
      const ratio = Math.min(maxWidthOrHeight / width, maxWidthOrHeight / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    // Create canvas and compress
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Use better image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    
    // Convert to blob with compression
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to compress image'));
        },
        'image/jpeg', // Always use JPEG for better compression
        quality
      );
    });
    
    // If compressed size is still too large, reduce quality further
    if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.5) {
      return compressImage(file, { ...options, quality: quality - 0.1 });
    }
    
    // Create new File object with compressed data
    const compressedFile = new File([blob], file.name, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    
    // Only use compressed version if it's actually smaller
    return compressedFile.size < file.size ? compressedFile : file;
    
  } catch (error) {
    console.error('Image compression failed:', error);
    return file; // Return original on error
  }
}

/**
 * Compress multiple images in parallel
 */
export async function compressImages(
  files: File[],
  options?: CompressionOptions
): Promise<File[]> {
  return Promise.all(files.map(file => compressImage(file, options)));
}

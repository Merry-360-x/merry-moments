import { supabase } from "@/integrations/supabase/client";
import { isCloudinaryConfigured, uploadFileToCloudinary } from "@/lib/cloudinary";
import { compressImage } from "@/lib/image-compression";

const randomId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export async function uploadFile(
  file: File,
  opts: { folder: string; onProgress?: (percent: number) => void }
): Promise<{ url: string }> {
  try {
    // Only compress images, skip PDFs and other file types
    let fileToUpload = file;
    try {
      if (file.type.startsWith('image/') && !file.type.includes('svg')) {
        const startSize = file.size;
        fileToUpload = await compressImage(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1920, quality: 0.82 });
        const savedKB = Math.round((startSize - fileToUpload.size) / 1024);
        if (savedKB > 0) {
          console.log(`[uploads] Compressed ${file.name}: saved ${savedKB}KB`);
        }
      }
    } catch (compressError) {
      console.warn("[uploads] Image compression failed, using original:", compressError);
      fileToUpload = file;
    }
    
    if (isCloudinaryConfigured()) {
      const res = await uploadFileToCloudinary(fileToUpload, {
        folder: opts.folder,
        onProgress: (progress) => {
          opts.onProgress?.(progress.percent);
        },
      });
      return { url: res.secureUrl };
    }

    // Fallback to Supabase Storage (public bucket).
    const path = `${opts.folder}/${randomId()}-${fileToUpload.name}`.replaceAll("//", "/");
    const { error } = await supabase.storage.from("uploads").upload(path, fileToUpload, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;

    const { data } = supabase.storage.from("uploads").getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("Could not get public URL for uploaded file.");
    return { url: data.publicUrl };
  } catch (error) {
    console.error("[uploads] Upload failed:", error);
    throw error;
  }
}


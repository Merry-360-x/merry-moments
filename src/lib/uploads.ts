import { supabase } from "@/integrations/supabase/client";
import { isCloudinaryConfigured, uploadFileToCloudinary } from "@/lib/cloudinary";
import { compressImage } from "@/lib/image-compression";

const randomId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export async function uploadFile(
  file: File,
  opts: { folder: string; onProgress?: (percent: number) => void }
): Promise<{ url: string }> {
  try {
    // PDFs and documents should go directly to Supabase Storage
    // Cloudinary unsigned presets typically don't support "raw" resource type
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf');
    const isDocument = file.type.includes('document') || file.type.includes('sheet') || file.type.includes('presentation');
    
    if (isPDF || isDocument) {
      console.log(`[uploads] Uploading ${file.name} to Supabase Storage (documents/PDFs not supported in unsigned Cloudinary)`);
      const path = `${opts.folder}/${randomId()}-${file.name}`.replaceAll("//", "/");
      const { error } = await supabase.storage.from("uploads").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;

      const { data } = supabase.storage.from("uploads").getPublicUrl(path);
      if (!data?.publicUrl) throw new Error("Could not get public URL for uploaded file.");
      return { url: data.publicUrl };
    }
    
    // Only compress images, skip SVGs
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
    
    // Use Cloudinary for images and videos
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


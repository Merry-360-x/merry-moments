import { supabase } from "@/integrations/supabase/client";
import { isCloudinaryConfigured, uploadFileToCloudinary } from "@/lib/cloudinary";
import { compressImage } from "@/lib/image-compression";

const randomId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export async function uploadFile(
  file: File,
  opts: { folder: string; onProgress?: (percent: number) => void }
): Promise<{ url: string }> {
  // Compress image before upload to reduce upload time by 60-90%
  const fileToUpload = file.type.startsWith('image/') 
    ? await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, quality: 0.85 })
    : file;
  
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
}


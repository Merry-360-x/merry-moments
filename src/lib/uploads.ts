import { supabase } from "@/integrations/supabase/client";
import { isCloudinaryConfigured, uploadFileToCloudinary } from "@/lib/cloudinary";

const randomId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export async function uploadFile(
  file: File,
  opts: { folder: string; onProgress?: (percent: number) => void }
): Promise<{ url: string }> {
  if (isCloudinaryConfigured()) {
    const res = await uploadFileToCloudinary(file, {
      folder: opts.folder,
      onProgress: opts.onProgress,
    });
    return { url: res.secureUrl };
  }

  // Fallback to Supabase Storage (public bucket).
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


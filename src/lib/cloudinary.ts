const readEnv = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const CLOUDINARY_CLOUD_NAME = readEnv(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);
const CLOUDINARY_UPLOAD_PRESET = readEnv(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

// NOTE: Do not hard-fail the app if Cloudinary env vars are missing.
// We support a Supabase Storage fallback uploader, and only use Cloudinary when configured.

export const isCloudinaryConfigured = () =>
  Boolean(CLOUDINARY_CLOUD_NAME) && Boolean(CLOUDINARY_UPLOAD_PRESET);

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
  originalFilename?: string;
};

export type CloudinaryUploadProgress = {
  loaded: number;
  total: number;
  percent: number; // 0-100
};

export async function uploadFileToCloudinary(
  file: File,
  options?: { folder?: string; onProgress?: (p: CloudinaryUploadProgress) => void }
): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  // Use "auto" so unsigned uploads can accept images and videos.
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/auto/upload`;

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  if (options?.folder) form.append("folder", options.folder);

  // Prefer XHR for upload progress events.
  if (typeof XMLHttpRequest !== "undefined") {
    return await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint);
      xhr.responseType = "json";

      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const total = evt.total || 0;
        const loaded = evt.loaded || 0;
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        options?.onProgress?.({ loaded, total, percent });
      };

      xhr.onerror = () => reject(new Error("Cloudinary upload failed (network error)."));
      xhr.onload = () => {
        const ok = xhr.status >= 200 && xhr.status < 300;
        const json =
          (xhr.response as
            | {
                secure_url?: unknown;
                public_id?: unknown;
                original_filename?: unknown;
                error?: { message?: unknown };
              }
            | null) ?? null;
        if (!ok) {
          const message =
            (typeof json?.error?.message === "string" ? json.error.message : null) ||
            `Cloudinary upload failed (${xhr.status} ${xhr.statusText})`;
          reject(new Error(message));
          return;
        }
        resolve({
          secureUrl: String(json?.secure_url ?? ""),
          publicId: String(json?.public_id ?? ""),
          originalFilename:
            typeof json?.original_filename === "string" ? json.original_filename : undefined,
        });
      };

      xhr.send(form);
    });
  }

  // Fallback to fetch (no progress events)
  const res = await fetch(endpoint, { method: "POST", body: form });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.error?.message || `Cloudinary upload failed (${res.status} ${res.statusText})`;
    throw new Error(message);
  }
  return {
    secureUrl: String(json.secure_url ?? ""),
    publicId: String(json.public_id ?? ""),
    originalFilename: json.original_filename ? String(json.original_filename) : undefined,
  };
}

export async function uploadImageToCloudinary(
  file: File,
  options?: { folder?: string }
): Promise<CloudinaryUploadResult> {
  return await uploadFileToCloudinary(file, { folder: options?.folder });
}

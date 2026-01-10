const readEnv = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const CLOUDINARY_CLOUD_NAME = readEnv(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);
const CLOUDINARY_UPLOAD_PRESET = readEnv(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

const validateCloudinaryConfig = () => {
  const missing: string[] = [];
  if (!CLOUDINARY_CLOUD_NAME) missing.push("Missing VITE_CLOUDINARY_CLOUD_NAME");
  if (!CLOUDINARY_UPLOAD_PRESET) missing.push("Missing VITE_CLOUDINARY_UPLOAD_PRESET");
  if (missing.length === 0) return;

  const message =
    "Cloudinary is not configured. Image uploads will not work.\n" +
    missing.map((m) => `- ${m}`).join("\n") +
    "\n\nSet these in Vercel Environment Variables (Production + Preview) and redeploy.";

  if (import.meta.env.PROD) {
    throw new Error(message);
  }

  console.warn(message);
};

validateCloudinaryConfig();

export const isCloudinaryConfigured = () =>
  Boolean(CLOUDINARY_CLOUD_NAME) && Boolean(CLOUDINARY_UPLOAD_PRESET);

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
  originalFilename?: string;
};

export async function uploadImageToCloudinary(
  file: File,
  options?: { folder?: string }
): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
    CLOUDINARY_CLOUD_NAME
  )}/upload`;

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  if (options?.folder) form.append("folder", options.folder);

  const res = await fetch(endpoint, { method: "POST", body: form });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      json?.error?.message ||
      `Cloudinary upload failed (${res.status} ${res.statusText})`;
    throw new Error(message);
  }

  return {
    secureUrl: String(json.secure_url ?? ""),
    publicId: String(json.public_id ?? ""),
    originalFilename: json.original_filename ? String(json.original_filename) : undefined,
  };
}

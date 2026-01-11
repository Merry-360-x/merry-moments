export const isVideoUrl = (url: string) => {
  const u = String(url || "");
  if (!u) return false;
  if (/\/video\/upload\//i.test(u)) return true;
  return /\.(mp4|webm|mov|m4v|avi)(\?.*)?$/i.test(u);
};


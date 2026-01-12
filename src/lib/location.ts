/**
 * Extract the neighborhood/area part from a location string.
 * e.g., "Kigali, Remera" → "Remera"
 * e.g., "Rwanda, Kigali, Nyarutarama" → "Nyarutarama"
 */
export const extractNeighborhood = (location: string | null | undefined): string => {
  if (!location) return "";
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : location;
};

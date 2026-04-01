const CANONICAL_PROD_ORIGIN = "https://merry360x.com";

const CANONICAL_PROD_HOSTS = new Set([
  "merry360x.com",
  "www.merry360x.com",
]);

export function getSiteOrigin(): string {
  if (typeof window === "undefined") {
    return CANONICAL_PROD_ORIGIN;
  }

  const host = window.location.host.toLowerCase();
  if (CANONICAL_PROD_HOSTS.has(host)) {
    return CANONICAL_PROD_ORIGIN;
  }

  return window.location.origin;
}

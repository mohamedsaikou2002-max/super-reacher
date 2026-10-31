export function normalizeUrl(value: string, base?: string): string | null {
  try {
    const url = new URL(value, base);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return null;
  }
}

export function isSameDomain(candidate: string, officialWebsite: string): boolean {
  const left = normalizeUrl(candidate);
  const right = normalizeUrl(officialWebsite);
  if (!left || !right) return false;
  return new URL(left).hostname === new URL(right).hostname;
}

export const RESEARCH_PATHS = [
  "/",
  "/about",
  "/about-us",
  "/team",
  "/our-team",
  "/leadership",
  "/management",
  "/staff",
  "/founder",
  "/owners",
  "/contact",
  "/contact-us",
  "/locations",
  "/privacy",
  "/terms",
];

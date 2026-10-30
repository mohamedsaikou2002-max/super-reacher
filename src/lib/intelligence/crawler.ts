import { isSameDomain, normalizeUrl, RESEARCH_PATHS } from "./website";

export type CrawlPlan = { url: string; depth: number };

export function createCrawlPlan(officialWebsite: string, maxPages = 15): CrawlPlan[] {
  const root = normalizeUrl(officialWebsite);
  if (!root || maxPages < 1) return [];
  return RESEARCH_PATHS.map((path) => normalizeUrl(path, root))
    .filter((url): url is string => url !== null && isSameDomain(url, root))
    .slice(0, Math.min(maxPages, RESEARCH_PATHS.length))
    .map((url) => ({ url, depth: url === root ? 0 : 1 }));
}
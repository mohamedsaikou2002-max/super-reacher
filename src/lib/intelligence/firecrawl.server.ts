import { normalizeUrl, isSameDomain } from "./website";

type FirecrawlDocument = {
  markdown?: string;
  html?: string;
  metadata?: {
    title?: string;
    sourceURL?: string;
    url?: string;
    statusCode?: number;
  };
};

type FirecrawlCrawlResponse = {
  success?: boolean;
  id?: string;
  status?: string;
  completed?: number;
  total?: number;
  data?: FirecrawlDocument[];
};

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export type CrawledPage = {
  url: string;
  canonical_url: string;
  title: string;
  content: string;
  http_status: number | null;
  crawl_status: "completed";
};

function getFirecrawlKey(): string {
  const key = process.env["FIRECRAWL_API_KEY"]?.trim();
  if (!key) throw new Error("FIRECRAWL_API_KEY is not configured on the server.");
  return key;
}

function firecrawlHeaders(): HeadersInit {
  return { Authorization: `Bearer ${getFirecrawlKey()}`, "Content-Type": "application/json" };
}

function pageFromDocument(document: FirecrawlDocument, officialWebsite: string): CrawledPage | null {
  const source = document.metadata?.sourceURL ?? document.metadata?.url;
  const canonical = source ? normalizeUrl(source) : null;
  if (!canonical || !isSameDomain(canonical, officialWebsite)) return null;
  return {
    url: canonical,
    canonical_url: canonical,
    title: document.metadata?.title?.trim() ?? "",
    content: (document.markdown ?? document.html ?? "").trim(),
    http_status: document.metadata?.statusCode ?? null,
    crawl_status: "completed",
  };
}

export async function crawlOfficialWebsite(input: {
  officialWebsite: string;
  maxPages?: number;
  maxDepth?: number;
}): Promise<{ pages: CrawledPage[]; crawlId?: string }> {
  const officialWebsite = normalizeUrl(input.officialWebsite);
  if (!officialWebsite) throw new Error("A valid official website URL is required.");

  const response = await fetch("https://api.firecrawl.dev/v2/crawl", {
    method: "POST",
    headers: firecrawlHeaders(),
    body: JSON.stringify({
      url: officialWebsite,
      limit: Math.min(Math.max(input.maxPages ?? 15, 1), 50),
      maxDiscoveryDepth: Math.min(Math.max(input.maxDepth ?? 1, 0), 3),
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });
  if (!response.ok) throw new Error(`Firecrawl crawl request failed with HTTP ${response.status}.`);
  let body = (await response.json()) as FirecrawlCrawlResponse;
  if (body.id && !body.data?.length && body.status !== "completed") {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await sleep(1000);
      const statusResponse = await fetch(`https://api.firecrawl.dev/v2/crawl/${encodeURIComponent(body.id)}`, { headers: firecrawlHeaders() });
      if (!statusResponse.ok) throw new Error(`Firecrawl crawl status failed with HTTP ${statusResponse.status}.`);
      body = (await statusResponse.json()) as FirecrawlCrawlResponse;
      if (body.status === "completed" || body.status === "failed" || body.status === "cancelled") break;
    }
  }
  if (body.success === false) throw new Error("Firecrawl rejected the crawl request.");
  if (body.status === "failed" || body.status === "cancelled") throw new Error(`Firecrawl crawl ${body.status}.`);

  const pages = (body.data ?? [])
    .map((document) => pageFromDocument(document, officialWebsite))
    .filter((page): page is CrawledPage => Boolean(page));
  return { pages, crawlId: body.id };
}
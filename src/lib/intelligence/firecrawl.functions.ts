import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "node:crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { crawlOfficialWebsite } from "./firecrawl.server";

const CrawlInput = z.object({ businessId: z.string().uuid(), maxPages: z.number().int().min(1).max(50).optional(), maxDepth: z.number().int().min(0).max(3).optional() });
const RunInput = z.object({ runId: z.string().uuid(), maxPages: z.number().int().min(1).max(50).optional(), maxDepth: z.number().int().min(0).max(3).optional() });

async function processCrawlRun(input: { runId: string; userId: string; supabase: any; maxPages?: number; maxDepth?: number }) {
  const { data: run, error: runError } = await input.supabase
    .from("enrichment_runs")
    .select("id, business_id, status")
    .eq("id", input.runId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (runError || !run) throw new Error("Crawl run not found.");
  if (run.status === "completed") return { runId: run.id, status: "completed", pageCount: 0 };

  const { data: business, error: businessError } = await input.supabase
    .from("businesses")
    .select("id, official_website")
    .eq("id", run.business_id)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (businessError || !business) throw new Error("Business not found.");
  if (!business.official_website) {
    await input.supabase.from("enrichment_runs").update({ status: "blocked", error: "Missing official website", completed_at: new Date().toISOString() }).eq("id", run.id);
    return { runId: run.id, status: "blocked", pageCount: 0 };
  }

  await input.supabase.from("enrichment_runs").update({ status: "running", attempt: 1, started_at: new Date().toISOString(), error: null }).eq("id", run.id);
  try {
    const { getCredential } = await import("../integration-vault.server");
    let personalKey: string | null = null;
    try { personalKey = await getCredential(input.userId, "firecrawl"); } catch { /* deployment env fallback */ }
    const result = await crawlOfficialWebsite({ officialWebsite: business.official_website, maxPages: input.maxPages, maxDepth: input.maxDepth, ...(personalKey ? { apiKey: personalKey } : {}) });
    const rows = result.pages.map((page) => ({
      business_id: business.id,
      url: page.url,
      canonical_url: page.canonical_url,
      title: page.title,
      content: page.content,
      content_hash: createHash("sha256").update(page.content).digest("hex"),
      http_status: page.http_status,
      crawl_status: page.crawl_status,
      crawled_at: new Date().toISOString(),
    }));
    if (rows.length) await input.supabase.from("web_pages").upsert(rows, { onConflict: "business_id,canonical_url" });
    await input.supabase.from("enrichment_runs").update({ status: "completed", completed_at: new Date().toISOString(), error: null }).eq("id", run.id);
    await input.supabase.from("businesses").update({ website_status: "crawled", enrichment_status: "research_pending", updated_at: new Date().toISOString() }).eq("id", business.id);
    return { runId: run.id, status: "completed", pageCount: rows.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Firecrawl request failed.";
    await input.supabase.from("enrichment_runs").update({ status: "failed", error: message, completed_at: new Date().toISOString() }).eq("id", run.id);
    throw new Error(message);
  }
}

export const crawlBusinessWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CrawlInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: business, error } = await (context.supabase as any)
      .from("businesses")
      .select("id, official_website")
      .eq("id", data.businessId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !business) throw new Error("Business not found.");
    if (!business.official_website) throw new Error("This business does not have an official website to crawl.");

    const { getCredential } = await import("../integration-vault.server");
    let personalKey: string | null = null;
    try { personalKey = await getCredential(context.userId, "firecrawl"); } catch { /* deployment env fallback */ }
    const result = await crawlOfficialWebsite({ officialWebsite: business.official_website, maxPages: data.maxPages, maxDepth: data.maxDepth, ...(personalKey ? { apiKey: personalKey } : {}) });
    const rows = result.pages.map((page) => ({
      business_id: business.id,
      url: page.url,
      canonical_url: page.canonical_url,
      title: page.title,
      content: page.content,
      content_hash: createHash("sha256").update(page.content).digest("hex"),
      http_status: page.http_status,
      crawl_status: page.crawl_status,
      crawled_at: new Date().toISOString(),
    }));
    if (rows.length) {
      const { error: upsertError } = await (context.supabase as any).from("web_pages").upsert(rows, { onConflict: "business_id,canonical_url" });
      if (upsertError) throw new Error(upsertError.message);
    }
    return { crawlId: result.crawlId ?? null, pageCount: rows.length };
  });

export const queueAllBusinessWebsiteCrawls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const { data: businesses, error } = await supabase
      .from("businesses")
      .select("id, official_website")
      .eq("user_id", context.userId)
      .not("official_website", "is", null)
      .limit(1000);
    if (error) throw new Error(error.message);

    let queued = 0;
    for (const business of businesses ?? []) {
      const { data: activeRun } = await supabase
        .from("enrichment_runs")
        .select("id")
        .eq("user_id", context.userId)
        .eq("business_id", business.id)
        .eq("type", "crawl_website")
        .in("status", ["queued", "running"])
        .maybeSingle();
      if (activeRun) continue;
      const { error: insertError } = await supabase.from("enrichment_runs").insert({ user_id: context.userId, business_id: business.id, type: "crawl_website", status: "queued" });
      if (!insertError) queued += 1;
    }
    return { discovered: businesses?.length ?? 0, queued };
  });

export const runBusinessWebsiteCrawl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RunInput.parse(input))
  .handler(async ({ data, context }) => processCrawlRun({ runId: data.runId, userId: context.userId, supabase: context.supabase as any, maxPages: data.maxPages, maxDepth: data.maxDepth }));
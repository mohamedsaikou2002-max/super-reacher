import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** The UI queues work only. A separately configured trusted Scrapy worker executes it. */
export const queueScrapyWebsiteCrawls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    const { data: businesses, error } = await db
      .from("businesses")
      .select("id,official_website")
      .eq("user_id", context.userId)
      .not("official_website", "is", null)
      .limit(1000);
    if (error) throw new Error(error.message);
    let queued = 0;
    for (const business of businesses ?? []) {
      const { data: pending, error: lookupError } = await db
        .from("enrichment_runs")
        .select("id")
        .eq("user_id", context.userId)
        .eq("business_id", business.id)
        .eq("type", "crawl_website")
        .in("status", ["queued", "running"])
        .limit(1);
      if (lookupError) throw new Error(lookupError.message);
      if (pending?.length) continue;
      const { error: insertError } = await db.from("enrichment_runs").insert({
        user_id: context.userId, business_id: business.id, type: "crawl_website",
        status: "queued",
      });
      if (!insertError) queued++;
    }
    return { discovered: businesses?.length ?? 0, queued, engine: "scrapy-worker" as const };
  });

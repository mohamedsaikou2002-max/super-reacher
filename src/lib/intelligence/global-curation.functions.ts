import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REGISTRY_COUNTRIES } from "./registry-datasets";
import { curateRegistryBatch } from "./groq-curation.server";

const Input = z.object({
  country: z.enum(REGISTRY_COUNTRIES),
  niche: z.string().trim().min(2).max(250),
  limit: z.number().int().min(1).max(25).optional(),
  offset: z.number().int().min(0).max(1000000).optional(),
});
export const curateGlobalRawBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: rows, error } = await db
      .from("raw_businesses")
      .select(
        "id,user_id,business_name,country_code,industry,address,source,raw_source_url,source_record_id,raw_payload",
      )
      .eq("user_id", context.userId)
      .eq("country_code", data.country)
      .order("fetched_at", { ascending: false })
      .range(data.offset ?? 0, (data.offset ?? 0) + (data.limit ?? 20) - 1);
    if (error) throw new Error(error.message);
    if (!rows?.length) return { examined: 0, curated: 0, review: 0, rejected: 0 };
    const decisions = await curateRegistryBatch(
      data.niche,
      rows.map((r) => ({
        source_record_id: r.source_record_id,
        business_name: r.business_name,
        industry: r.industry,
        address: r.address,
        country_code: r.country_code,
      })),
    );
    const byId = new Map(decisions.map((r) => [r.source_record_id, r]));
    let curated = 0,
      review = 0,
      rejected = 0;
    for (const raw of rows) {
      const choice = byId.get(raw.source_record_id);
      if (!choice) {
        review += 1;
        continue;
      }
      const { data: existing, error: lookupError } = await db
        .from("businesses")
        .select("id")
        .eq("user_id", context.userId)
        .eq("country_code", data.country)
        .eq("registration_id", raw.source_record_id)
        .maybeSingle();
      if (lookupError) throw new Error(lookupError.message);
      let id = existing?.id;
      if (!id) {
        const inserted = await db
          .from("businesses")
          .insert({
            user_id: context.userId,
            business_name: raw.business_name,
            country_code: data.country,
            industry: raw.industry,
            registration_id: raw.source_record_id,
            enrichment_status: "pending",
            outreach_eligibility: "review",
          })
          .select("id")
          .single();
        if (inserted.error || !inserted.data)
          throw new Error(inserted.error?.message ?? "Business insertion failed.");
        id = inserted.data.id;
      }
      const source = await db.from("business_sources").upsert(
        {
          business_id: id,
          source_system: `registry-${data.country}`,
          source_url: raw.raw_source_url,
          source_record_id: raw.source_record_id,
          raw_data: raw.raw_payload,
        },
        { onConflict: "business_id,source_system,source_record_id" },
      );
      if (source.error) throw new Error(source.error.message);
      const status = !choice.relevant
        ? "rejected"
        : choice.relevance_score >= 70
          ? "curated"
          : "needs_review";
      const result = await db.from("curated_leads").upsert(
        {
          user_id: context.userId,
          raw_business_id: raw.id,
          business_id: id,
          niche_tag: choice.niche_tag,
          relevance_score: choice.relevance_score,
          relevance_note: choice.relevance_note,
          status,
        },
        { onConflict: "user_id,raw_business_id" },
      );
      if (result.error) throw new Error(result.error.message);
      if (status === "curated") curated += 1;
      else if (status === "needs_review") review += 1;
      else rejected += 1;
    }
    return { examined: rows.length, curated, review, rejected };
  });

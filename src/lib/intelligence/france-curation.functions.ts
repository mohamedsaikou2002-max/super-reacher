import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  query: z.string().trim().min(2).max(120),
  limit: z.number().int().min(1).max(50).optional(),
});

type Curation = { source_record_id: string; relevant: boolean; niche_tag: string; relevance_score: number; relevance_note: string };

async function curateWithGroq(query: string, records: Array<Record<string, any>>): Promise<Curation[]> {
  const key = process.env["GROQ_API_KEY"];
  if (!key) throw new Error("GROQ_API_KEY is not configured.");
  const compact = records.map((row) => ({
    source_record_id: row.source_record_id,
    business_name: row.business_name,
    industry: row.industry,
    address: row.address,
  }));
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You qualify French businesses against the user's B2B niche. Use only the supplied fields. Never infer contacts or claim facts not present. Return JSON with a results array; each item has source_record_id, relevant (boolean), niche_tag (string), relevance_score (integer 0-100), relevance_note (short string). Mark uncertain matches needs-review by setting relevant true only when supported by the supplied industry/name." },
        { role: "user", content: JSON.stringify({ target_niche: query, businesses: compact }) },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Groq curation failed (${response.status}).`);
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned an empty curation result.");
  let parsed: { results?: unknown };
  try { parsed = JSON.parse(text) as { results?: unknown }; }
  catch { throw new Error("Groq returned invalid JSON for curation."); }
  const itemSchema = z.object({
    source_record_id: z.string(), relevant: z.boolean(), niche_tag: z.string().max(80),
    relevance_score: z.number().int().min(0).max(100), relevance_note: z.string().max(500),
  });
  const results = z.array(itemSchema).parse(parsed.results);
  const allowedIds = new Set(records.map((row) => String(row.source_record_id)));
  return results.filter((item) => allowedIds.has(item.source_record_id));
}

export const curateFranceRawBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: records, error } = await supabase.from("raw_businesses")
      .select("id,user_id,business_name,country_code,industry,address,source,raw_source_url,source_record_id,raw_payload")
      .eq("user_id", context.userId).eq("country_code", "FR")
      .order("fetched_at", { ascending: false }).limit(data.limit ?? 25);
    if (error) throw new Error(error.message);
    if (!records?.length) return { examined: 0, curated: 0, rejected: 0 };

    const decisions = await curateWithGroq(data.query, records);
    const byId = new Map(decisions.map((decision) => [decision.source_record_id, decision]));
    let curated = 0;
    let rejected = 0;
    for (const raw of records) {
      const decision = byId.get(String(raw.source_record_id));
      if (!decision) continue;
      let { data: business, error: businessLookupError } = await supabase.from("businesses")
        .select("id").eq("user_id", context.userId).eq("country_code", "FR")
        .eq("registration_id", raw.source_record_id).maybeSingle();
      if (businessLookupError) throw new Error(businessLookupError.message);
      if (!business) {
        const inserted = await supabase.from("businesses").insert({
          user_id: context.userId, business_name: raw.business_name, country_code: "FR",
          industry: raw.industry, registration_id: raw.source_record_id,
          enrichment_status: "pending", outreach_eligibility: "review",
        }).select("id").single();
        if (inserted.error || !inserted.data) throw new Error(inserted.error?.message ?? "Could not create the business record.");
        business = inserted.data;
      }
      const source = await supabase.from("business_sources").upsert({
        business_id: business.id, source_system: "france-open-company-search",
        source_url: raw.raw_source_url, source_record_id: raw.source_record_id,
        raw_data: raw.raw_payload,
      }, { onConflict: "business_id,source_system,source_record_id" });
      if (source.error) throw new Error(source.error.message);
      const saved = await supabase.from("curated_leads").upsert({
        user_id: context.userId, raw_business_id: raw.id, business_id: business.id,
        niche_tag: decision.niche_tag, relevance_score: decision.relevance_score,
        relevance_note: decision.relevance_note,
        status: decision.relevant ? (decision.relevance_score >= 70 ? "curated" : "needs_review") : "rejected",
      }, { onConflict: "user_id,raw_business_id" });
      if (saved.error) throw new Error(saved.error.message);
      if (decision.relevant) curated += 1; else rejected += 1;
    }
    return { examined: records.length, curated, rejected };
  });

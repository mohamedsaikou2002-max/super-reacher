import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { searchLiveRegistry } from "./registry-adapters.server";
import type { Json } from "@/integrations/supabase/types";
import { REGISTRY_ACCESS } from "./registry-datasets";

const LiveInput = z.object({
  country: z.enum(["FR", "GB"]),
  query: z.string().trim().min(1).max(120),
  industryCode: z
    .string()
    .regex(/^\d{5}$/)
    .optional(),
  limit: z.number().int().min(1).max(25).optional(),
});
export const searchAndStoreGlobalBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => LiveInput.parse(input))
  .handler(async ({ data, context }) => {
    const records = await searchLiveRegistry({
      country_code: data.country,
      query: data.query,
      limit: data.limit ?? 20,
      ...(data.country === "GB" && data.industryCode ? { industryCode: data.industryCode } : {}),
    });
    if (!records.length)
      return { found: 0, saved: 0, records: [], source: REGISTRY_ACCESS[data.country].source };
    const rows = records.map((item) => ({
      user_id: context.userId,
      business_name: item.business_name,
      country_code: data.country,
      industry: String(
        item.source_data["sic_codes"] ?? item.source_data["activite_principale"] ?? "",
      ),
      address: String(
        item.source_data["address"] ?? item.source_data["registered_office_address"] ?? "",
      ),
      source: "api" as const,
      raw_source_url: item.registry_url ?? REGISTRY_ACCESS[data.country].source,
      source_record_id: item.registration_id,
      raw_payload: item.source_data as unknown as Json,
    }));
    const { data: saved, error } = await context.supabase
      .from("raw_businesses")
      .upsert(rows, { onConflict: "user_id,country_code,source,source_record_id" })
      .select("id,business_name,country_code,industry,address,source_record_id,fetched_at");
    if (error) throw new Error(`Saving registry records failed: ${error.message}`);
    return {
      found: records.length,
      saved: saved?.length ?? 0,
      records: saved ?? [],
      source: REGISTRY_ACCESS[data.country].source,
    };
  });

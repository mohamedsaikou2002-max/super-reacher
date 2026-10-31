import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { searchFranceSirene } from "./insee-france";

const FranceSearchInput = z.object({ query: z.string().trim().min(2).max(120) });

export const searchAndStoreFranceBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => FranceSearchInput.parse(input))
  .handler(async ({ data, context }) => {
    const records = await searchFranceSirene(data.query);
    if (records.length === 0) return { found: 0, inserted: 0, records: [] };

    const rows = records.map((record) => ({ ...record, user_id: context.userId }));
    const { data: saved, error } = await (context.supabase as any)
      .from("raw_businesses")
      .upsert(rows, { onConflict: "user_id,country_code,source,source_record_id" })
      .select(
        "id,business_name,country_code,industry,address,source,raw_source_url,source_record_id,fetched_at",
      );
    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        throw new Error(
          "The raw_businesses table is not installed yet. Apply the latest Supabase migration.",
        );
      }
      throw new Error(`Could not save France registry results: ${error.message}`);
    }
    return { found: records.length, inserted: saved?.length ?? 0, records: saved ?? [] };
  });

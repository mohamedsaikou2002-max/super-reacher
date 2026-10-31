import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { researchCompanyWithEvidence } from "./research-company.server";
import type { Json } from "@/integrations/supabase/types";

const Input = z.object({ businessId: z.string().uuid(), provider: z.enum(["groq", "gemini"]) });
export const researchRegisteredBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: business, error } = await db
      .from("businesses")
      .select("id,business_name,country_code,official_website")
      .eq("id", data.businessId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !business) throw new Error("Business unavailable to this account.");
    const { data: pages, error: pageError } = await db
      .from("web_pages")
      .select("canonical_url,title,content")
      .eq("business_id", business.id)
      .eq("crawl_status", "completed")
      .order("crawled_at", { ascending: false })
      .limit(8);
    if (pageError) throw new Error(pageError.message);
    const evidence = (pages ?? [])
      .filter((page) => page.canonical_url.startsWith("https://") && page.content.trim())
      .map((page) => ({
        url: page.canonical_url,
        title: page.title.slice(0, 300),
        content: page.content.slice(0, 5000),
      }));
    if (!evidence.length)
      throw new Error("No completed official website pages found. Run the approved crawler first.");
    const result = await researchCompanyWithEvidence({
      provider: data.provider,
      company: business.business_name,
      country: business.country_code,
      pages: evidence,
    });
    const { error: saveError } = await db.from("research_results").insert({
      business_id: business.id,
      provider: data.provider,
      model: data.provider === "groq" ? "llama-3.3-70b-versatile" : "gemini-2.5-flash",
      result: result as unknown as Json,
      status: "complete",
    });
    if (saveError) throw new Error(saveError.message);
    return {
      company: business.business_name,
      provider: data.provider,
      evidencePages: evidence.length,
      people: result.people.length,
      contacts: result.public_contacts.length,
      notes: result.research_notes.length,
      result,
    };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  curatedLeadId: z.string().uuid(),
  maxContacts: z.number().int().min(1).max(5).optional(),
});
type FrenchDirector = { nom?: string; prenoms?: string; qualite?: string; type_dirigeant?: string };
type EnrichedPerson = {
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  provider: string;
  providerRecordId?: string;
  verification: "verified" | "invalid" | "unknown";
};

async function apolloMatch(
  name: string,
  company: string,
): Promise<Omit<EnrichedPerson, "provider" | "verification"> | null> {
  const key = process.env["APOLLO_API_KEY"];
  if (!key) throw new Error("APOLLO_API_KEY is not configured.");
  const [firstName, ...lastParts] = name.trim().split(/\s+/);
  const response = await fetch("https://api.apollo.io/v1/people/match", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": key },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastParts.join(" "),
      organization_name: company,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { person?: Record<string, any> };
  const person = body.person;
  if (!person) return null;
  return {
    name: String(person["name"] || name),
    role: String(person["title"] || ""),
    email: person["email"] || null,
    phone: person["sanitized_phone"] || null,
    providerRecordId: person["id"],
  };
}

async function hunterFind(
  name: string,
  company: string,
): Promise<{
  email: string | null;
  phone: string | null;
  verified: "verified" | "invalid" | "unknown";
} | null> {
  const key = process.env["HUNTER_API_KEY"];
  if (!key) throw new Error("HUNTER_API_KEY is not configured.");
  const url = new URL("https://api.hunter.io/v2/email-finder");
  url.searchParams.set("company", company);
  url.searchParams.set("full_name", name);
  url.searchParams.set("api_key", key);
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    data?: { email?: string; phone_number?: string; score?: number };
  };
  const email = body.data?.["email"] || null;
  if (!email) return { email: null, phone: body.data?.phone_number || null, verified: "unknown" };
  const verifyUrl = new URL("https://api.hunter.io/v2/email-verifier");
  verifyUrl.searchParams.set("email", email);
  verifyUrl.searchParams.set("api_key", key);
  const verifyResponse = await fetch(verifyUrl, { signal: AbortSignal.timeout(20_000) });
  if (!verifyResponse.ok)
    return { email, phone: body.data?.phone_number || null, verified: "unknown" };
  const verifyBody = (await verifyResponse.json()) as { data?: { status?: string } };
  const status =
    verifyBody.data?.status === "valid"
      ? "verified"
      : verifyBody.data?.status === "invalid"
        ? "invalid"
        : "unknown";
  return { email, phone: body.data?.phone_number || null, verified: status };
}

function readDirectors(payload: unknown): FrenchDirector[] {
  if (!payload || typeof payload !== "object") return [];
  const directors = (payload as Record<string, unknown>)["dirigeants"];
  if (!Array.isArray(directors)) return [];
  return directors
    .filter((item): item is FrenchDirector => Boolean(item && typeof item === "object"))
    .filter(
      (person) =>
        person.type_dirigeant === "personne physique" ||
        (!person.type_dirigeant && person.nom && person.prenoms),
    );
}

export const enrichCuratedFranceLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: lead, error: leadError } = await supabase
      .from("curated_leads")
      .select("id,user_id,business_id,raw_business_id,status")
      .eq("id", data.curatedLeadId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (leadError || !lead) throw new Error("Curated France lead not found.");
    if (lead.status !== "curated")
      throw new Error("Only curated leads can be enriched; review the curation decision first.");
    const [{ data: business, error: businessError }, { data: raw, error: rawError }] =
      await Promise.all([
        supabase
          .from("businesses")
          .select("id,business_name,registration_id")
          .eq("id", lead.business_id)
          .eq("user_id", context.userId)
          .maybeSingle(),
        supabase
          .from("raw_businesses")
          .select("id,raw_payload")
          .eq("id", lead.raw_business_id)
          .eq("user_id", context.userId)
          .maybeSingle(),
      ]);
    if (businessError || !business || rawError || !raw)
      throw new Error("France lead source record is unavailable.");

    const candidates = readDirectors(raw.raw_payload).slice(0, data.maxContacts ?? 5);
    if (!candidates.length)
      return {
        business: business.business_name,
        candidates: 0,
        contactsSaved: 0,
        message: "No public natural-person directors were included in the France registry result.",
      };
    let contactsSaved = 0;
    const providerResults: Record<string, number> = { apollo: 0, hunter: 0 };
    for (const director of candidates) {
      const fullName = [director.prenoms, director.nom].filter(Boolean).join(" ").trim();
      if (!fullName) continue;
      let apollo: Omit<EnrichedPerson, "provider" | "verification"> | null = null;
      let hunter: Awaited<ReturnType<typeof hunterFind>> = null;
      try {
        apollo = await apolloMatch(fullName, business.business_name);
      } catch {
        /* missing config and provider errors are reported after trying the other source */
      }
      try {
        hunter = await hunterFind(fullName, business.business_name);
      } catch {
        /* continue with registry/Apollo evidence */
      }
      if (apollo?.["email"] || apollo?.phone)
        providerResults["apollo"] = (providerResults["apollo"] ?? 0) + 1;
      if (hunter?.["email"] || hunter?.phone)
        providerResults["hunter"] = (providerResults["hunter"] ?? 0) + 1;
      const email = apollo?.["email"] || hunter?.["email"] || "";
      const phone = apollo?.phone || hunter?.phone || "";
      const verification =
        hunter?.["email"] === email && hunter?.verified === "verified"
          ? "verified"
          : hunter?.["email"] === email && hunter?.verified === "invalid"
            ? "invalid"
            : "unknown";
      const role = director.qualite || apollo?.role || "Company director";
      const ownerRole =
        /owner|founder|président|president|gérant|gerant|directeur général|directeur general/i.test(
          role,
        );
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("business_id", business["id"])
        .eq("full_name", fullName)
        .maybeSingle();
      const contactPayload = {
        business_id: business["id"],
        full_name: fullName,
        role,
        email,
        phone,
        contact_type: ownerRole ? "owner" : "decision_maker",
        verification_status: verification,
        outreach_status: "review",
      };
      const saved = existing?.["id"]
        ? await supabase
            .from("contacts")
            .update(contactPayload)
            .eq("id", existing["id"])
            .select("id")
            .single()
        : await supabase.from("contacts").insert(contactPayload).select("id").single();
      if (saved.error || !saved.data)
        throw new Error(saved.error?.message ?? "Could not save enriched contact.");
      contactsSaved += 1;
      const evidence = await supabase.from("contact_sources").insert([
        {
          contact_id: saved.data["id"],
          source: "France public registry",
          source_url: "https://recherche-entreprises.api.gouv.fr/",
          evidence: role,
          confidence: "high",
          provider: "registry",
        },
        ...(apollo
          ? [
              {
                contact_id: saved.data["id"],
                source: "Apollo",
                evidence: `Company match for ${fullName}`,
                confidence: apollo["email"] ? "medium" : "low",
                provider: "apollo",
                provider_record_id: apollo.providerRecordId,
              },
            ]
          : []),
        ...(hunter?.["email"]
          ? [
              {
                contact_id: saved.data["id"],
                source: "Hunter",
                evidence: `Email finder and verifier status: ${hunter.verified}`,
                confidence: hunter.verified === "verified" ? "high" : "medium",
                provider: "hunter",
              },
            ]
          : []),
      ]);
      if (evidence.error) throw new Error(evidence.error.message);
    }
    return {
      business: business.business_name,
      candidates: candidates.length,
      contactsSaved,
      providerResults,
    };
  });

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const LookupInput = z.object({
  provider: z.enum(["apollo", "hunter"]),
  fullName: z.string().trim().min(3).max(120),
  companyName: z.string().trim().min(2).max(180),
});

/** One manually requested professional contact lookup; no automatic list harvesting or bulk dispatch. */
export const lookupProfessionalContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => LookupInput.parse(data))
  .handler(async ({ data, context }) => {
    const { getCredential } = await import("./integration-vault.server");
    const key = await getCredential(context.userId, data.provider);
    if (!key) throw new Error(`Connect your ${data.provider} API key in Integrations first.`);
    const { ApolloEnrichmentProvider, HunterEnrichmentProvider } = await import("./intelligence/enrichment");
    const provider = data.provider === "apollo"
      ? new ApolloEnrichmentProvider(key) : new HunterEnrichmentProvider(key);
    const result = await provider.findProfessionalContact({ fullName: data.fullName, companyName: data.companyName });
    return { provider: data.provider, contact: result, verifiedByProvider: false };
  });

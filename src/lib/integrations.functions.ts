import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Provider = z.enum(["groq", "apollo", "hunter", "firecrawl", "gemini"]);
const PutCredential = z.object({ provider: Provider, secret: z.string().min(8).max(1024), costAcknowledged: z.boolean() });
const RemoveCredential = z.object({ provider: Provider });

/** Return only metadata. Never include stored provider secrets in responses. */
export const listMyIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listCredentials } = await import("./integration-vault.server");
    return { credentials: await listCredentials(context.userId) };
  });

export const saveMyIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => PutCredential.parse(data))
  .handler(async ({ data, context }) => {
    const { setCredential } = await import("./integration-vault.server");
    await setCredential(context.userId, data.provider, data.secret, data.costAcknowledged);
    return { ok: true as const, provider: data.provider };
  });

export const deleteMyIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RemoveCredential.parse(data))
  .handler(async ({ data, context }) => {
    const { removeCredential } = await import("./integration-vault.server");
    await removeCredential(context.userId, data.provider);
    return { ok: true as const };
  });

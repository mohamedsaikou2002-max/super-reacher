/** Server-only credential vault. Secrets are never stored in public client state. */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const PROVIDER_IDS = ["groq", "apollo", "hunter", "firecrawl", "gemini"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

function vaultKey(): Buffer {
  const encoded = process.env["INTEGRATION_VAULT_KEY"]?.trim();
  if (!encoded) throw new Error("INTEGRATION_VAULT_KEY is required for BYO credentials.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("INTEGRATION_VAULT_KEY must be a base64-encoded 32-byte key.");
  return key;
}

function encrypt(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
}

function decrypt(value: string): string {
  const [version, iv, tag, ciphertext] = value.split(":");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Unsupported encrypted credential.");
  const decipher = createDecipheriv("aes-256-gcm", vaultKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}

export async function setCredential(userId: string, provider: ProviderId, secret: string, costAcknowledged: boolean) {
  if (!PROVIDER_IDS.includes(provider)) throw new Error("Unsupported provider.");
  const clean = secret.trim();
  if (clean.length < 8 || clean.length > 1024 || /[\r\n]/.test(clean)) throw new Error("Provide a valid API key.");
  const { error } = await supabaseAdmin.from("provider_credentials").upsert({
    user_id: userId,
    provider,
    encrypted_secret: encrypt(clean),
    key_hint: `••••${clean.slice(-4)}`,
    cost_acknowledged: costAcknowledged,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,provider" });
  if (error) throw new Error("Unable to save provider key. Check database migrations.");
}

export async function removeCredential(userId: string, provider: ProviderId) {
  const { error } = await supabaseAdmin.from("provider_credentials")
    .delete().eq("user_id", userId).eq("provider", provider);
  if (error) throw new Error("Unable to remove provider key.");
}

export async function listCredentials(userId: string) {
  const { data, error } = await supabaseAdmin.from("provider_credentials")
    .select("provider,key_hint,cost_acknowledged,updated_at")
    .eq("user_id", userId);
  if (error) throw new Error("Unable to read integration status. Check database migrations.");
  return data ?? [];
}

export async function getCredential(userId: string, provider: ProviderId): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from("provider_credentials")
    .select("encrypted_secret")
    .eq("user_id", userId).eq("provider", provider).maybeSingle();
  if (error) throw new Error("Unable to access provider credentials.");
  if (!data?.encrypted_secret) return null;
  return decrypt(data.encrypted_secret);
}

export async function isCostAcknowledged(userId: string, provider: ProviderId): Promise<boolean> {
  const { data } = await supabaseAdmin.from("provider_credentials")
    .select("cost_acknowledged").eq("user_id", userId).eq("provider", provider).maybeSingle();
  return data?.cost_acknowledged === true;
}

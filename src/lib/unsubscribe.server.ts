import { createHmac, timingSafeEqual } from "node:crypto";

export type UnsubscribeIdentity = { userId: string; contactId: string; email: string };
function signingSecret(): string {
  const secret = process.env["UNSUBSCRIBE_SIGNING_SECRET"] ?? "";
  if (secret.length < 32) throw new Error("Unsubscribe signature secret is not configured.");
  return secret;
}
function signature(payload: string): Buffer {
  return createHmac("sha256", signingSecret()).update(payload).digest();
}
export function createUnsubscribeToken(identity: UnsubscribeIdentity): string {
  const payload = Buffer.from(JSON.stringify(identity), "utf8").toString("base64url");
  return payload + "." + signature(payload).toString("base64url");
}
export function verifyUnsubscribeToken(token: string): UnsubscribeIdentity | null {
  if (token.length > 1500 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
  const [payload, provided] = token.split(".");
  if (!payload || !provided) return null;
  try {
    const expected = signature(payload);
    const received = Buffer.from(provided, "base64url");
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Partial<UnsubscribeIdentity>;
    if (
      !value.userId ||
      !value.contactId ||
      !value.email ||
      !/^[a-f0-9-]{36}$/i.test(value.userId) ||
      !/^[a-f0-9-]{36}$/i.test(value.contactId) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)
    )
      return null;
    return { userId: value.userId, contactId: value.contactId, email: value.email };
  } catch {
    return null;
  }
}

export function makeUnsubscribeUrl(identity: UnsubscribeIdentity): string {
  const base = new URL(process.env["PUBLIC_APP_URL"] ?? "");
  if (base.protocol !== "https:" || base.username || base.password)
    throw new Error("PUBLIC_APP_URL requires a public HTTPS origin.");
  const url = new URL("/api/unsubscribe", base);
  url.searchParams.set("token", createUnsubscribeToken(identity));
  return url.toString();
}

/** Resend uses Svix-signed webhook callbacks. Validate the exact raw body. */
export function verifyResendWebhook(
  body: string,
  id: string | null,
  stamp: string | null,
  signatures: string | null,
): boolean {
  if (!id || !stamp || !signatures || !/^\d{10}$/.test(stamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(stamp)) > 300) return false;
  const encodedSecret = process.env["RESEND_WEBHOOK_SECRET"] ?? "";
  if (!encodedSecret.startsWith("whsec_")) return false;
  const key = Buffer.from(encodedSecret.slice(6), "base64");
  if (key.length < 16) return false;
  const expected = createHmac("sha256", key)
    .update(id + "." + stamp + "." + body)
    .digest();
  return signatures.split(" ").some((part) => {
    if (!part.startsWith("v1,")) return false;
    try {
      const provided = Buffer.from(part.slice(3), "base64");
      return provided.length === expected.length && timingSafeEqual(provided, expected);
    } catch {
      return false;
    }
  });
}

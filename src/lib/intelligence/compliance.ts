export type Suppression = { email?: string; phone?: string; channel: "email" | "sms" | "global" };

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function isSuppressed(contact: { email?: string; phone?: string }, suppressions: Suppression[], channel: "email" | "sms"): boolean {
  const email = contact.email ? normalizeEmail(contact.email) : "";
  const phone = contact.phone ? normalizePhone(contact.phone) : "";
  return suppressions.some((item) => {
    if (item.channel !== "global" && item.channel !== channel) return false;
    return Boolean((email && item.email && normalizeEmail(item.email) === email) || (phone && item.phone && normalizePhone(item.phone) === phone));
  });
}

export function canSendContact(contact: { email?: string; phone?: string; verification_status: string }, suppressions: Suppression[], channel: "email" | "sms"): boolean {
  if (isSuppressed(contact, suppressions, channel)) return false;
  if (contact.verification_status !== "verified") return false;
  return channel === "email" ? Boolean(contact.email && isValidEmail(contact.email)) : Boolean(contact.phone);
}
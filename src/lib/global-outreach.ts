/** Universal outreach drafts. No dispatch is performed by this module. */
export const CHANNELS = [
  { id: "email", label: "Email" },
  { id: "phone", label: "Telephone script" },
  { id: "sms", label: "SMS" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "crm", label: "CRM task" },
] as const;
export type Channel = (typeof CHANNELS)[number]["id"];
export const SECTOR_PRESETS = [
  { id: "general", label: "Any profession", profession: "Sales professional", audience: "Qualified prospects" },
  { id: "aviation", label: "Private aviation", profession: "Aircraft broker", audience: "Qualified aircraft buyers and charter operators" },
  { id: "realestate", label: "Real estate", profession: "Real estate agent", audience: "Buyers, sellers and tenants" },
  { id: "insurance", label: "Insurance", profession: "Insurance producer", audience: "Prospective policyholders" },
  { id: "automotive", label: "Automotive", profession: "Vehicle salesperson", audience: "In-market vehicle buyers" },
  { id: "finance", label: "Financial services", profession: "Financial adviser", audience: "Qualified prospective clients" },
  { id: "recruiting", label: "Recruiting", profession: "Recruiter", audience: "Hiring teams and consenting candidates" },
  { id: "saas", label: "Technology / SaaS", profession: "Account executive", audience: "Relevant business decision makers" },
  { id: "healthcare", label: "Healthcare services", profession: "Provider relations representative", audience: "Authorized referral partners" },
  { id: "other", label: "Custom industry", profession: "Business professional", audience: "Appropriate recipients" },
] as const;
export type OutreachProfile = {
  profession: string;
  audience: string;
  offer: string;
  value_proposition: string;
  preferred_channel: Channel;
  preferred_market: string;
  sender_name: string;
};
export const DEFAULT_PROFILE: OutreachProfile = {
  profession: "Sales professional",
  audience: "Qualified prospects",
  offer: "",
  value_proposition: "",
  preferred_channel: "email",
  preferred_market: "US",
  sender_name: "",
};
const clean = (v: string, max = 320) => v.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const escapeHtml = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
export type DraftInput = { profile: OutreachProfile; contactName: string; companyName: string; channel: Channel; market: string };
export type OutreachDraft = { channel: Channel; subject: string; text: string; html: string | null; requiresReview: true; sendEnabled: false };
export function buildOutreachDraft({profile, contactName, companyName, channel}: DraftInput): OutreachDraft {
  const name = clean(contactName, 100) || "there";
  const org = clean(companyName, 150);
  const sender = clean(profile.sender_name, 80) || "[Your name]";
  const offer = clean(profile.offer, 250) || "[your offering]";
  const value = clean(profile.value_proposition) || "[what makes it valuable]";
  const ask = "Would a short conversation be useful?";
  const subject = "Introduction: " + offer.slice(0, 70);
  let text = "";
  if (channel === "phone") text = ["CALL PREPARATION — REVIEW BEFORE DIALING", "Contact: " + name + (org ? " at " + org : ""), "Hello " + name + ", this is " + sender + ". Is now a good time to talk?", "I am reaching out regarding " + offer + ". " + value, ask, "If declined, respect their preference and log it in your CRM."].join("\n");
  else if (channel === "sms") text = "Hi " + name + ", this is " + sender + ". " + offer + ". " + ask + " Reply STOP to opt out.";
  else if (channel === "linkedin") text = "Hi " + name + ", I work with " + clean(profile.audience, 100) + ". I wanted to connect about " + offer + ". " + ask;
  else if (channel === "whatsapp") text = "Hi " + name + ", this is " + sender + ". Following up on " + offer + ". " + value + " " + ask + " Reply STOP if you'd prefer no further messages.";
  else if (channel === "crm") text = ["FOLLOW-UP TASK", "Contact: " + name, "Company: " + org, "Owner: " + sender, "Action: " + ask, "Check consent, choose an appropriate channel and record the outcome."].join("\n");
  else text = ["Hi " + name + ",", "", "I'm " + sender + ". I'm reaching out about " + offer + ". " + value, "", ask, "", "Best,", sender, "", "If this isn't relevant, reply and I'll remove you from future outreach."].join("\n");
  const html = channel === "email"
    ? '<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:Arial,sans-serif;background:#f5f7f8"><div style="max-width:600px;margin:25px auto;padding:28px;background:#fff;border-top:4px solid #5cbd64"><div style="font-size:11px;color:#537962;font-weight:bold">HYPER REACHER | GLOBAL OUTREACH</div><div style="white-space:pre-wrap;line-height:1.6;margin-top:20px">' + escapeHtml(text) + '</div></div></body></html>'
    : null;
  return { channel, subject: channel === "email" ? subject : "", text, html, requiresReview: true, sendEnabled: false };
}

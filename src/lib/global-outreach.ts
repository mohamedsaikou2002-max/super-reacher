/** Client-safe universal sales workspace configuration and manual outreach drafting. */
export const CHANNELS = [
  { id: "email", label: "Email", note: "Formal introductions, proposals, follow-ups" },
  { id: "phone", label: "Phone call", note: "Personal consultation and relationship selling" },
  { id: "sms", label: "SMS", note: "Short follow-up for permitted/consented recipients" },
  { id: "linkedin", label: "LinkedIn", note: "Manual professional networking" },
  { id: "whatsapp", label: "WhatsApp", note: "Existing customer conversations or opted-in contacts" },
  { id: "crm", label: "CRM task", note: "Offline actions and team follow-up queues" },
] as const;
export type Channel = (typeof CHANNELS)[number]["id"];

export const SECTOR_PRESETS = [
  { id: "general", label: "Any profession", profession: "Sales professional", audience: "Qualified prospects" },
  { id: "aviation", label: "Private aviation", profession: "Aircraft broker", audience: "Qualified aircraft buyers and charter operators" },
  { id: "realestate", label: "Real estate", profession: "Real estate agent", audience: "Prospective buyers, sellers, and tenants" },
  { id: "insurance", label: "Insurance", profession: "Insurance producer", audience: "Qualified policyholders and commercial accounts" },
  { id: "automotive", label: "Automotive", profession: "Automotive salesperson", audience: "In-market vehicle buyers and existing clients" },
  { id: "finance", label: "Financial services", profession: "Financial advisor", audience: "Qualified prospective clients" },
  { id: "recruiting", label: "Recruiting", profession: "Recruiter", audience: "Hiring teams and consenting candidates" },
  { id: "saas", label: "Technology / SaaS", profession: "Account executive", audience: "Relevant teams and business decision-makers" },
  { id: "healthcare", label: "Healthcare services", profession: "Provider relations representative", audience: "Authorized referral partners and business clients" },
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
  profession: "Sales professional", audience: "Qualified prospects", offer: "", value_proposition: "",
  preferred_channel: "email", preferred_market: "US", sender_name: "",
};

function cleanText(value: string, limit = 400): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export type DraftInput = { profile: OutreachProfile; contactName: string; companyName: string; channel: Channel; market: string };
export type OutreachDraft = { channel: Channel; subject: string; text: string; html: string | null; requiresReview: true; sendEnabled: false };

/** Drafts only: no implicit send, dialing, scraping, platform messaging, or bulk dispatch. */
export function buildOutreachDraft(input: DraftInput): OutreachDraft {
  const { profile, channel } = input;
  const name = cleanText(input.contactName, 80) || "there";
  const company = cleanText(input.companyName, 100);
  const sender = cleanText(profile.sender_name, 80) || "[Your name]";
  const offer = cleanText(profile.offer, 240) || "[describe your product or service]";
  const value = cleanText(profile.value_proposition, 320) || "[explain the outcome for this recipient]";
  const prospectContext = company ? ` at ${company}` : "";
  const ask = "Would a short conversation be worthwhile?";
  const optout = "If this isn't relevant, reply and I'll leave you off future outreach.";
  const subject = `Introduction: ${offer.slice(0, 70)}`;
  let text: string;
  switch (channel) {
    case "phone":
      text = `CALL PREPARATION — REVIEW BEFORE DIALING\nRecipient: ${name}${prospectContext}\nIntroduction: Hi ${name}, this is ${sender}. Is now an appropriate time to talk?\nReason: I'm reaching out about ${offer}. ${value}\nQuestion: ${ask}\nIf declined: Thank them, respect their preference, and update your contact record.\nFollow-up: Note the outcome and schedule any callback they requested.`;
      break;
    case "sms":
      text = `Hi ${name}, it's ${sender}. Reaching out about ${offer}. ${ask} Reply STOP to opt out.`;
      break;
    case "linkedin":
      text = `Hi ${name}, I work with ${cleanText(profile.audience, 100)} and wanted to connect about ${offer}. ${ask}`;
      break;
    case "whatsapp":
      text = `Hi ${name}, this is ${sender}. Following up about ${offer}. ${value} ${ask} Reply STOP if you'd prefer no more messages.`;
      break;
    case "crm":
      text = `FOLLOW-UP TASK\nContact: ${name}${prospectContext}\nOwner: ${sender}\nChannel: Choose a permitted channel; check consent and preferences first.\nOffer: ${offer}\nValue: ${value}\nAction: ${ask}\nRecord outcome and next step in your CRM.`;
      break;
    default:
      text = `Hi ${name},\n\nI'm ${sender}. I wanted to reach out about ${offer}. ${value}\n\n${ask}\n\nBest,\n${sender}\n\n${optout}`;
  }
  const html = channel === "email"
    ? `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#f5f7f8;font-family:Arial,sans-serif;color:#18242d"><div style="max-width:600px;margin:25px auto;padding:28px;background:#fff;border-top:4px solid #5cbd64"><div style="font-size:11px;color:#537962;font-weight:700;letter-spacing:1px">HYPER REACHER • GLOBAL OUTREACH</div><div style="font-size:15px;line-height:1.7;margin-top:20px;white-space:pre-wrap">${escapeHtml(text)}</div></div></body></html>`
    : null;
  return { channel, subject: channel === "email" ? subject : "", text, html, requiresReview: true, sendEnabled: false };
}

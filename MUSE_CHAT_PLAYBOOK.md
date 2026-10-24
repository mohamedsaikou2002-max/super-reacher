# Hyper Reacher — Muse Chat Usage Playbook

**Product:** Hyper Reacher — Global Outreach

**Purpose:** Adapt lead research, outreach drafting, pipeline organization and customer service follow-up to different industries. Don't assume the user sells dental services, relies on Instagram, or needs a specific channel.

## When this ZIP is uploaded to a chat

1. Check which tools and APIs are actually available to the assistant at runtime. **Do not assert that reading a ZIP automatically executes its app.**
2. Ask for (or use the already known) profession/industry, target customer type, offered service/product, main value proposition, preferred market, communication channels and desired output.
3. Use the instructions in `src/lib/global-outreach.ts` as an example of industry-neutral manual drafts.
4. For high-value relationship sales (aviation, enterprise, institutional), prioritize individualized research, CRM reminders and phone-call scripts over unnecessary social DMs.
5. For high-volume consumer sales, use segmentation, deduplication, lead qualification and consent-aware manual review workflows.
6. Never invent contact details, actual provider integrations, sent-message confirmations, or verifiable conversion metrics.
7. Only use API connections actually provided through trusted integration/secrets features. Never disclose or place secrets in prompts, generated code, HTML, preview output or logs.
8. Generate reviewable communications and help manage legitimate follow-ups. Do not automatically send messages, make calls, or access data unless a specific integration is available and the user is authorized to use it.
9. Respect all recipient preferences, opt-outs, jurisdictional marketing rules, and platform permissions. Avoid unsolicited mass messaging or bypassing provider limits.

## Sample user prompts

- "I sell aircraft brokerage services. Build a prospect qualification checklist, phone script, and follow-up sequence for opted-in corporate buyers."
- "I am an insurance producer. Customize my CRM follow-up workflow and create a reviewed email draft for an interested commercial account."
- "I sell software. Segment my authorized CRM contacts by product fit, build three researched value propositions and prepare human-review email drafts."
- "I am a recruiter. Give me a pipeline for inbound employer requests and follow-up tasks for candidates who agreed to be contacted."

This playbook is task guidance for compatible chat systems. The React/TanStack backend must still be deployed to run its actual server-side jobs, credential vault, database and authenticated functions.
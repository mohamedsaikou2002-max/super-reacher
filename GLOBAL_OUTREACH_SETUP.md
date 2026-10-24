# Hyper Reacher — Global Outreach Edition

## What changed

This is a **source-code update**, not a validated live hosted service.

- New **Global Outreach** view with profession presets and freely editable audience, offer, value proposition, sender and market.
- Channel-specific draft generation for **email, telephone call scripts, SMS, LinkedIn, WhatsApp and CRM tasks**. No channel is required for every user.
- Authenticated user-specific **BYO API-key configuration** for Groq, Apollo, Hunter, Firecrawl and Gemini.
- AES-256-GCM provider-key encryption in a private server-side vault; decrypted credentials never return to the browser.
- Groq jobs can use the signed-in user's own Groq key after they acknowledge their provider charges.
- A one-contact-at-a-time professional lookup uses the user's own Hunter or Apollo key.
- Existing official-website Firecrawl crawl functions can use the signed-in user's own Firecrawl key.
- Existing Lovable AI and self-hosted engine paths remain available for configured deployments.
- Agent terminal input calls corrected to use TanStack server function `data` argument wrappers.
- Honest "draft only" outbound UI: **no bulk sending, dialing, social-site automation, or provider mail dispatch** is provided in this edition.

The original ZIP contained `.env` files, local Git metadata, compiled build folders, and more than 70,000 dependency files. **Those files are intentionally omitted from the customer source ZIP**; install dependencies on the target host. Rotate keys from the original archive before any distribution. The original nested `socio-shark/` app source remains in this edition, without its dependency/build folders.

## Getting the app running

1. Use a trusted Node.js environment and install dependencies with `npm ci` in the project directory.
2. Set the existing Supabase browser and server environment variables using `.env.example` as a template.
3. Configure `SUPABASE_SERVICE_ROLE_KEY` **server-side only** for the credential vault. The service-role key bypasses row-level security and must NEVER be placed in `VITE_` variables, in a ZIP distributed with secrets, or in the browser.
4. Generate a new 32-byte vault key on the host: `openssl rand -base64 32` and set the resulting value as the **server-only** `INTEGRATION_VAULT_KEY`. Back it up securely. Losing it makes existing encrypted provider credentials unrecoverable; rotating it requires a re-encryption procedure or re-entry of the API keys.
5. Apply `supabase/migrations/20261023000000_global_outreach_byok.sql` **after** the existing project migrations.
6. Run the application, sign in, open **Integrations**, connect the provider keys you actually use, and accept the cost acknowledgment.
7. Open **Global Outreach**, choose a sector preset or "Any profession," enter the offer and value proposition, select a channel and generate a reviewable draft.
8. For Hunter/Apollo, enter one individual's name and company and click **Find professional contact**. Check permitted use and accuracy before contacting anyone.

**Provider limitations:** Saving a key is not live verification of service connectivity. Groq is wired into agent execution, Hunter and Apollo into manual individual lookup, and Firecrawl into the existing business website crawl. Gemini supports credential storage only and does not yet have an inference adapter. Email/SMS/social sending APIs are not wired. The original Supabase/Lovable deployment prerequisites still apply: entering a key alone does not automatically deploy a backend.

### Existing project limits

- Several pre-existing TypeScript type errors remain in older intelligence routes and code. This updated source is not represented as cleanly production-built.
- A local full production build could not be verified in the analysis environment because the Windows-oriented `node_modules` packaged in the original archive do not contain the required Linux native Rolldown binding. The source distribution excludes dependencies.
- The global draft generator defaults to English. Selecting a market does not automatically translate content or ensure jurisdiction-specific legal compliance.
- Full multi-tenant enterprise deployment, billing, live dispatch, provider webhooks, opt-out enforcement during sending, compliance review, and automatic key validation remain future engineering work.
- Do not use client-supplied untrusted self-hosted engine URLs without SSRF validation and network egress restrictions.

## Data and authorization

- `global_outreach_profiles`: user-owned profile storage with Supabase RLS.
- `provider_credentials`: no browser access; server-only service-role database operations after Supabase authentication.
- Never log, paste, or include provider secrets in AI prompts or distributed ZIPs.
- Never upload employer confidential contact lists into personal services without permission.
- Before enabling real communications, implement centrally enforced suppression checks, explicit approval, deduplication, retry boundaries, provider rate limits, unsubscribe processing, and jurisdiction-specific consent policies.

## Muse ZIP import workflow

The ZIP contains the entire source and `MUSE_CHAT_PLAYBOOK.md`. For Muse chat, upload the **clean ZIP**, point the assistant at the playbook and ask it to follow the manual draft workflows. Source upload alone does **not** universally guarantee the backend runs or that environment variables will be available; this depends on the capabilities and deployment permissions of the specific Muse environment. For features requiring actual APIs and Supabase, install/deploy the app in an environment that supports those server functions and secrets. Do not paste API keys directly into shared chat messages.
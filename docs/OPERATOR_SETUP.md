# HyperReacher — Start-and-Finish-Up operator setup

This branch is a staged implementation of Grey Company's private, single-operator outreach workflow. It is **not** a deployment, a list of verified live API connections, or an authorization to send unscreened marketing.

## What is changed

- Main menu: Overview, Leads, Businesses, Contacts, Research, Outreach, Inbox, Agents. Legacy source configuration, settings, logs and security controls are not deleted from the code or database.
- Research: new Grok web-research chat (xAI Responses API; server-only `XAI_API_KEY`). It reports source URLs where provided and never manufactures people or automatically sends email. Under the chat, the existing global registry panel exposes genuinely implemented FR (French public search API) and GB (Companies House, key required) queries.
- Leads: paste/upload a **CSV** containing a header row: `company,contact_name,email,phone,country,industry`. The importer previews, checks basic email syntax, deduplicates within the file and against existing email records, and inserts at most 1,000 pending leads per batch. It never sends messages. Larger imports require a server-side streaming ingestion job with durable duplicate constraints.
- Website research: the Overview queue now creates Scrapy work. A trusted local/server Python worker claims jobs and writes bounded, same-domain source evidence into `web_pages`; Firecrawl is now legacy code, not the default workflow.
- Outbound: the existing manual approved-email path can use `OUTBOUND_PROVIDER=brevo` (or `resend`). Approval, qualified business/contact status, opt-out, sender allowlist, cooldown and database quota remain required. This is **not** an unrestricted bulk campaign feature.

## Install and test locally

```sh
git fetch origin
git checkout feature/hyperreacher-operator-workflow-20261031
npm ci
cp .env.example .env.local
npm run typecheck
npm test
npm run build
npm run dev
```

Configure a valid Supabase instance and **apply all migrations** using the project's approved migration procedure. The demo/front-end alone does not provision the database or run the crawler.

## Configure services

Only set server-side secrets, never browser `VITE_` secrets:

```ini
XAI_API_KEY=your_xai_key
XAI_MODEL=grok-4.7
GROQ_API_KEY=your_groq_key_for_optional_registry_curation
COMPANIES_HOUSE_API_KEY=your_uk_key
OUTBOUND_PROVIDER=brevo
BREVO_API_KEY=your_brevo_key
BREVO_FROM_ADDRESS=verified-sender@yourdomain.com
BREVO_WEBHOOK_TOKEN=your-long-random-bearer-token
OUTBOUND_ENABLED=false
OUTBOUND_APPROVED_USERS=your_supabase_auth_user_uuid
UNSUBSCRIBE_SIGNING_SECRET=secure_server_secret
PUBLIC_APP_URL=https://your-public-app.example
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server-only-key
```

Do not set `OUTBOUND_ENABLED=true` until sender verification, message approval, unsubscribe endpoint, email authentication (SPF/DKIM/DMARC), suppression workflow, domain reputation, and the relevant regional marketing rules have been verified. Free Brevo sends are limited to **300/day**; this code retains the tighter DB reservation quota of 25 approved sends per rolling day. The Brevo transactional endpoint is for communications that the provider permits; use its appropriate campaign product and permission model for marketing. There are **no bulk auto-sends** in this branch. Create a secure Brevo **transactional** webhook for `https://YOUR_APP_DOMAIN/api/brevo-webhook` with bearer authentication matching `BREVO_WEBHOOK_TOKEN`. Subscribe to delivered, hardBounce, spam and unsubscribed; the handler records delivery outcomes, logs events, and suppresses bounced/unsubscribed addresses. Provider webhook delivery must be tested against real Brevo payloads.

## Start Scrapy worker (private trusted host)

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r scripts/requirements-crawler.txt
# Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ONLY in worker process
python scripts/scrapy_queue_worker.py --user-id YOUR_SUPABASE_AUTH_UUID --once
# For continuous queue processing on a powered-on host:
python scripts/scrapy_queue_worker.py --user-id YOUR_SUPABASE_AUTH_UUID --loop --poll-seconds 60
```

The Scrapy spider obeys robots.txt and caps pages; a network egress firewall must also block internal/private-IP access and DNS rebinding. Never expose the worker's service role key or an unauthenticated crawl endpoint to Meta/Muse or to an APK. A laptop will stop processing when it sleeps or loses internet; use an always-on VPS/cloud worker for reliable 24/7 operation.

## Registry truth table

| Registry                                            | Current connector                                     | What still needs work                                                             |
| --------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| France API Recherche d'entreprises (SIRENE-derived) | Authenticated app search is coded, keyless            | Deployment-network smoke test, retry policy and source suitability review         |
| INSEE direct SIRENE V3.11                           | Separate INSEE subscription/key not yet integrated    | Official API adapter and key, protection for non-diffusible persons               |
| UK Companies House                                  | Authenticated app adapter present                     | Add key, real remote test and production quota verification                       |
| Germany Unternehmensregister / Handelsregister      | Registry catalog and authorized dataset importer only | Source-specific permitted API/feed/license and validation; not safe to claim live |
| Italy Registro Imprese                              | Registry catalog and importer only                    | Approved commercial data access and field mappings                                |
| 50 US state registries                              | Catalog and state-scoped CSV importer                 | State-by-state API/bulk source licenses and fixtures; no nationwide public API    |
| Singapore, Canada                                   | Importer/catalog                                      | Approved official exports and source-specific integration                         |

A registry catalog entry is not evidence of a working API. A successful company lookup does not authorize contacting its officers. If protected or non-diffusible fields are returned, filter them before saving or prospecting.

## Meta Muse, a local server and APK

Meta's Muse is a personal agent with user-controlled app connections, **not a documented universal localhost-to-APK plugin platform**. No verified custom Muse-to-HyperReacher connection is installed here. The safe path is:

1. Host HyperReacher's authenticated backend at a stable HTTPS URL (or use a private network/tunnel accessible only to trusted clients).
2. Expose only minimal audited API operations, with per-user OAuth/session access and scoped permissions. Do not give Muse database service-role keys.
3. Use those same authorized HTTPS endpoints from a native Android client or a Capacitor WebView shell. APK packaging and device testing are separate Android build steps.
4. If Meta ships a supported external connector for Muse, integrate it against that authenticated API after reading the actual provider contract. Browser automation alone does not establish approved API integration.

## Deployment checks before launch

- Run `npm run typecheck && npm test && npm run build`.
- Smoke test France, UK (with key), Grok (with key), Scrapy job receipt/persistence and a no-send import.
- Manually verify one permitted message only after sender confirmation and legal checks; confirm provider message ID and unsubscribe flow.
- Confirm imports don't duplicate existing records and no email is sent upon import.
- Add inbox processing (IMAP/Gmail/Brevo event webhooks) and a policy-aware persistent campaign scheduler **before** describing the platform as end-to-end 24/7 automated.

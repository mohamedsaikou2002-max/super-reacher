# HyperReacher — Launch gates (2026-10-30)

This document describes **checks**, not evidence that a production deployment exists. The GitHub repository is named `super-reacher` even though the UI is branded Hyper Reacher.

## Current confirmed status

- Frontend: TanStack Start / React application with Supabase sign-in, lead/contact views, draft generation, and an outreach workspace.
- Outbound: intentionally draft-only. There is **no production email, SMS, WhatsApp, LinkedIn, or phone dispatch adapter**. The Inbox reads Supabase `outreach_events`; no delivery webhooks are implemented here.
- Provider integrations: server-side key storage, Groq, one-person Apollo/Hunter matching, and Firecrawl adapters exist, but provider connection health is **not verified**. Gemini key storage does not imply Gemini inference support.
- Existing `feature/global-outreach-audit-20261023` draft PR is **not** a validated release. The main branch contains more recent changes than that PR; do not merge it blindly.
- No successful GitHub Actions build was visible before this validation workflow was added.
- README links to a Lovable project which was unavailable through the connected Lovable accounts at time of inspection. Publishing and database inspection were therefore not possible through the current integration.

## Release gates (in order)

1. **Credentials / history:** A tracked `.env` was removed in this branch and ignored going forward. Its latest contents on main consisted of Supabase URL/project IDs and **publishable** Supabase keys (browser-safe by design). Removing it does not erase Git history. Review the earlier unclean uploaded ZIP separately for actual **private** API keys, rotate any exposed private credentials, and inspect service logs. Do not put service role keys in the repo or `VITE_` env vars.
2. **CI:** Confirm that the four GitHub Actions jobs all pass: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. Do not assume a passing code-review bot or a local preview equals a production build. Fix errors without relaxing strict TypeScript checks.
3. **Hosting and secrets:** Restore access to the correct Lovable project or provision a supported TanStack Start SSR host. Configure both server and browser Supabase variables. Add server-only `SUPABASE_SERVICE_ROLE_KEY`, `INTEGRATION_VAULT_KEY` (32-byte base64), and only necessary provider secrets in managed secret storage. Verify the deployed SSR runtime can execute authenticated server functions.
4. **Schema:** Take a backup and verify **which migrations have already run** before applying anything. Review the four `supabase/migrations` source migrations, the global outreach migration, and `drizzle/migrations/0000_engine_core_tables.sql`. Note that the global outreach tables appear in **both** Supabase and Drizzle migration folders, so applying both without coordination may fail on duplicate policies. Validate RLS/GRANT behavior against real authenticated and anonymous users.
5. **Security:** Block user-supplied engine URLs and research destinations from resolving to localhost, link-local, metadata, private-network IPs, or unexpected schemes; enforce allowlisted ports, DNS checks, redirect rules, egress policy and timeouts. Migrate `engine_settings.engine_api_key` from directly accessible text storage to a server-only credential vault. Test cross-user isolation.
6. **Providers:** Perform opt-in, sandbox-scoped end-to-end checks for Groq, Firecrawl and Apollo/Hunter with test credentials. Add retries, timeouts, cost accounting, provider quotas, permission checks, audit logs, and provider-specific error handling. Do not conflate a stored key with a healthy integration.
7. **Research workers:** Provision a durable worker/cron scheduler and job status handling for `enrichment_runs`, Firecrawl crawls and source registry import jobs. The current readme explicitly expects such a worker. Test safe egress and duplicate jobs before bulk intake.
8. **Outbound launch (additional build):** Select a transactional/compliant bulk-email provider, then implement tenant-scoped sender verification, domain DNS (SPF/DKIM/DMARC), a persisted send queue, explicit campaign approval, contact eligibility checks, rate limits, retries/idempotency, provider webhooks, bounce handling, opt-out/suppression, and audit trails. Test with an owned inbox and opted-in test contacts **before** public sending. Email and SMS/phone have separate compliance requirements; do not treat draft creation as dispatch.
9. **Business launch:** Confirm privacy notice, terms, data retention/deletion, subscriptions/licensing if applicable, tenant RBAC, support processes, backup/restore, metrics, and alerting.

## Smoke tests after deployment

- Visit the exact deployed URL from a fresh browser and confirm SSR route renders (no 500).
- Sign up, confirm email, log in and log out; verify forbidden requests fail with no session.
- Save and reload outreach profile. Confirm one user's data cannot be read by another.
- Create a lead, generate/copy HTML email, create an agent job, check a configured provider's response, and read the Inbox.
- Verify that **no** external message is sent when the user only previews/drafts.
- Verify approved research targets work and private/localhost targets are rejected.
- Check error logs without exposing credentials or recipient personal data.

**Release rule:** do not publish this as a fully functional automated outreach service until build, backend, schema, provider and compliance gates pass. A draft-only beta can ship earlier with transparent feature limits and properly secured authentication.

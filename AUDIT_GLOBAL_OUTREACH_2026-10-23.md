# SuperReacher — Global Outreach Integration Audit
Audit date: 2026-10-23
Base branch: main (d361ede5242f0b2b125b1ffabcca931ed394e386)
Proposed source: Hyper_Reacher_Global_Outreach_Edition.zip

## Integration status
This branch is a SAFE staging step, NOT a complete ZIP synchronization or production release.
The existing main branch includes France sourcing modules absent from the uploaded new ZIP. Preserve them during integration.

## Critical
1. Main branch tracks a real .env file. Remove the tracked file, rotate ALL contained keys, check their logs and history. Git removal alone does not delete old object history.
2. ZIP originally provided to develop Global Outreach also contained populated API credentials. Rotate independently of the clean distributable package.
3. This project has no verified working build. Do not promote to production until CI passes.

## High
4. TypeScript: 58 errors via 'node node_modules/typescript/bin/tsc --noEmit --pretty false' against local Global Outreach source. Includes mismatches between Supabase generated types and real migrations (businesses, evidence, outreach events) and strict optional/index-signature errors.
5. Vite build and Vitest startup blocked in the present isolated environment by missing Rolldown native optional dependency (@rolldown/binding-linux-x64-gnu); independent clean install required to establish build/test outcome.
6. Provider-key storage, Groq agent routing, and single-contact Apollo/Hunter lookup are staged on this branch, but there is NO verified live connectivity test. Stored credentials are NOT evidence that a provider is healthy.
7. engine.functions.ts callSelfHostedEngine uses user-configured engine_base_url without robust localhost/private-address/redirect defenses (SSRF risk) and engine_api_key stored in engine_settings text field. Restrict destination and move secrets into vault.
8. research-client.ts researchFetch only validates http/https; no DNS/private-network restrictions, and its TOR dispatcher assumptions need integration tests. Restrict targets and enforce redirect policies.
9. Actual outbound message transport, deliverability, opt-out webhook/suppression synchronization and consent jurisdiction checks are not validated. Keep outbound disabled until implemented/tested.
10. Missing tenant/org-scoped licenses, RBAC and quantitative rate limits; current BYO API vault is user-scoped, not an enterprise multi-tenant authorization model.

## Medium
11. Gemini key storage exists but no Gemini execution adapter. Firecrawl user-specific key consumption and other ZIP functionality were not fully ported.
12. Groq costs hardcoded to $0.001 per run in engine.functions.ts rather than actual usage metering.
13. 155 ESLint findings in sampled Global Outreach files (mostly prettier formatting). Full repository lint not yet clean.
14. Archive includes separate socio-shark app, which should be audited and deployed separately, rather than blindly replacing the SuperReacher root.
15. LinkedIn, WhatsApp, SMS and telephone workflows are manual draft/script outputs; NOT actual dispatch integrations. GlobalOutreachStudio in the integration branch does not yet persist profile settings, unlike the local ZIP. CI reports only a CodeRabbit status, not passing typecheck/unit tests/build.

## Required release gates
- Rotate leaked keys; remove tracked .env on main and purge history only after coordination with users.
- Add missing files as an additive change, retaining existing France modules and migrations.
- Run clean dependency install, tsc, lint, unit tests and production build on supported Linux runner.
- Apply BYO API Supabase migration with RLS review; secure vault key in managed secrets.
- Add integration tests for credentials, crawling SSRF boundaries, auth, suppression and contact workflows.
- Validate exports, routing, external API costs, provider terms, logging, GDPR/CAN-SPAM/TCPA requirements.
- Review IP/license and third-party dependencies before distributing software to customers.

Status: NOT production ready.
## Review-branch scope clarification
The GitHub change is a selective functional port of the core Global Outreach features, **not a byte-for-byte ZIP upload**. It currently includes the UI draft studio, encryption vault, BYO setup, a Supabase migration, Groq agent routing, and manual one-contact Apollo/Hunter lookups. Existing France modules are preserved. The separate socio-shark application, full ZIP feature parity and automated integration verification remain out of scope of the staged change.

# HyperReacher global registry setup (VS Code)

## What is genuinely implemented

- **France (FR):** live API Recherche d'entreprises name search (bounded request, no API key), in the Global Outreach Studio.
- **United Kingdom (GB):** Companies House advanced search with server-only `COMPANIES_HOUSE_API_KEY`; name and optional five-digit SIC filter; bounded pagination.
- **Singapore, Italy, Germany, Canada, US states** (also France/UK bulk): **authorized bulk-file import** adapters, CSV/CSV.GZ/ZIP. Source files are not included or fetched without permission. Import is dry-run by default. This is NOT a claim that all national business data is preloaded.
- **Groq/Gemini research:** authenticated `researchRegisteredBusiness` server function uses up to eight already-crawled `web_pages` entries, stores source-grounded structured JSON in `research_results`, and rejects unverified people/contacts; configure `GROQ_API_KEY` or `GEMINI_API_KEY`. This is available to server integrations, not yet exposed as a bulk job worker.\n- **Groq:** multi-country registry niche classification in bounded batches; `GROQ_API_KEY` required. It never invents emails, phone numbers or roles.
- **Scrapy:** optional robots-aware crawler for verified official HTTPS company websites; run explicitly, not enabled as a public crawling proxy.
- **Apollo:** existing contact lookup provider can be configured separately with `APOLLO_API_KEY`. Registry entries have no assumed executive contacts.

## Development startup

```sh
git checkout main
git pull --ff-only
npm ci
cp .env.example .env.local  # fill server secrets locally; never commit .env.local
npm run typecheck
npm test
npm run build
npm run dev
```

Apply migrations in `supabase/migrations` via your existing Supabase migration process before enabling imported records. Confirm your Supabase project IDs, secret manager, authentication and database rules. The live app cannot be verified from CI.

## Search GB/FR and curate records

Open **Global Outreach Studio > Global business registry research**. Select FR or GB, provide a business name, optionally UK SIC, and save raw records. Select a target niche and **Curate with Groq**. Raw/curated records default to outreach review; no dispatch is triggered.
Set `COMPANIES_HOUSE_API_KEY` for GB and `GROQ_API_KEY` for curation in server runtime. Never use VITE_ prefix for secrets.

## Import registry datasets at scale

Use official/authorized licensed business CSV files, not unauthorised scraping.

```sh
python3 scripts/import_registry.py --country SG --file ~/downloads/acra_A.csv --source-url https://data.gov.sg/
# First dry-run, then explicitly authorize upload:
python3 scripts/import_registry.py --country SG --file ~/downloads/acra_A.csv --source-url https://data.gov.sg/ --user-id YOUR_AUTH_USER_UUID --apply
# US state filing numbers must be scoped:
python3 scripts/import_registry.py --country US --state MD --file ~/downloads/state.csv --source-url https://official.state.md.us/filings
python3 -m unittest discover -s scripts/tests -v
```

For `--apply`, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your trusted CLI process environment. Do not put service-role keys into frontend variables or Git. Use a restricted admin machine; service-role requests bypass RLS. Imports are idempotent by user, country, source and registration ID. Missing registration IDs or names are skipped. Registry imports are never equivalent to contact permission.

Dataset-specific column names vary across releases. Adapt CSV headers to the documented mapping if needed; the dry-run preview verifies mapping before upload. For all Singapore ACRA partitions, run one import per CSV. Canada’s federal dataset does not cover provincial corporations; the US has separate state registries. Italy/Germany sources may require a paid data license.

## Optional Scrapy official-website research

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements-crawler.txt
# sites.csv: business_id,official_website
scrapy runspider scripts/official_site_spider.py -a input_csv=sites.csv -O evidence.jsonl
```

Scrapy respects robots.txt, throttles, restricts requests to the supplied domain and enforces page limits. **It does not automatically ingest evidence.jsonl or autonomously launch campaigns.** Review and ingest evidence into `web_pages` through an approved server workflow (existing Firecrawl worker can do this), then connect Muse for downstream approved outreach. DNS rebinding/redirect/private-network protection requires host-level egress firewall.

## Honest integration status

- No live Supabase, Companies House, Groq, Apollo, Lovable or Twilio production credentials are present in GitHub CI.
- No automatic emailing is activated by registry import; existing outbound path defaults OFF and requires sender/account approval, eligibility, suppressions and legal compliance.
- Source catalogs for many US states and other jurisdictions remain unverified; only explicitly supported adapters should claim operational status.
- Backend workers require an always-on server and secrets; a VS Code workspace alone is not a hosted 24/7 system.

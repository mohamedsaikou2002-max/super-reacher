# Super Reach HTML Emails

## ReachOS intelligence workbench

This repository is being repurposed into an evidence-first business intelligence and outreach workspace. The existing authenticated outreach flow remains available while the intelligence layer is introduced behind provider interfaces.

Primary workflow: **Overview**, **Leads**, **Send**, **Inbox**, and **Numbers**.

### Foundation added

- `supabase/migrations/20260923090000_intelligence_workbench.sql` adds businesses, source records, web pages, contacts, evidence, enrichment runs, research results, suppressions, outreach events, and phone numbers.
- `src/lib/intelligence/providers.ts` defines replaceable registry, research, enrichment, and messaging contracts.
- `src/lib/intelligence/normalize.ts`, `website.ts`, and `compliance.ts` provide deterministic deduplication, URL/domain controls, validation, and suppression checks.
- `src/lib/intelligence/firecrawl.server.ts` and `firecrawl.functions.ts` provide an authenticated, bounded official-domain crawl that stores normalized pages in `web_pages`.

The migration is intentionally additive. Configure `FIRECRAWL_API_KEY` server-side before crawling. `queueAllBusinessWebsiteCrawls()` creates idempotent `crawl_website` runs for every owned business with an official website. A worker or scheduled job should claim queued runs and call `runBusinessWebsiteCrawl({ runId, maxPages, maxDepth })`; this keeps bulk crawling asynchronous instead of holding one HTTP request open for every business. The adapter never exposes the key to the browser and rejects pages outside the official domain. Live registry, Gemini/Grok, professional enrichment, and messaging adapters still need to be configured server-side before production use.

create the super reacher and add lime green linear gradient make the auto emails html emails that the user can paste in

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/de646f5f-0ed7-4847-bf9d-9a0e32e6751a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

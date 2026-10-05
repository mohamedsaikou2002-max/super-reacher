-- Stage 1 intake: preserve source records before curation or enrichment.
CREATE TABLE IF NOT EXISTS public.raw_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  country_code text NOT NULL,
  industry text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  source text NOT NULL CHECK (source IN ('api', 'crawl')),
  raw_source_url text NOT NULL,
  source_record_id text NOT NULL,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, country_code, source, source_record_id)
);

ALTER TABLE public.raw_businesses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raw_businesses TO authenticated;
GRANT ALL ON public.raw_businesses TO service_role;
CREATE POLICY "Users manage their raw businesses" ON public.raw_businesses
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX raw_businesses_user_country_fetched_idx
  ON public.raw_businesses (user_id, country_code, fetched_at DESC);

-- Stage 2: preserve the LLM's curation decision and connect it to the business
-- record used by enrichment, website research, and outreach stages.
CREATE TABLE IF NOT EXISTS public.curated_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_business_id uuid NOT NULL REFERENCES public.raw_businesses(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  niche_tag text NOT NULL DEFAULT '',
  relevance_score integer NOT NULL DEFAULT 0 CHECK (relevance_score BETWEEN 0 AND 100),
  relevance_note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'curated' CHECK (status IN ('curated', 'needs_review', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, raw_business_id)
);
ALTER TABLE public.curated_leads ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curated_leads TO authenticated;
GRANT ALL ON public.curated_leads TO service_role;
CREATE POLICY "Users manage their curated leads" ON public.curated_leads
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.raw_businesses r WHERE r.id = raw_business_id AND r.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.raw_businesses r WHERE r.id = raw_business_id AND r.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid())
  );
CREATE INDEX curated_leads_user_status_idx ON public.curated_leads (user_id, status, created_at DESC);

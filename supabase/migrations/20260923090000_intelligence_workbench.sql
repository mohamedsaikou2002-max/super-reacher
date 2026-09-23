-- Evidence-first intelligence model. Existing leads/messages/campaigns remain intact.
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL, country_code text NOT NULL DEFAULT '', region_code text NOT NULL DEFAULT '', industry text NOT NULL DEFAULT '',
  registration_id text NOT NULL DEFAULT '', official_website text, website_status text NOT NULL DEFAULT 'unknown',
  enrichment_status text NOT NULL DEFAULT 'pending', outreach_eligibility text NOT NULL DEFAULT 'review',
  discovered_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated; GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their businesses" ON public.businesses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.business_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  source_system text NOT NULL, source_url text, source_record_id text, raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  retrieved_at timestamptz NOT NULL DEFAULT now(), UNIQUE (business_id, source_system, source_record_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_sources TO authenticated; GRANT ALL ON public.business_sources TO service_role;
ALTER TABLE public.business_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage business sources" ON public.business_sources FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));

CREATE TABLE public.web_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  url text NOT NULL, canonical_url text NOT NULL, title text NOT NULL DEFAULT '', content text NOT NULL DEFAULT '', content_hash text NOT NULL DEFAULT '',
  http_status integer, crawl_status text NOT NULL DEFAULT 'queued', crawled_at timestamptz, UNIQUE (business_id, canonical_url)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.web_pages TO authenticated; GRANT ALL ON public.web_pages TO service_role;
ALTER TABLE public.web_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage web pages" ON public.web_pages FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '', role text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '',
  contact_type text NOT NULL DEFAULT 'other', verification_status text NOT NULL DEFAULT 'unknown', outreach_status text NOT NULL DEFAULT 'review',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated; GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage contacts" ON public.contacts FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));

CREATE TABLE public.contact_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  source text NOT NULL, source_url text, evidence text NOT NULL DEFAULT '', confidence text NOT NULL DEFAULT 'unknown',
  provider text, provider_record_id text, retrieved_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_sources TO authenticated; GRANT ALL ON public.contact_sources TO service_role;
ALTER TABLE public.contact_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage contact sources" ON public.contact_sources FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.contacts c JOIN public.businesses b ON b.id = c.business_id WHERE c.id = contact_id AND b.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.contacts c JOIN public.businesses b ON b.id = c.business_id WHERE c.id = contact_id AND b.user_id = auth.uid()));

CREATE TABLE public.enrichment_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE, type text NOT NULL, status text NOT NULL DEFAULT 'queued',
  attempt integer NOT NULL DEFAULT 0, error text, started_at timestamptz, completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrichment_runs TO authenticated; GRANT ALL ON public.enrichment_runs TO service_role;
ALTER TABLE public.enrichment_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage enrichment runs" ON public.enrichment_runs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.research_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider text NOT NULL, model text NOT NULL DEFAULT '', result jsonb NOT NULL DEFAULT '{}'::jsonb, status text NOT NULL DEFAULT 'complete', retrieved_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_results TO authenticated; GRANT ALL ON public.research_results TO service_role;
ALTER TABLE public.research_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage research results" ON public.research_results FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));

CREATE TABLE public.research_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  field text NOT NULL, value text NOT NULL, source_url text, evidence text NOT NULL DEFAULT '', confidence text NOT NULL DEFAULT 'unknown', retrieved_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_evidence TO authenticated; GRANT ALL ON public.research_evidence TO service_role;
ALTER TABLE public.research_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage research evidence" ON public.research_evidence FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));

CREATE TABLE public.suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', channel text NOT NULL DEFAULT 'global', reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppressions TO authenticated; GRANT ALL ON public.suppressions TO service_role;
ALTER TABLE public.suppressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage suppressions" ON public.suppressions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.outreach_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL, contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  channel text NOT NULL, event_type text NOT NULL, provider text NOT NULL DEFAULT '', metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_events TO authenticated; GRANT ALL ON public.outreach_events TO service_role;
ALTER TABLE public.outreach_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage outreach events" ON public.outreach_events FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_code text NOT NULL, phone_number text NOT NULL, provider text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'active',
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb, routing jsonb NOT NULL DEFAULT '{}'::jsonb, last_used_at timestamptz,
  UNIQUE (user_id, phone_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phone_numbers TO authenticated; GRANT ALL ON public.phone_numbers TO service_role;
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage phone numbers" ON public.phone_numbers FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;
CREATE INDEX businesses_user_status_idx ON public.businesses (user_id, enrichment_status, discovered_at DESC);
CREATE UNIQUE INDEX businesses_user_registration_idx ON public.businesses (user_id, country_code, registration_id) WHERE registration_id <> '';
CREATE INDEX contacts_business_idx ON public.contacts (business_id, verification_status);
CREATE INDEX web_pages_business_idx ON public.web_pages (business_id, crawled_at DESC);
CREATE INDEX suppressions_user_email_idx ON public.suppressions (user_id, email);
CREATE INDEX suppressions_user_phone_idx ON public.suppressions (user_id, phone);
CREATE UNIQUE INDEX enrichment_runs_active_idx ON public.enrichment_runs (user_id, business_id, type) WHERE status IN ('queued', 'running', 'retrying');
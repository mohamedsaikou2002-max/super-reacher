-- Jobs queue
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('research','outreach','coding','creative')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','failed','awaiting_approval','rejected')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result TEXT,
  error TEXT,
  provider_used TEXT,
  model_used TEXT,
  cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs own select" ON public.jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "jobs own insert" ON public.jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "jobs own update" ON public.jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "jobs own delete" ON public.jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX jobs_user_created_idx ON public.jobs (user_id, created_at DESC);

-- Cost approval requests
CREATE TABLE public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'paid_api',
  estimated_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  approved BOOLEAN NOT NULL DEFAULT false,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals own select" ON public.approval_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "approvals own insert" ON public.approval_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "approvals own update" ON public.approval_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "approvals own delete" ON public.approval_requests FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Domains for demo hosting
CREATE TABLE public.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'cloudflare',
  provider_zone_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, domain)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.domains TO authenticated;
GRANT ALL ON public.domains TO service_role;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "domains own select" ON public.domains FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "domains own insert" ON public.domains FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "domains own update" ON public.domains FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "domains own delete" ON public.domains FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Demo microsites
CREATE TABLE public.demos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  template_id TEXT NOT NULL DEFAULT 'restaurant',
  theme TEXT NOT NULL DEFAULT 'lime',
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  html TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','building','deploying','live','failed','disabled','expired')),
  domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
  subdomain TEXT,
  fully_qualified_domain TEXT,
  deployment_url TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demos TO authenticated;
GRANT SELECT ON public.demos TO anon;
GRANT ALL ON public.demos TO service_role;
ALTER TABLE public.demos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demos own select" ON public.demos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "demos public live" ON public.demos FOR SELECT TO anon USING (status = 'live');
CREATE POLICY "demos own insert" ON public.demos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "demos own update" ON public.demos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "demos own delete" ON public.demos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Deployment attempts
CREATE TABLE public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  demo_id UUID NOT NULL REFERENCES public.demos(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  deployment_url TEXT,
  log TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deployments TO authenticated;
GRANT ALL ON public.deployments TO service_role;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deployments own select" ON public.deployments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "deployments own insert" ON public.deployments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "deployments own update" ON public.deployments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "deployments own delete" ON public.deployments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Per-user engine settings (cost rails + optional self-hosted engine)
CREATE TABLE public.engine_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  local_first BOOLEAN NOT NULL DEFAULT true,
  allow_paid_apis BOOLEAN NOT NULL DEFAULT false,
  allow_remote_gpu BOOLEAN NOT NULL DEFAULT false,
  require_cost_approval BOOLEAN NOT NULL DEFAULT true,
  monthly_budget_usd DOUBLE PRECISION NOT NULL DEFAULT 25,
  engine_base_url TEXT NOT NULL DEFAULT '',
  engine_api_key TEXT NOT NULL DEFAULT '',
  engine_enabled BOOLEAN NOT NULL DEFAULT false,
  demo_base_domain TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engine_settings TO authenticated;
GRANT ALL ON public.engine_settings TO service_role;
ALTER TABLE public.engine_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "engine settings own select" ON public.engine_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "engine settings own insert" ON public.engine_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "engine settings own update" ON public.engine_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Corpus records (leads pipeline stages: raw -> normalized -> reviewed -> exported)
CREATE TABLE public.corpus_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'raw' CHECK (stage IN ('raw','normalized','reviewed','exported')),
  source TEXT NOT NULL DEFAULT 'manual',
  country_code TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  record JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corpus_records TO authenticated;
GRANT ALL ON public.corpus_records TO service_role;
ALTER TABLE public.corpus_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corpus own select" ON public.corpus_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "corpus own insert" ON public.corpus_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "corpus own update" ON public.corpus_records FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "corpus own delete" ON public.corpus_records FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX corpus_user_stage_idx ON public.corpus_records (user_id, stage);

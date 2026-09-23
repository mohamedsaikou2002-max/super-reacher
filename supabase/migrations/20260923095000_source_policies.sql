-- Migration: Tor Defensive Research Network

CREATE TABLE public.source_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source text NOT NULL UNIQUE,
    tor_allowed boolean NOT NULL DEFAULT false,
    direct_allowed boolean NOT NULL DEFAULT true,
    requires_manual_review boolean NOT NULL DEFAULT false,
    robots_status text NOT NULL DEFAULT 'unknown',
    terms_status text NOT NULL DEFAULT 'unknown',
    rate_limit text,
    captcha_detected boolean NOT NULL DEFAULT false,
    last_access timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.source_policies TO authenticated;
GRANT ALL ON public.source_policies TO service_role;
ALTER TABLE public.source_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read source policies" ON public.source_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages policies" ON public.source_policies FOR ALL TO service_role USING (true);

CREATE TABLE public.research_requests_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id text NOT NULL,
    worker_id text NOT NULL,
    source text NOT NULL,
    destination_domain text NOT NULL,
    egress_mode text NOT NULL,
    status text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.research_requests_log TO authenticated;
GRANT ALL ON public.research_requests_log TO service_role;
ALTER TABLE public.research_requests_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert logs" ON public.research_requests_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can read their own generated logs" ON public.research_requests_log FOR SELECT TO authenticated USING (worker_id = auth.uid()::text);
CREATE POLICY "Service role manages logs" ON public.research_requests_log FOR ALL TO service_role USING (true);

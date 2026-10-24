-- Hyper Reacher Global Outreach: user-scoped workspace preferences and encrypted provider credentials.
-- Apply with the Supabase migration workflow BEFORE enabling BYO API key setup.
CREATE TABLE IF NOT EXISTS public.global_outreach_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profession text NOT NULL DEFAULT 'General sales',
  audience text NOT NULL DEFAULT 'Qualified business prospects',
  offer text NOT NULL DEFAULT '',
  value_proposition text NOT NULL DEFAULT '',
  preferred_channel text NOT NULL DEFAULT 'email'
    CHECK (preferred_channel IN ('email', 'phone', 'sms', 'linkedin', 'whatsapp', 'crm')),
  preferred_market text NOT NULL DEFAULT 'US',
  sender_name text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.global_outreach_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_outreach_profiles TO authenticated;
GRANT ALL ON public.global_outreach_profiles TO service_role;
CREATE POLICY "Owners manage outreach preferences"
  ON public.global_outreach_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- No SELECT/INSERT/UPDATE/DELETE grants for anon or authenticated on this table.
-- It can only be accessed via authenticated server functions using the service role.
CREATE TABLE IF NOT EXISTS public.provider_credentials (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('groq', 'apollo', 'hunter', 'firecrawl', 'gemini')),
  encrypted_secret text NOT NULL,
  key_hint text NOT NULL DEFAULT '',
  cost_acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);
ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.provider_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.provider_credentials TO service_role;
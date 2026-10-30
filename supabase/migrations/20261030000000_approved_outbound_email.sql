-- Manual, permission-based outbound email only. This does not schedule bulk messaging.
CREATE TABLE IF NOT EXISTS public.email_dispatches (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved','submitted','failed','unknown','delivered','bounced','complained')),
  provider_message_id text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_dispatches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.email_dispatches FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.email_dispatches TO authenticated;
GRANT ALL ON public.email_dispatches TO service_role;
CREATE POLICY "email dispatches owner read" ON public.email_dispatches
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX email_dispatches_by_owner_date ON public.email_dispatches(user_id,created_at DESC);
CREATE INDEX email_dispatches_by_contact_date ON public.email_dispatches(user_id,contact_id,created_at DESC);
CREATE UNIQUE INDEX email_dispatches_provider_id ON public.email_dispatches(provider_message_id) WHERE provider_message_id IS NOT NULL;

-- Invoked exclusively with server-side service-role credentials after auth middleware.
-- Serializes rate-limit and cooldown checks per owner so concurrent clicks cannot bypass quotas.
CREATE OR REPLACE FUNCTION public.reserve_approved_email(
  p_id uuid, p_user_id uuid, p_contact_id uuid, p_subject text
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE target_email text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  SELECT lower(trim(c.email)) INTO target_email
  FROM public.contacts c JOIN public.businesses b ON b.id=c.business_id
  WHERE c.id=p_contact_id AND b.user_id=p_user_id AND c.verification_status='verified'
    AND c.outreach_status='eligible' AND b.outreach_eligibility='eligible';
  IF target_email IS NULL OR target_email='' THEN RAISE EXCEPTION 'Contact is not eligible for email'; END IF;
  IF EXISTS (SELECT 1 FROM public.suppressions s WHERE s.user_id=p_user_id
    AND lower(trim(s.email))=target_email AND s.channel IN ('global','email')) THEN
    RAISE EXCEPTION 'Recipient opted out';
  END IF;
  IF (SELECT count(*) FROM public.email_dispatches
    WHERE user_id=p_user_id AND created_at>now()-interval '1 day') >= 25 THEN
    RAISE EXCEPTION 'Daily message limit reached';
  END IF;
  IF EXISTS (SELECT 1 FROM public.email_dispatches
    WHERE user_id=p_user_id AND contact_id=p_contact_id
    AND created_at>now()-interval '7 days' AND status IN ('reserved','submitted','unknown','delivered')) THEN
    RAISE EXCEPTION 'Contact cooldown is active';
  END IF;
  INSERT INTO public.email_dispatches(id,user_id,contact_id,subject)
  VALUES (p_id,p_user_id,p_contact_id,left(p_subject,200));
END $$;
REVOKE ALL ON FUNCTION public.reserve_approved_email(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_approved_email(uuid,uuid,uuid,text) TO service_role;

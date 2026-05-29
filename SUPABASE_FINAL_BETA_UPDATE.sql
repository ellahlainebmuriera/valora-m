-- Valora EM final beta update patch.
-- Paste this into Supabase SQL Editor and click Run.
-- This is safe to run more than once because it uses IF NOT EXISTS where possible.

ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS document_language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS app_interface_language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS auto_renewal_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hard_delete_after TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deletion_type TEXT;

ALTER TABLE IF EXISTS public.business_profiles
ADD COLUMN IF NOT EXISTS document_language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS app_interface_language TEXT DEFAULT 'en';

ALTER TABLE IF EXISTS public.app_payments
ADD COLUMN IF NOT EXISTS billing_mode TEXT DEFAULT 'Manual Renewal',
ADD COLUMN IF NOT EXISTS auto_renewal_enabled BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_email TEXT,
    deletion_type TEXT DEFAULT 'soft_7_day',
    status TEXT DEFAULT 'SOFT_DELETE_PENDING',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    hard_delete_after TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own deletion requests." ON public.account_deletion_requests;
CREATE POLICY "Users can create their own deletion requests."
    ON public.account_deletion_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read their own deletion requests." ON public.account_deletion_requests;
CREATE POLICY "Users can read their own deletion requests."
    ON public.account_deletion_requests FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner admin can view deletion requests." ON public.account_deletion_requests;
CREATE POLICY "Owner admin can view deletion requests."
    ON public.account_deletion_requests FOR SELECT
    USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

DROP POLICY IF EXISTS "Users can delete their own profile row." ON public.profiles;
CREATE POLICY "Users can delete their own profile row."
    ON public.profiles FOR DELETE
    USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.purge_due_deleted_accounts()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users
  WHERE id IN (
    SELECT id
    FROM public.profiles
    WHERE is_deleted = TRUE
      AND hard_delete_after IS NOT NULL
      AND hard_delete_after <= timezone('utc'::text, now())
  );

  UPDATE public.account_deletion_requests
  SET status = 'COMPLETED',
      completed_at = timezone('utc'::text, now())
  WHERE completed_at IS NULL
    AND hard_delete_after <= timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.purge_due_deleted_accounts() FROM PUBLIC;

NOTIFY pgrst, 'reload schema';

-- Valora EM: unread inbox badges + soft delete for Feature Requests and Bug Reports.
-- Run this once in Supabase SQL Editor.

ALTER TABLE public.feature_requests
ADD COLUMN IF NOT EXISTS is_read_by_admin BOOLEAN DEFAULT FALSE;

ALTER TABLE public.feature_requests
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE public.feature_requests
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS is_read_by_admin BOOLEAN DEFAULT FALSE;

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS is_read_by_user BOOLEAN DEFAULT TRUE;

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS deleted_by_admin BOOLEAN DEFAULT FALSE;

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS deleted_by_user BOOLEAN DEFAULT FALSE;

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

DROP POLICY IF EXISTS "Owner admin can update feature requests." ON public.feature_requests;
CREATE POLICY "Owner admin can update feature requests."
ON public.feature_requests
FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

DROP POLICY IF EXISTS "Users can update their own tickets." ON public.tickets;
CREATE POLICY "Users can update their own tickets."
ON public.tickets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner admin can update all tickets." ON public.tickets;
CREATE POLICY "Owner admin can update all tickets."
ON public.tickets
FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

NOTIFY pgrst, 'reload schema';

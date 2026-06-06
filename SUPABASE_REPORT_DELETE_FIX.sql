-- Valora EM: focused permanent-delete permission fix.
-- Run this entire file once in Supabase SQL Editor.

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Table privileges are still required before RLS policies can allow an action.
GRANT SELECT, UPDATE, DELETE ON TABLE public.feature_requests TO authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.tickets TO authenticated;

DROP POLICY IF EXISTS "Owner admin can view all feature requests." ON public.feature_requests;
CREATE POLICY "Owner admin can view all feature requests."
ON public.feature_requests
FOR SELECT
TO authenticated
USING (
    lower(COALESCE(auth.jwt() ->> 'email', '')) =
    'ellahlaine.b.muriera@gmail.com'
);

DROP POLICY IF EXISTS "Owner admin can update feature requests." ON public.feature_requests;
CREATE POLICY "Owner admin can update feature requests."
ON public.feature_requests
FOR UPDATE
TO authenticated
USING (
    lower(COALESCE(auth.jwt() ->> 'email', '')) =
    'ellahlaine.b.muriera@gmail.com'
)
WITH CHECK (
    lower(COALESCE(auth.jwt() ->> 'email', '')) =
    'ellahlaine.b.muriera@gmail.com'
);

DROP POLICY IF EXISTS "Owner admin can delete feature requests." ON public.feature_requests;
CREATE POLICY "Owner admin can delete feature requests."
ON public.feature_requests
FOR DELETE
TO authenticated
USING (
    lower(COALESCE(auth.jwt() ->> 'email', '')) =
    'ellahlaine.b.muriera@gmail.com'
);

DROP POLICY IF EXISTS "Users can read their own tickets." ON public.tickets;
CREATE POLICY "Users can read their own tickets."
ON public.tickets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tickets." ON public.tickets;
CREATE POLICY "Users can delete their own tickets."
ON public.tickets
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner admin can read all tickets." ON public.tickets;
CREATE POLICY "Owner admin can read all tickets."
ON public.tickets
FOR SELECT
TO authenticated
USING (
    lower(COALESCE(auth.jwt() ->> 'email', '')) =
    'ellahlaine.b.muriera@gmail.com'
);

DROP POLICY IF EXISTS "Owner admin can delete all tickets." ON public.tickets;
CREATE POLICY "Owner admin can delete all tickets."
ON public.tickets
FOR DELETE
TO authenticated
USING (
    lower(COALESCE(auth.jwt() ->> 'email', '')) =
    'ellahlaine.b.muriera@gmail.com'
);

NOTIFY pgrst, 'reload schema';

-- This result should show the owner DELETE policies after the script runs.
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('feature_requests', 'tickets')
  AND cmd IN ('SELECT', 'DELETE')
ORDER BY tablename, cmd, policyname;

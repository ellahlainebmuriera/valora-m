-- Valora EM: message-level unread badges and persistent report deletion.
-- Run this entire file once in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.app_migrations (
    migration_key TEXT PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.app_migrations ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE public.ticket_messages
ADD COLUMN IF NOT EXISTS is_read_by_admin BOOLEAN DEFAULT FALSE;

ALTER TABLE public.ticket_messages
ADD COLUMN IF NOT EXISTS is_read_by_user BOOLEAN DEFAULT FALSE;

-- Existing records are treated as already read. Only messages and requests
-- submitted after this migration will create new unread notifications.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.app_migrations
        WHERE migration_key = 'inbox-message-unread-v2'
    ) THEN
        UPDATE public.feature_requests
        SET is_read_by_admin = TRUE;

        UPDATE public.ticket_messages
        SET is_read_by_admin = TRUE,
            is_read_by_user = TRUE;

        INSERT INTO public.app_migrations (migration_key)
        VALUES ('inbox-message-unread-v2');
    END IF;
END
$$;

DROP POLICY IF EXISTS "Owner admin can update feature requests." ON public.feature_requests;
CREATE POLICY "Owner admin can update feature requests."
ON public.feature_requests
FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

DROP POLICY IF EXISTS "Owner admin can delete feature requests." ON public.feature_requests;
CREATE POLICY "Owner admin can delete feature requests."
ON public.feature_requests
FOR DELETE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

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

DROP POLICY IF EXISTS "Users can delete their own tickets." ON public.tickets;
CREATE POLICY "Users can delete their own tickets."
ON public.tickets
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner admin can delete all tickets." ON public.tickets;
CREATE POLICY "Owner admin can delete all tickets."
ON public.tickets
FOR DELETE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

DROP POLICY IF EXISTS "Users can mark their ticket messages read." ON public.ticket_messages;
CREATE POLICY "Users can mark their ticket messages read."
ON public.ticket_messages
FOR UPDATE
TO authenticated
USING (
    is_admin_reply = TRUE
    AND EXISTS (
        SELECT 1
        FROM public.tickets
        WHERE public.tickets.id = public.ticket_messages.ticket_id
        AND public.tickets.user_id = auth.uid()
    )
)
WITH CHECK (
    is_admin_reply = TRUE
    AND EXISTS (
        SELECT 1
        FROM public.tickets
        WHERE public.tickets.id = public.ticket_messages.ticket_id
        AND public.tickets.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Owner admin can mark ticket messages read." ON public.ticket_messages;
CREATE POLICY "Owner admin can mark ticket messages read."
ON public.ticket_messages
FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

NOTIFY pgrst, 'reload schema';

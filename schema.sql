-- Database Schema for Valora EM Invoicing SaaS
-- Copy and paste this script into the Supabase SQL Editor to set up your database tables.

-- 1. Profiles Table (Linked to Supabase Auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    company_name TEXT DEFAULT 'My Business',
    email TEXT,
    phone TEXT,
    address TEXT,
    logo_url TEXT,
    currency TEXT DEFAULT 'PHP',
    currency_symbol TEXT DEFAULT '₱',
    default_tax_rate NUMERIC DEFAULT 12.0,
    is_pro BOOLEAN DEFAULT FALSE,
    invoice_count INTEGER DEFAULT 0,
    invoice_theme_color TEXT DEFAULT '#6366f1',
    invoice_text_color TEXT DEFAULT '#1e293b',
    preferred_language TEXT DEFAULT 'en',
    document_language TEXT DEFAULT 'en',
    app_interface_language TEXT DEFAULT 'en',
    custom_language_name TEXT DEFAULT '',
    print_layout TEXT DEFAULT 'pdf',
    app_appearance TEXT DEFAULT 'dark',
    saved_signature_data_url TEXT,
    save_signature_permission BOOLEAN DEFAULT FALSE,
    plan TEXT DEFAULT 'Standard Free Plan',
    billing_cycle TEXT DEFAULT 'monthly',
    auto_renewal_enabled BOOLEAN DEFAULT FALSE,
    billing_status TEXT DEFAULT 'manual',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    last_business_info_updated_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deletion_requested_at TIMESTAMP WITH TIME ZONE,
    hard_delete_after TIMESTAMP WITH TIME ZONE,
    deletion_type TEXT
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile." 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile." 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile." 
    ON public.profiles FOR INSERT 
    WITH CHECK (
        auth.uid() = id
        AND COALESCE(is_pro, FALSE) = FALSE
        AND COALESCE(plan, 'Standard Free Plan') = 'Standard Free Plan'
        AND COALESCE(auto_renewal_enabled, FALSE) = FALSE
        AND subscription_expires_at IS NULL
    );

REVOKE UPDATE ON TABLE public.profiles FROM anon, authenticated;
GRANT UPDATE (
    updated_at, company_name, email, phone, address, logo_url, currency,
    currency_symbol, default_tax_rate, invoice_theme_color, invoice_text_color,
    preferred_language, document_language, app_interface_language,
    custom_language_name, print_layout, app_appearance, saved_signature_data_url,
    save_signature_permission, last_business_info_updated_at, is_deleted,
    deletion_requested_at, hard_delete_after, deletion_type
) ON public.profiles TO authenticated;

-- 2. Clients Table (List of customers for each shop)
CREATE TABLE public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT
);

-- Enable RLS for Clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD their own clients." ON public.clients;
CREATE POLICY "Users can CRUD their own clients." 
    ON public.clients FOR ALL
    TO authenticated
    USING (
        auth.uid() = user_id
        OR (auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com'
    ) 
    WITH CHECK (
        auth.uid() = user_id
        OR (auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com'
    );

-- 3. Invoices Table (List of invoices/estimates)
CREATE TABLE public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    invoice_number TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    type TEXT DEFAULT 'invoice', -- 'invoice' or 'estimate'
    status TEXT DEFAULT 'Unpaid', -- 'Paid', 'Unpaid', 'Draft', 'Overdue'
    tax_rate NUMERIC DEFAULT 12.0,
    discount NUMERIC DEFAULT 0.0,
    shipping NUMERIC DEFAULT 0.0,
    notes TEXT,
    subtotal NUMERIC DEFAULT 0.0,
    tax_amount NUMERIC DEFAULT 0.0,
    total NUMERIC DEFAULT 0.0,
    signature_data_url TEXT,
    printed_name TEXT,
    request_client_signature BOOLEAN DEFAULT FALSE,
    photo_data_urls JSONB DEFAULT '[]'::jsonb,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- For existing Supabase projects, run these safely if the table already exists.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS business_profile_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_business_info_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS document_language TEXT DEFAULT 'en';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS app_interface_language TEXT DEFAULT 'en';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_renewal_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'manual';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hard_delete_after TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deletion_type TEXT;

-- Enable RLS for Invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices."
    ON public.invoices FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices."
    ON public.invoices FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices."
    ON public.invoices FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own draft invoices."
    ON public.invoices FOR DELETE TO authenticated
    USING (auth.uid() = user_id AND LOWER(COALESCE(status, '')) = 'draft');

-- 4. Invoice Items Table (Line items inside invoices)
CREATE TABLE public.invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC DEFAULT 1.0,
    unit_price NUMERIC NOT NULL,
    total NUMERIC NOT NULL
);

-- Enable RLS for Invoice Items
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own invoice items." 
    ON public.invoice_items FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE public.invoices.id = public.invoice_items.invoice_id 
            AND public.invoices.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE public.invoices.id = public.invoice_items.invoice_id 
            AND public.invoices.user_id = auth.uid()
        )
    );

-- 5. Expenses Table (Operating costs for net profit reporting)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    business_profile_id TEXT,
    expense_date DATE DEFAULT CURRENT_DATE,
    category TEXT DEFAULT 'Other',
    vendor TEXT,
    description TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD their own expenses." ON public.expenses;
CREATE POLICY "Users can CRUD their own expenses."
    ON public.expenses FOR ALL
    USING (auth.uid() = user_id OR (auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com')
    WITH CHECK (auth.uid() = user_id OR (auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

-- 6. Feature Requests (customer requests visible to owner/admin)
CREATE TABLE public.app_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_email TEXT NOT NULL,
    plan TEXT NOT NULL,
    method TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'paid',
    billing_mode TEXT DEFAULT 'Manual Renewal',
    auto_renewal_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.app_payments ADD COLUMN IF NOT EXISTS billing_mode TEXT DEFAULT 'Manual Renewal';
ALTER TABLE public.app_payments ADD COLUMN IF NOT EXISTS auto_renewal_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE public.app_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment records."
    ON public.app_payments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Owner admin can view all payment records."
    ON public.app_payments FOR SELECT
    USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

CREATE TABLE public.feature_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_email TEXT,
    request_text TEXT NOT NULL,
    is_read_by_admin BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit feature requests."
    ON public.feature_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner admin can view all feature requests."
    ON public.feature_requests FOR SELECT
    USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

CREATE POLICY "Owner admin can update feature requests."
    ON public.feature_requests FOR UPDATE
    USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com')
    WITH CHECK ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

CREATE POLICY "Owner admin can delete feature requests."
    ON public.feature_requests FOR DELETE
    USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

-- 7. Multi-store business profiles, per-store catalog, and support tickets
CREATE TABLE IF NOT EXISTS public.business_profiles (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    company_name TEXT DEFAULT 'My Business',
    email TEXT,
    phone TEXT,
    address TEXT,
    logo_url TEXT,
    currency TEXT DEFAULT 'PHP',
    currency_symbol TEXT DEFAULT 'PHP',
    default_tax_rate NUMERIC DEFAULT 12.0,
    invoice_theme_color TEXT DEFAULT '#6366f1',
    invoice_text_color TEXT DEFAULT '#1e293b',
    preferred_language TEXT DEFAULT 'en',
    document_language TEXT DEFAULT 'en',
    app_interface_language TEXT DEFAULT 'en',
    custom_language_name TEXT DEFAULT '',
    print_layout TEXT DEFAULT 'pdf',
    app_appearance TEXT DEFAULT 'dark',
    saved_signature_data_url TEXT,
    save_signature_permission BOOLEAN DEFAULT FALSE,
    last_business_info_updated_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS document_language TEXT DEFAULT 'en';
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS app_interface_language TEXT DEFAULT 'en';

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD their own business profiles." ON public.business_profiles;
CREATE POLICY "Users can CRUD their own business profiles."
    ON public.business_profiles FOR ALL
    USING (auth.uid() = user_id OR (auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com')
    WITH CHECK (auth.uid() = user_id OR (auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

CREATE TABLE IF NOT EXISTS public.saved_items (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    business_profile_id TEXT REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    unit_price NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (business_profile_id, name)
);

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD saved catalog items for their stores." ON public.saved_items;
CREATE POLICY "Users can CRUD saved catalog items for their stores."
    ON public.saved_items FOR ALL
    USING (auth.uid() = user_id OR (auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com')
    WITH CHECK (auth.uid() = user_id OR (auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_email TEXT,
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
    is_read_by_admin BOOLEAN DEFAULT FALSE,
    is_read_by_user BOOLEAN DEFAULT TRUE,
    deleted_by_admin BOOLEAN DEFAULT FALSE,
    deleted_by_user BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create and read their own tickets." ON public.tickets;
DROP POLICY IF EXISTS "Users can read their own tickets." ON public.tickets;
DROP POLICY IF EXISTS "Users can create their own tickets." ON public.tickets;
DROP POLICY IF EXISTS "Owner admin can read all tickets." ON public.tickets;
DROP POLICY IF EXISTS "Owner admin can update tickets." ON public.tickets;

CREATE POLICY "Users can read their own tickets."
    ON public.tickets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets."
    ON public.tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner admin can read all tickets."
    ON public.tickets FOR SELECT
    USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

CREATE POLICY "Owner admin can update tickets."
    ON public.tickets FOR UPDATE
    USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com')
    WITH CHECK ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

CREATE POLICY "Users can update their own tickets."
    ON public.tickets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tickets."
    ON public.tickets FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Owner admin can delete all tickets."
    ON public.tickets FOR DELETE
    USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT FALSE,
    is_read_by_admin BOOLEAN DEFAULT FALSE,
    is_read_by_user BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and owner can read ticket messages." ON public.ticket_messages;
CREATE POLICY "Users and owner can read ticket messages."
    ON public.ticket_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets
            WHERE public.tickets.id = public.ticket_messages.ticket_id
            AND (public.tickets.user_id = auth.uid() OR (auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com')
        )
    );

DROP POLICY IF EXISTS "Users and owner can send ticket messages." ON public.ticket_messages;
CREATE POLICY "Users and owner can send ticket messages."
    ON public.ticket_messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND
        EXISTS (
            SELECT 1 FROM public.tickets
            WHERE public.tickets.id = public.ticket_messages.ticket_id
            AND (public.tickets.user_id = auth.uid() OR (auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com')
        )
    );

CREATE POLICY "Users can mark their ticket messages read."
    ON public.ticket_messages FOR UPDATE
    USING (
        is_admin_reply = TRUE
        AND EXISTS (
            SELECT 1 FROM public.tickets
            WHERE public.tickets.id = public.ticket_messages.ticket_id
            AND public.tickets.user_id = auth.uid()
        )
    )
    WITH CHECK (
        is_admin_reply = TRUE
        AND EXISTS (
            SELECT 1 FROM public.tickets
            WHERE public.tickets.id = public.ticket_messages.ticket_id
            AND public.tickets.user_id = auth.uid()
        )
    );

CREATE POLICY "Owner admin can mark ticket messages read."
    ON public.ticket_messages FOR UPDATE
    USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com')
    WITH CHECK ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

-- Account deletion request queue.
-- Browser code can request deletion, but final Auth user purging must run with a trusted service role.
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

-- Optional scheduled purge helper.
-- Schedule this with Supabase pg_cron or an Edge Function using service-role credentials after launch.
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

-- 8. Automate Profile Creation on Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, company_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'company_name', 'My Business'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

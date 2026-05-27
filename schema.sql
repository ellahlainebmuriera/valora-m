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
    custom_language_name TEXT DEFAULT '',
    print_layout TEXT DEFAULT 'pdf',
    app_appearance TEXT DEFAULT 'dark',
    saved_signature_data_url TEXT,
    save_signature_permission BOOLEAN DEFAULT FALSE,
    plan TEXT DEFAULT 'Standard Free Plan'
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile." 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile." 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile." 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

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

CREATE POLICY "Users can CRUD their own clients." 
    ON public.clients FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

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
    photo_data_urls JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS for Invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own invoices." 
    ON public.invoices FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

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

-- 5. Feature Requests (customer requests visible to owner/admin)
CREATE TABLE public.app_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_email TEXT NOT NULL,
    plan TEXT NOT NULL,
    method TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'paid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.app_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own payment records."
    ON public.app_payments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit feature requests."
    ON public.feature_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner admin can view all feature requests."
    ON public.feature_requests FOR SELECT
    USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

-- 5. Automate Profile Creation on Sign Up
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

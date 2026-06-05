-- Valora EM: PayMongo Hosted Checkout + Webhook Automation
-- Run this once in Supabase SQL Editor before testing automatic payments.

CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_email TEXT NOT NULL,
    plan TEXT NOT NULL,
    billing_cycle TEXT DEFAULT 'monthly',
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'PHP',
    status TEXT DEFAULT 'pending',
    paymongo_reference_number TEXT NOT NULL UNIQUE,
    paymongo_checkout_session_id TEXT UNIQUE,
    paymongo_payment_id TEXT,
    paymongo_payment_intent_id TEXT,
    paymongo_source_type TEXT,
    checkout_url TEXT,
    raw_checkout_response JSONB,
    raw_webhook_event JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    paid_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS raw_checkout_response JSONB;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS raw_webhook_event JSONB;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Standard Free Plan';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_renewal_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'manual';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE public.app_payments ADD COLUMN IF NOT EXISTS billing_mode TEXT DEFAULT 'Manual Renewal';
ALTER TABLE public.app_payments ADD COLUMN IF NOT EXISTS auto_renewal_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.app_payments ADD COLUMN IF NOT EXISTS paymongo_reference_number TEXT;
ALTER TABLE public.app_payments ADD COLUMN IF NOT EXISTS paymongo_checkout_session_id TEXT;
ALTER TABLE public.app_payments ADD COLUMN IF NOT EXISTS paymongo_payment_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS app_payments_paymongo_reference_idx
    ON public.app_payments(paymongo_reference_number)
    WHERE paymongo_reference_number IS NOT NULL;

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payment orders." ON public.payment_orders;
CREATE POLICY "Users can view their own payment orders."
    ON public.payment_orders FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner admin can view all payment orders." ON public.payment_orders;
CREATE POLICY "Owner admin can view all payment orders."
    ON public.payment_orders FOR SELECT
    TO authenticated
    USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

ALTER TABLE public.app_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner admin can view all payment records." ON public.app_payments;
CREATE POLICY "Owner admin can view all payment records."
    ON public.app_payments FOR SELECT
    TO authenticated
    USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

-- The Edge Functions use the service role key to insert/update payment_orders,
-- activate profiles, and log app_payments after PayMongo confirms payment.

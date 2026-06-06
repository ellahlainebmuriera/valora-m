-- Valora EM launch security hardening
-- Run this once in Supabase SQL Editor before public launch.

BEGIN;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Standard Free Plan',
    ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly',
    ADD COLUMN IF NOT EXISTS auto_renewal_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
CREATE POLICY "Users can view their own profile."
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert a free profile." ON public.profiles;
CREATE POLICY "Users can insert a free profile."
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = id
        AND COALESCE(is_pro, FALSE) = FALSE
        AND COALESCE(plan, 'Standard Free Plan') = 'Standard Free Plan'
        AND COALESCE(auto_renewal_enabled, FALSE) = FALSE
        AND subscription_expires_at IS NULL
    );

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own non-billing profile." ON public.profiles;
CREATE POLICY "Users can update their own non-billing profile."
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users may edit business preferences, but never their own paid entitlement.
REVOKE UPDATE ON TABLE public.profiles FROM anon, authenticated;
GRANT UPDATE (
    updated_at,
    company_name,
    email,
    phone,
    address,
    logo_url,
    currency,
    currency_symbol,
    default_tax_rate,
    invoice_theme_color,
    invoice_text_color,
    preferred_language,
    document_language,
    app_interface_language,
    custom_language_name,
    print_layout,
    app_appearance,
    saved_signature_data_url,
    save_signature_permission,
    last_business_info_updated_at,
    is_deleted,
    deletion_requested_at,
    hard_delete_after,
    deletion_type
) ON public.profiles TO authenticated;

-- Payment records are written only by the PayMongo webhook/service role.
DROP POLICY IF EXISTS "Users can create their own payment records." ON public.app_payments;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.app_payments FROM anon, authenticated;

DROP POLICY IF EXISTS "Users can view their own payment records." ON public.app_payments;
CREATE POLICY "Users can view their own payment records."
    ON public.app_payments
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner admin can view all payment records." ON public.app_payments;
CREATE POLICY "Owner admin can view all payment records."
    ON public.app_payments
    FOR SELECT
    TO authenticated
    USING ((auth.jwt() ->> 'email') = 'ellahlaine.b.muriera@gmail.com');

-- Issued invoices remain in the audit trail. Only Draft invoices can be hard deleted.
DROP POLICY IF EXISTS "Users can CRUD their own invoices." ON public.invoices;
DROP POLICY IF EXISTS "Users can view their own invoices." ON public.invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices." ON public.invoices;
DROP POLICY IF EXISTS "Users can update their own invoices." ON public.invoices;
DROP POLICY IF EXISTS "Users can delete their own draft invoices." ON public.invoices;

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

CREATE OR REPLACE FUNCTION public.enforce_valora_invoice_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    profile_record public.profiles%ROWTYPE;
    documents_this_week INTEGER;
    has_paid_access BOOLEAN;
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF NEW.user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Invoice owner does not match the authenticated user.';
    END IF;

    SELECT *
    INTO profile_record
    FROM public.profiles
    WHERE id = NEW.user_id;

    has_paid_access :=
        profile_record.is_pro = TRUE
        AND COALESCE(profile_record.plan, 'Standard Free Plan') <> 'Standard Free Plan'
        AND profile_record.subscription_expires_at IS NOT NULL
        AND profile_record.subscription_expires_at > NOW();

    IF has_paid_access OR profile_record.email = 'ellahlaine.b.muriera@gmail.com' THEN
        RETURN NEW;
    END IF;

    NEW.created_at := NOW();

    SELECT COUNT(*)
    INTO documents_this_week
    FROM public.invoices
    WHERE user_id = NEW.user_id
      AND created_at >= DATE_TRUNC('week', NOW())
      AND COALESCE(is_deleted, FALSE) = FALSE;

    IF documents_this_week >= 5 THEN
        RAISE EXCEPTION 'Weekly free document limit reached.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_valora_invoice_limit_trigger ON public.invoices;
CREATE TRIGGER enforce_valora_invoice_limit_trigger
    BEFORE INSERT ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_valora_invoice_limit();

REVOKE ALL ON FUNCTION public.enforce_valora_invoice_limit() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_valora_profile_features()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    has_paid_access BOOLEAN;
    paid_plan TEXT;
BEGIN
    IF auth.role() = 'service_role' OR OLD.email = 'ellahlaine.b.muriera@gmail.com' THEN
        RETURN NEW;
    END IF;

    has_paid_access :=
        OLD.is_pro = TRUE
        AND COALESCE(OLD.plan, 'Standard Free Plan') <> 'Standard Free Plan'
        AND OLD.subscription_expires_at IS NOT NULL
        AND OLD.subscription_expires_at > NOW();
    paid_plan := COALESCE(OLD.plan, 'Standard Free Plan');

    IF NEW.logo_url IS DISTINCT FROM OLD.logo_url
       AND (NOT has_paid_access OR paid_plan NOT IN ('Pro Unlimited Plan', 'Business Unlimited')) THEN
        RAISE EXCEPTION 'Logo upload requires Pro Unlimited or Business Unlimited.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_valora_profile_features_trigger ON public.profiles;
CREATE TRIGGER enforce_valora_profile_features_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_valora_profile_features();

REVOKE ALL ON FUNCTION public.enforce_valora_profile_features() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.expire_valora_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE public.profiles
    SET
        is_pro = FALSE,
        plan = 'Standard Free Plan',
        billing_status = 'expired',
        auto_renewal_enabled = FALSE,
        updated_at = NOW()
    WHERE subscription_expires_at IS NOT NULL
      AND subscription_expires_at <= NOW()
      AND (
          is_pro = TRUE
          OR COALESCE(plan, 'Standard Free Plan') <> 'Standard Free Plan'
      );

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_valora_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_valora_subscriptions() TO service_role;

COMMIT;

-- Apply expiry cleanup immediately. Later, schedule this function daily with Supabase Cron.
SELECT public.expire_valora_subscriptions();
NOTIFY pgrst, 'reload schema';

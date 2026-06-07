-- Valora EM Phase 1A: Estimate to Invoice conversion links.
-- Run once in Supabase SQL Editor before using Convert to Invoice.

BEGIN;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS source_estimate_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS converted_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_one_conversion_per_estimate
    ON public.invoices (source_estimate_id)
    WHERE source_estimate_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;

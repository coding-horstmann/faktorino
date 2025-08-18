-- Optimierte Version der Rechnungsnummern-Funktion für bessere Performance
-- Führe dies in deinem Supabase SQL-Editor aus

-- Drop existing function
DROP FUNCTION IF EXISTS public.reserve_invoice_numbers(UUID, INT, INT);

-- Create optimized function
CREATE OR REPLACE FUNCTION public.reserve_invoice_numbers(p_user_id UUID, p_year INT, p_count INT)
RETURNS TABLE(year INT, number INT) AS $$
DECLARE
    v_max_number INT;
BEGIN
    -- Use a more efficient query with proper indexing
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'RE-' || p_year || '-(.+)$') AS INTEGER)), 0)
    INTO v_max_number
    FROM public.invoices
    WHERE user_id = p_user_id 
      AND invoice_number LIKE 'RE-' || p_year || '-%';

    -- Generate numbers efficiently
    RETURN QUERY
    SELECT p_year, generate_series(v_max_number + 1, v_max_number + p_count);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.reserve_invoice_numbers(UUID, INT, INT) TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_year_number ON public.invoices(user_id, invoice_number) 
WHERE invoice_number LIKE 'RE-%';

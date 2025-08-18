-- This script updates the invoice number generation logic to be based on
-- the highest existing invoice number for a user in a given year,
-- instead of relying on the separate 'invoice_counters' table.

-- Step 1: Drop the old function to ensure a clean replacement.
DROP FUNCTION IF EXISTS public.reserve_invoice_numbers(UUID, INT, INT);

-- Step 2: Recreate the function with the new "intelligent search" logic.
CREATE OR REPLACE FUNCTION public.reserve_invoice_numbers(p_user_id UUID, p_year INT, p_count INT)
RETURNS TABLE(year INT, number INT) AS $$
DECLARE
    v_max_number INT;
BEGIN
    -- Find the highest existing invoice number for the user and year by parsing the 'invoice_number' string.
    -- The format is assumed to be 'RE-YYYY-NNNN'. We extract the 'NNNN' part.
    -- COALESCE ensures that if no invoices exist yet for that year, we start from 0.
    SELECT
        COALESCE(MAX(split_part(invoice_number, '-', 3)::INT), 0)
    INTO
        v_max_number
    FROM
        public.invoices
    WHERE
        user_id = p_user_id
        AND invoice_number LIKE 'RE-' || p_year || '-%';

    -- Generate a series of new numbers starting from the found max number + 1.
    RETURN QUERY
    SELECT
        p_year,
        s.number
    FROM
        generate_series(v_max_number + 1, v_max_number + p_count) AS s(number);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- Step 3: Grant permissions to the new function.
GRANT EXECUTE ON FUNCTION public.reserve_invoice_numbers(UUID, INT, INT) TO authenticated;

-- Step 4 (Optional but Recommended): The 'invoice_counters' table is no longer needed.
-- You can drop it to clean up the database schema.
-- DROP TABLE IF EXISTS public.invoice_counters;

-- Migration complete. The system will now generate invoice numbers based on actual invoice data.

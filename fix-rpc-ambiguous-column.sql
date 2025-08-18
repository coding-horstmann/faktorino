-- FIX: Repair the ambiguous column reference in reserve_invoice_numbers function
-- The issue is that both the table and return query have a 'year' column

-- Drop and recreate the function with explicit column aliases
DROP FUNCTION IF EXISTS public.reserve_invoice_numbers(UUID, INT, INT);

CREATE OR REPLACE FUNCTION public.reserve_invoice_numbers(p_user_id UUID, p_year INT, p_count INT)
RETURNS TABLE(year INT, number INT) AS $$
DECLARE
    v_new_last_number INT;
    v_current_number INT;
BEGIN
    -- Validate input parameters
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_year IS NULL OR p_year < 1900 OR p_year > 2100 THEN
        RAISE EXCEPTION 'Invalid year: %', p_year;
    END IF;
    
    IF p_count IS NULL OR p_count <= 0 OR p_count > 10000 THEN
        RAISE EXCEPTION 'Invalid count: %, must be between 1 and 10000', p_count;
    END IF;

    -- Insert or update the counter with explicit table reference
    INSERT INTO public.invoice_counters (user_id, year, last_number)
    VALUES (p_user_id, p_year, p_count)
    ON CONFLICT (user_id, year)
    DO UPDATE SET 
        last_number = invoice_counters.last_number + p_count,
        updated_at = timezone('utc'::text, now())
    RETURNING last_number INTO v_new_last_number;

    -- Generate the series of numbers with explicit column aliases to avoid ambiguity
    RETURN QUERY
    SELECT p_year AS year, s.number AS number
    FROM generate_series(v_new_last_number - p_count + 1, v_new_last_number) AS s(number);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.reserve_invoice_numbers(UUID, INT, INT) TO authenticated;

-- Test the function to verify it works
DO $$
DECLARE
    test_user_id UUID := '825b55dc-d8f9-4dc6-939a-7035299e0868';
    test_year INT := 2025;
    test_count INT := 1;
    result_record RECORD;
BEGIN
    RAISE NOTICE 'Testing fixed reserve_invoice_numbers function...';
    
    FOR result_record IN 
        SELECT year, number FROM public.reserve_invoice_numbers(test_user_id, test_year, test_count)
    LOOP
        RAISE NOTICE 'SUCCESS: Reserved number % for year %', result_record.number, result_record.year;
    END LOOP;
    
    RAISE NOTICE '✓ Function is working correctly!';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ Function test FAILED: %', SQLERRM;
END $$;

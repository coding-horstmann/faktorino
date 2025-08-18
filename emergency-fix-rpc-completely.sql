-- EMERGENCY FIX: Completely recreate the RPC function with a new approach
-- This will solve the ambiguous column reference issue once and for all

-- Step 1: Drop ALL versions of the function
DROP FUNCTION IF EXISTS public.reserve_invoice_numbers(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.reserve_invoice_numbers(UUID, INTEGER, INTEGER);

-- Step 2: Create a completely new function with different column approach
CREATE OR REPLACE FUNCTION public.reserve_invoice_numbers(p_user_id UUID, p_year INT, p_count INT)
RETURNS TABLE(result_year INT, result_number INT) AS $$
DECLARE
    v_new_last_number INT;
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

    -- Log the operation
    RAISE NOTICE 'Reserving % invoice numbers for user % in year %', p_count, p_user_id, p_year;

    -- Insert or update the counter
    INSERT INTO public.invoice_counters (user_id, year, last_number)
    VALUES (p_user_id, p_year, p_count)
    ON CONFLICT (user_id, year)
    DO UPDATE SET 
        last_number = invoice_counters.last_number + p_count,
        updated_at = timezone('utc'::text, now())
    RETURNING last_number INTO v_new_last_number;

    -- Log the new last number
    RAISE NOTICE 'New last number: %', v_new_last_number;

    -- Return the series with completely different column names to avoid ambiguity
    RETURN QUERY
    SELECT 
        p_year::INT as result_year,
        s.series_num::INT as result_number
    FROM generate_series(v_new_last_number - p_count + 1, v_new_last_number) AS s(series_num);
    
    -- Log successful completion
    RAISE NOTICE 'Successfully reserved numbers % to %', v_new_last_number - p_count + 1, v_new_last_number;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.reserve_invoice_numbers(UUID, INT, INT) TO authenticated;

-- Immediate test
DO $$
DECLARE
    test_user_id UUID := '825b55dc-d8f9-4dc6-939a-7035299e0868';
    test_year INT := 2025;
    test_count INT := 2;
    result_record RECORD;
BEGIN
    RAISE NOTICE '=== EMERGENCY TEST OF FIXED RPC FUNCTION ===';
    
    FOR result_record IN 
        SELECT result_year, result_number FROM public.reserve_invoice_numbers(test_user_id, test_year, test_count)
    LOOP
        RAISE NOTICE 'SUCCESS: Reserved number % for year %', result_record.result_number, result_record.result_year;
    END LOOP;
    
    RAISE NOTICE '=== TEST COMPLETED ===';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'EMERGENCY TEST FAILED: %', SQLERRM;
END $$;

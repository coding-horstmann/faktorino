-- Test script to verify reserve_invoice_numbers RPC function
-- Run this in your Supabase SQL Editor to test the function

-- First, let's check if the function exists
SELECT proname, pronargs, proargtypes 
FROM pg_proc 
WHERE proname = 'reserve_invoice_numbers';

-- Check if the invoice_counters table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'invoice_counters'
);

-- Test the function with sample data
-- Replace 'your-user-id-here' with an actual user ID from your users table
DO $$
DECLARE
    test_user_id UUID := '825b55dc-d8f9-4dc6-939a-7035299e0868'; -- Replace with actual user ID
    test_year INT := 2025;
    test_count INT := 3;
    result_record RECORD;
BEGIN
    -- Test the RPC function
    RAISE NOTICE 'Testing reserve_invoice_numbers function...';
    RAISE NOTICE 'User ID: %, Year: %, Count: %', test_user_id, test_year, test_count;
    
    -- Call the function
    FOR result_record IN 
        SELECT year, number FROM public.reserve_invoice_numbers(test_user_id, test_year, test_count)
    LOOP
        RAISE NOTICE 'Reserved: Year %, Number %', result_record.year, result_record.number;
    END LOOP;
    
    -- Check the invoice_counters table after the call
    RAISE NOTICE 'Checking invoice_counters table...';
    FOR result_record IN 
        SELECT user_id, year, last_number FROM public.invoice_counters WHERE user_id = test_user_id AND year = test_year
    LOOP
        RAISE NOTICE 'Counter: User %, Year %, Last Number %', result_record.user_id, result_record.year, result_record.last_number;
    END LOOP;
END $$;

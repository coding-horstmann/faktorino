-- Simple test to verify the RPC function is working
-- Run this in Supabase SQL Editor

-- Test the function directly
SELECT result_year, result_number 
FROM public.reserve_invoice_numbers(
    '825b55dc-d8f9-4dc6-939a-7035299e0868'::UUID, 
    2025, 
    3
);

-- Check if the invoice_counters table was updated
SELECT user_id, year, last_number, created_at, updated_at 
FROM public.invoice_counters 
WHERE user_id = '825b55dc-d8f9-4dc6-939a-7035299e0868' 
AND year = 2025;

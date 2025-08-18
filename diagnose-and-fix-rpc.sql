-- Comprehensive diagnosis and fix script for RPC function issues
-- Run this in your Supabase SQL Editor to diagnose and fix the reserve_invoice_numbers problem

-- ===============================
-- STEP 1: DIAGNOSIS
-- ===============================

-- Check if invoice_counters table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_counters') THEN
        RAISE NOTICE '✓ invoice_counters table exists';
    ELSE
        RAISE NOTICE '✗ invoice_counters table MISSING!';
    END IF;
END $$;

-- Check if reserve_invoice_numbers function exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'reserve_invoice_numbers') THEN
        RAISE NOTICE '✓ reserve_invoice_numbers function exists';
    ELSE
        RAISE NOTICE '✗ reserve_invoice_numbers function MISSING!';
    END IF;
END $$;

-- Check function signature
SELECT 
    p.proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments,
    pg_catalog.pg_get_function_result(p.oid) as return_type,
    p.prosecdef as security_definer
FROM pg_proc p 
WHERE p.proname = 'reserve_invoice_numbers';

-- Check RLS policies for invoice_counters
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'invoice_counters';

-- ===============================
-- STEP 2: CREATE MISSING COMPONENTS
-- ===============================

-- Create invoice_counters table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.invoice_counters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    last_number INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, year)
);

-- Enable RLS
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own invoice counters" ON public.invoice_counters;
DROP POLICY IF EXISTS "Users can insert own invoice counters" ON public.invoice_counters;
DROP POLICY IF EXISTS "Users can update own invoice counters" ON public.invoice_counters;

-- Create RLS policies
CREATE POLICY "Users can view own invoice counters" ON public.invoice_counters
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoice counters" ON public.invoice_counters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoice counters" ON public.invoice_counters
    FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoice_counters_user_id ON public.invoice_counters(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_counters_year ON public.invoice_counters(year);
CREATE INDEX IF NOT EXISTS idx_invoice_counters_user_year ON public.invoice_counters(user_id, year);

-- Ensure update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_invoice_counters_updated_at ON public.invoice_counters;
CREATE TRIGGER update_invoice_counters_updated_at 
    BEFORE UPDATE ON public.invoice_counters 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- STEP 3: CREATE/RECREATE RPC FUNCTION
-- ===============================

-- Drop existing function to ensure clean recreation
DROP FUNCTION IF EXISTS public.reserve_invoice_numbers(UUID, INT, INT);

-- Create the RPC function with improved error handling
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

    -- Generate the series of numbers
    RETURN QUERY
    SELECT p_year, s.number
    FROM generate_series(v_new_last_number - p_count + 1, v_new_last_number) AS s(number);
    
    -- Log successful completion
    RAISE NOTICE 'Successfully reserved numbers % to %', v_new_last_number - p_count + 1, v_new_last_number;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.reserve_invoice_numbers(UUID, INT, INT) TO authenticated;

-- ===============================
-- STEP 4: TEST THE FUNCTION
-- ===============================

-- Test with sample data (replace user ID with actual one)
DO $$
DECLARE
    test_user_id UUID := '825b55dc-d8f9-4dc6-939a-7035299e0868'; -- Update this with actual user ID
    test_year INT := 2025;
    test_count INT := 3;
    result_record RECORD;
    test_successful BOOLEAN := TRUE;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'TESTING reserve_invoice_numbers FUNCTION';
    RAISE NOTICE '==========================================';
    
    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = test_user_id) THEN
        RAISE NOTICE 'WARNING: User % does not exist in users table', test_user_id;
        RAISE NOTICE 'Creating test user entry...';
        
        INSERT INTO public.users (id, email, name, address, city, tax_status)
        VALUES (test_user_id, 'test@example.com', 'Test User', 'Test Address', 'Test City', 'regular')
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    BEGIN
        -- Test the function
        RAISE NOTICE 'Testing function with parameters: user_id=%, year=%, count=%', test_user_id, test_year, test_count;
        
        FOR result_record IN 
            SELECT year, number FROM public.reserve_invoice_numbers(test_user_id, test_year, test_count)
        LOOP
            RAISE NOTICE 'SUCCESS: Reserved number % for year %', result_record.number, result_record.year;
        END LOOP;
        
        RAISE NOTICE '✓ Function test completed successfully!';
        
    EXCEPTION WHEN OTHERS THEN
        test_successful := FALSE;
        RAISE NOTICE '✗ Function test FAILED: %', SQLERRM;
        RAISE NOTICE 'Error details: %', SQLSTATE;
    END;
    
    -- Check final state
    FOR result_record IN 
        SELECT user_id, year, last_number, created_at, updated_at 
        FROM public.invoice_counters 
        WHERE user_id = test_user_id AND year = test_year
    LOOP
        RAISE NOTICE 'Counter state: User %, Year %, Last Number %, Updated %', 
            result_record.user_id, result_record.year, result_record.last_number, result_record.updated_at;
    END LOOP;
    
    IF test_successful THEN
        RAISE NOTICE '==========================================';
        RAISE NOTICE '✓ ALL TESTS PASSED - RPC FUNCTION IS WORKING';
        RAISE NOTICE '==========================================';
    ELSE
        RAISE NOTICE '==========================================';
        RAISE NOTICE '✗ TESTS FAILED - CHECK ERROR MESSAGES ABOVE';
        RAISE NOTICE '==========================================';
    END IF;
END $$;

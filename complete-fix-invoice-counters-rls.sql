-- COMPLETE FIX: Clean up duplicate policies and fix INSERT permissions
-- This will completely reset the RLS policies for invoice_counters

-- Drop ALL existing policies to clean up duplicates
DROP POLICY IF EXISTS "Users can insert own counters" ON public.invoice_counters;
DROP POLICY IF EXISTS "Users can insert own invoice counters" ON public.invoice_counters;
DROP POLICY IF EXISTS "Users can view own counters" ON public.invoice_counters;
DROP POLICY IF EXISTS "Users can view own invoice counters" ON public.invoice_counters;
DROP POLICY IF EXISTS "Users can update own counters" ON public.invoice_counters;
DROP POLICY IF EXISTS "Users can update own invoice counters" ON public.invoice_counters;

-- Create clean, correct policies
CREATE POLICY "Users can view own invoice counters" ON public.invoice_counters
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoice counters" ON public.invoice_counters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoice counters" ON public.invoice_counters
    FOR UPDATE USING (auth.uid() = user_id);

-- Verify the policies are now correct
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'invoice_counters'
ORDER BY cmd, policyname;

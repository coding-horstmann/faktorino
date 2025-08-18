-- FIX: Repair the broken INSERT policy for invoice_counters table
-- The INSERT policy is missing the WITH CHECK clause

-- Drop the broken INSERT policy
DROP POLICY IF EXISTS "Users can insert own counters" ON public.invoice_counters;

-- Create the correct INSERT policy with proper WITH CHECK clause
CREATE POLICY "Users can insert own counters" ON public.invoice_counters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

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

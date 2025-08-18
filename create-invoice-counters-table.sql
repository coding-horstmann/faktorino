-- Create invoice_counters table for tracking invoice numbers per user and year
-- This table is required for the reserve_invoice_numbers RPC function
-- Run this in your Supabase SQL Editor

-- Create invoice_counters table
CREATE TABLE IF NOT EXISTS public.invoice_counters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    last_number INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, year)
);

-- Enable RLS on invoice_counters table
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

-- Create policies for invoice_counters table
CREATE POLICY "Users can view own invoice counters" ON public.invoice_counters
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoice counters" ON public.invoice_counters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoice counters" ON public.invoice_counters
    FOR UPDATE USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_invoice_counters_user_id ON public.invoice_counters(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_counters_year ON public.invoice_counters(year);
CREATE INDEX IF NOT EXISTS idx_invoice_counters_user_year ON public.invoice_counters(user_id, year);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_counters_updated_at 
    BEFORE UPDATE ON public.invoice_counters 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

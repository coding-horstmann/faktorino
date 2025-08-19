-- Complete Supabase Database Setup for EtsyBuchhalter
-- Run this script in your Supabase SQL Editor

-- Enable Row Level Security (RLS) for all tables
-- This script should be run in your Supabase SQL editor

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    tax_number TEXT,
    vat_id TEXT,
    tax_status TEXT NOT NULL DEFAULT 'regular' CHECK (tax_status IN ('regular', 'small_business')),
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT NOT NULL,
    order_date TEXT NOT NULL,
    service_date TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_address TEXT NOT NULL,
    country TEXT NOT NULL,
    country_classification TEXT NOT NULL CHECK (country_classification IN ('Deutschland', 'EU-Ausland', 'Drittland')),
    net_total DECIMAL(10,2) NOT NULL,
    vat_total DECIMAL(10,2) NOT NULL,
    gross_total DECIMAL(10,2) NOT NULL,
    tax_note TEXT NOT NULL,
    items JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, invoice_number)
);

-- Enable RLS on both tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for invoices table
CREATE POLICY "Users can view own invoices" ON public.invoices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" ON public.invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON public.invoices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" ON public.invoices
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON public.invoices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, address, city, tax_status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'address', ''),
        COALESCE(NEW.raw_user_meta_data->>'city', ''),
        COALESCE(NEW.raw_user_meta_data->>'tax_status', 'regular')
    );
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create user_monthly_usage table for tracking monthly invoice limits
CREATE TABLE IF NOT EXISTS public.user_monthly_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    month_year TEXT NOT NULL, -- Format: YYYY-MM
    invoice_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, month_year)
);

-- Enable RLS on user_monthly_usage table
ALTER TABLE public.user_monthly_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for user_monthly_usage table
CREATE POLICY "Users can view own usage" ON public.user_monthly_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON public.user_monthly_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON public.user_monthly_usage
    FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for user_monthly_usage
CREATE INDEX IF NOT EXISTS idx_user_monthly_usage_user_id ON public.user_monthly_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_monthly_usage_month_year ON public.user_monthly_usage(month_year);

-- Create trigger for user_monthly_usage
CREATE TRIGGER update_user_monthly_usage_updated_at 
    BEFORE UPDATE ON public.user_monthly_usage 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to increment monthly usage
CREATE OR REPLACE FUNCTION increment_monthly_usage(p_user_id UUID, p_count INTEGER DEFAULT 1)
RETURNS void AS $$
BEGIN
    INSERT INTO public.user_monthly_usage (user_id, month_year, invoice_count)
    VALUES (p_user_id, to_char(current_date, 'YYYY-MM'), p_count)
    ON CONFLICT (user_id, month_year)
    DO UPDATE SET 
        invoice_count = user_monthly_usage.invoice_count + p_count,
        updated_at = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the increment function
GRANT EXECUTE ON FUNCTION public.increment_monthly_usage(UUID, INTEGER) TO authenticated;

-- Create invoice_counters table for tracking invoice numbers per user and year
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

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own invoice counters" ON public.invoice_counters;
DROP POLICY IF EXISTS "Users can insert own invoice counters" ON public.invoice_counters;
DROP POLICY IF EXISTS "Users can update own invoice counters" ON public.invoice_counters;
DROP POLICY IF EXISTS "Users can view own counters" ON public.invoice_counters;
DROP POLICY IF EXISTS "Users can insert own counters" ON public.invoice_counters;
DROP POLICY IF EXISTS "Users can update own counters" ON public.invoice_counters;

-- Create correct policies for invoice_counters table
CREATE POLICY "Users can view own invoice counters" ON public.invoice_counters
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoice counters" ON public.invoice_counters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoice counters" ON public.invoice_counters
    FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for invoice_counters
CREATE INDEX IF NOT EXISTS idx_invoice_counters_user_id ON public.invoice_counters(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_counters_year ON public.invoice_counters(year);
CREATE INDEX IF NOT EXISTS idx_invoice_counters_user_year ON public.invoice_counters(user_id, year);

-- Create trigger for invoice_counters
CREATE TRIGGER update_invoice_counters_updated_at 
    BEFORE UPDATE ON public.invoice_counters 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create RPC function to reserve invoice numbers
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

    -- Generate the series of numbers with explicit column aliases
    RETURN QUERY
    SELECT p_year AS year, s.number AS number
    FROM generate_series(v_new_last_number - p_count + 1, v_new_last_number) AS s(number);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- Grant permissions for the reserve function
GRANT EXECUTE ON FUNCTION public.reserve_invoice_numbers(UUID, INT, INT) TO authenticated;



-- Setup complete! Your database is now ready for the EtsyBuchhalter application.

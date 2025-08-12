-- Create user_monthly_usage table for tracking monthly invoice limits
-- Run this in your Supabase SQL Editor

-- Create user_monthly_usage table
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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_monthly_usage_user_id ON public.user_monthly_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_monthly_usage_month_year ON public.user_monthly_usage(month_year);

-- Create trigger to automatically update updated_at
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

-- Fix RLS Policies for users table
-- Run this in your Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Create new policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Fix RLS Policies for user_monthly_usage table
DROP POLICY IF EXISTS "Users can view own usage" ON public.user_monthly_usage;
DROP POLICY IF EXISTS "Users can insert own usage" ON public.user_monthly_usage;
DROP POLICY IF EXISTS "Users can update own usage" ON public.user_monthly_usage;

CREATE POLICY "Users can view own usage" ON public.user_monthly_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON public.user_monthly_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON public.user_monthly_usage
    FOR UPDATE USING (auth.uid() = user_id);

-- Create missing user profile for existing user
INSERT INTO public.users (id, email, name, address, city, tax_status, created_at, updated_at)
VALUES (
    '4e504e67-8788-4f31-8e4e-b56da3e9498a',
    'horstmann.business@gmail.com',
    'Horstmann Business',
    'Test Address',
    'Test City',
    'regular',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    updated_at = NOW();

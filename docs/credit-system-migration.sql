-- Credit System Migration für EtsyBuchhalter
-- Dieses Skript implementiert das neue Credit-basierte System
-- Führe dieses Skript in deinem Supabase SQL Editor aus

-- 1. Tabelle für Benutzer-Credits
CREATE TABLE IF NOT EXISTS public.user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    credits INTEGER DEFAULT 30 NOT NULL, -- Standard: 30 kostenlose Credits
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabelle für Credit-Pakete
CREATE TABLE IF NOT EXISTS public.credit_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price_euros DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabelle für Credit-Transaktionen (Käufe und Verbrauch)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'bonus')),
    credits_change INTEGER NOT NULL, -- Positiv für Hinzufügung, negativ für Verbrauch
    credits_balance_after INTEGER NOT NULL, -- Credits nach dieser Transaktion
    description TEXT,
    purchase_id UUID REFERENCES public.credit_purchases(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabelle für Credit-Käufe (PayPal-Integration)
CREATE TABLE IF NOT EXISTS public.credit_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    package_id UUID REFERENCES public.credit_packages(id) ON DELETE SET NULL,
    credits_purchased INTEGER NOT NULL,
    price_paid DECIMAL(10,2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    paypal_transaction_id TEXT UNIQUE,
    paypal_payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS auf allen neuen Tabellen
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies für user_credits
CREATE POLICY "Users can view own credits" ON public.user_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON public.user_credits
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits" ON public.user_credits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies für credit_packages (alle können lesen, nur Admin kann schreiben)
CREATE POLICY "Anyone can view active credit packages" ON public.credit_packages
    FOR SELECT USING (is_active = true);

-- RLS Policies für credit_transactions
CREATE POLICY "Users can view own credit transactions" ON public.credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit transactions" ON public.credit_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies für credit_purchases
CREATE POLICY "Users can view own credit purchases" ON public.credit_purchases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit purchases" ON public.credit_purchases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit purchases" ON public.credit_purchases
    FOR UPDATE USING (auth.uid() = user_id);

-- Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON public.credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON public.credit_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_paypal_id ON public.credit_purchases(paypal_transaction_id);

-- Trigger für automatische updated_at Updates
CREATE TRIGGER update_user_credits_updated_at 
    BEFORE UPDATE ON public.user_credits 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_packages_updated_at 
    BEFORE UPDATE ON public.credit_packages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_purchases_updated_at 
    BEFORE UPDATE ON public.credit_purchases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Funktion: Neue Benutzer erhalten 30 kostenlose Credits
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (NEW.id, 30);
    
    -- Erstelle eine Transaktion für die kostenlosen Start-Credits
    INSERT INTO public.credit_transactions (user_id, transaction_type, credits_change, credits_balance_after, description)
    VALUES (NEW.id, 'bonus', 30, 30, 'Kostenlose Start-Credits');
    
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Trigger: Neue Benutzer erhalten automatisch Credits
CREATE TRIGGER on_user_created_initialize_credits
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.initialize_user_credits();

-- Funktion: Credits verwenden (mit Transaktionslog)
CREATE OR REPLACE FUNCTION public.use_credits(p_user_id UUID, p_credits_to_use INTEGER, p_description TEXT DEFAULT NULL, p_invoice_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Validierung
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID darf nicht NULL sein';
    END IF;
    
    IF p_credits_to_use IS NULL OR p_credits_to_use <= 0 THEN
        RAISE EXCEPTION 'Credits müssen positiv sein: %', p_credits_to_use;
    END IF;

    -- Aktuelle Credits abrufen
    SELECT credits INTO v_current_credits
    FROM public.user_credits
    WHERE user_id = p_user_id;

    -- Prüfen ob Benutzer existiert
    IF v_current_credits IS NULL THEN
        RAISE EXCEPTION 'Benutzer nicht gefunden oder keine Credits initialisiert';
    END IF;

    -- Prüfen ob genügend Credits vorhanden sind
    IF v_current_credits < p_credits_to_use THEN
        RETURN FALSE; -- Nicht genügend Credits
    END IF;

    -- Credits abziehen
    v_new_balance := v_current_credits - p_credits_to_use;
    
    UPDATE public.user_credits
    SET credits = v_new_balance,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = p_user_id;

    -- Transaktion protokollieren
    INSERT INTO public.credit_transactions (user_id, transaction_type, credits_change, credits_balance_after, description, invoice_id)
    VALUES (p_user_id, 'usage', -p_credits_to_use, v_new_balance, COALESCE(p_description, 'Rechnung erstellt'), p_invoice_id);

    RETURN TRUE; -- Erfolgreich
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion: Credits hinzufügen (für Käufe)
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id UUID, p_credits_to_add INTEGER, p_description TEXT DEFAULT NULL, p_purchase_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Validierung
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID darf nicht NULL sein';
    END IF;
    
    IF p_credits_to_add IS NULL OR p_credits_to_add <= 0 THEN
        RAISE EXCEPTION 'Credits müssen positiv sein: %', p_credits_to_add;
    END IF;

    -- Aktuelle Credits abrufen
    SELECT credits INTO v_current_credits
    FROM public.user_credits
    WHERE user_id = p_user_id;

    -- Prüfen ob Benutzer existiert
    IF v_current_credits IS NULL THEN
        RAISE EXCEPTION 'Benutzer nicht gefunden oder keine Credits initialisiert';
    END IF;

    -- Credits hinzufügen
    v_new_balance := v_current_credits + p_credits_to_add;
    
    UPDATE public.user_credits
    SET credits = v_new_balance,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = p_user_id;

    -- Transaktion protokollieren
    INSERT INTO public.credit_transactions (user_id, transaction_type, credits_change, credits_balance_after, description, purchase_id)
    VALUES (p_user_id, 'purchase', p_credits_to_add, v_new_balance, COALESCE(p_description, 'Credits gekauft'), p_purchase_id);

    RETURN TRUE; -- Erfolgreich
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Berechtigungen für die neuen Funktionen
GRANT EXECUTE ON FUNCTION public.use_credits(UUID, INTEGER, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(UUID, INTEGER, TEXT, UUID) TO authenticated;

-- Standard Credit-Pakete einfügen
INSERT INTO public.credit_packages (name, credits, price_euros, description) VALUES
('Starter Paket', 500, 7.99, '500 Rechnungen für 7,99 €'),
('Professional Paket', 1000, 9.99, '1000 Rechnungen für 9,99 €'),
('Business Paket', 3000, 19.99, '3000 Rechnungen für 19,99 €');

-- Migration: Bestehende Benutzer erhalten 30 kostenlose Credits
-- WICHTIG: Führe diesen Teil nur einmal aus!
INSERT INTO public.user_credits (user_id, credits)
SELECT id, 30 
FROM public.users 
WHERE id NOT IN (SELECT user_id FROM public.user_credits)
ON CONFLICT (user_id) DO NOTHING;

-- Füge Transaktionen für alle bestehenden Benutzer mit neuen Credits hinzu
INSERT INTO public.credit_transactions (user_id, transaction_type, credits_change, credits_balance_after, description)
SELECT id, 'bonus', 30, 30, 'Migration: Kostenlose Start-Credits'
FROM public.users 
WHERE id NOT IN (
    SELECT user_id 
    FROM public.credit_transactions 
    WHERE transaction_type = 'bonus' AND description = 'Migration: Kostenlose Start-Credits'
);

-- Setup abgeschlossen!
-- Das neue Credit-System ist jetzt einsatzbereit.

-- Dieses Skript richtet eine atomare Rechnungsnummern-Generierung in Ihrer Supabase-DB ein.
-- Führen Sie es im Supabase SQL Editor aus.

-- 1. Erstellt eine Tabelle zur Speicherung der letzten Rechnungsnummer pro Benutzer und Jahr.
CREATE TABLE IF NOT EXISTS public.invoice_counters (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    year INT NOT NULL,
    last_number INT NOT NULL DEFAULT 0,
    CONSTRAINT unique_user_year UNIQUE (user_id, year)
);

-- 2. Aktiviert Row Level Security (RLS) für die neue Tabelle.
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

-- 3. Richtet eine Policy ein, damit Benutzer nur ihre eigenen Zähler verwalten können.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'users_manage_own_invoice_counters') THEN
        CREATE POLICY "users_manage_own_invoice_counters"
        ON public.invoice_counters
        FOR ALL
        USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 4. Erstellt eine Datenbank-Funktion, die die nächste Rechnungsnummer sicher zurückgibt.
CREATE OR REPLACE FUNCTION public.generate_next_invoice_number(p_user_id UUID, p_order_date DATE)
RETURNS TEXT AS $$
DECLARE
    v_year INT;
    v_next_number INT;
BEGIN
    v_year := EXTRACT(YEAR FROM p_order_date);

    INSERT INTO public.invoice_counters (user_id, year, last_number)
    VALUES (p_user_id, v_year, 1)
    ON CONFLICT (user_id, year)
    DO UPDATE SET last_number = invoice_counters.last_number + 1
    RETURNING last_number INTO v_next_number;

    RETURN 'RE-' || v_year::TEXT || '-' || LPAD(v_next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 5. Erstellt eine Trigger-Funktion, die vor dem Einfügen einer neuen Rechnung aufgerufen wird.
CREATE OR REPLACE FUNCTION public.set_invoice_number_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Weist nur dann eine neue Nummer zu, wenn noch keine vorhanden ist.
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := public.generate_next_invoice_number(NEW.user_id, NEW.order_date::date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Richtet den Trigger für die 'invoices'-Tabelle ein.
DROP TRIGGER IF EXISTS trg_set_invoice_number ON public.invoices;
CREATE TRIGGER trg_set_invoice_number
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.set_invoice_number_trigger();

-- WICHTIGER HINWEIS:
-- Damit der Trigger funktioniert, darf die Spalte 'invoice_number' in der Tabelle 'invoices'
-- NICHT als 'NOT NULL' (nicht null) definiert sein.
-- Führen Sie bei Bedarf den folgenden Befehl aus, um die Spalte anzupassen:
-- ALTER TABLE public.invoices ALTER COLUMN invoice_number DROP NOT NULL;

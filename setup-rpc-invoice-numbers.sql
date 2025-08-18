-- Dieses Skript ersetzt die vorherige Trigger-basierte Lösung.
-- Es richtet eine RPC-Funktion ein, um Rechnungsnummern atomar zu reservieren.
-- Bitte führen Sie dies in Ihrem Supabase SQL Editor aus.

-- 1. Bereinigung: Entfernt die alte Trigger-Funktion und den Trigger, falls vorhanden.
DROP TRIGGER IF EXISTS trg_set_invoice_number ON public.invoices;
DROP FUNCTION IF EXISTS public.set_invoice_number_trigger();
DROP FUNCTION IF EXISTS public.generate_next_invoice_number(UUID, DATE);

-- Stellt sicher, dass die 'invoice_number'-Spalte wieder 'NOT NULL' ist, falls es geändert wurde.
ALTER TABLE public.invoices ALTER COLUMN invoice_number SET NOT NULL;

-- 2. (Optional) Behält die 'invoice_counters'-Tabelle, da sie für die neue Logik wiederverwendet wird.
-- Falls Sie sie löschen möchten, um von vorne zu beginnen: DROP TABLE IF EXISTS public.invoice_counters;
-- Es wird empfohlen, sie zu behalten, damit die Zählung fortgesetzt wird.

-- 3. Erstellt die neue RPC-Funktion, um einen Block von Rechnungsnummern zu reservieren.
CREATE OR REPLACE FUNCTION public.reserve_invoice_numbers(p_user_id UUID, p_year INT, p_count INT)
RETURNS TABLE(year INT, number INT) AS $$
DECLARE
    v_new_last_number INT;
    v_current_number INT;
BEGIN
    -- Sperrt die Zeile für den Benutzer und das Jahr, um Race Conditions zu verhindern.
    -- Fügt eine neue Zeile ein oder aktualisiert die bestehende.
    INSERT INTO public.invoice_counters (user_id, year, last_number)
    VALUES (p_user_id, p_year, p_count)
    ON CONFLICT (user_id, year)
    DO UPDATE SET last_number = invoice_counters.last_number + p_count
    RETURNING last_number INTO v_new_last_number;

    -- Generiert eine Serie von Nummern von der vorherigen letzten Nummer+1 bis zur neuen letzten Nummer.
    RETURN QUERY
    SELECT p_year, s.number
    FROM generate_series(v_new_last_number - p_count + 1, v_new_last_number) AS s(number);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- 4. Berechtigungen für die neue Funktion erteilen.
GRANT EXECUTE ON FUNCTION public.reserve_invoice_numbers(UUID, INT, INT) TO authenticated;

-- Hinweis: Die 'invoice_counters' Tabelle und ihre RLS-Policies von der vorherigen Migration
-- werden weiterhin verwendet und sind für diese Funktion erforderlich.

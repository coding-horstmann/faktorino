-- Erweitere credit_purchases Tabelle um Rechnungsdaten
-- Diese Spalten speichern die Rechnungsdaten aus dem Credit-Kauf-Formular

ALTER TABLE public.credit_purchases 
ADD COLUMN IF NOT EXISTS billing_first_name TEXT,
ADD COLUMN IF NOT EXISTS billing_last_name TEXT,
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS billing_street TEXT,
ADD COLUMN IF NOT EXISTS billing_postal_code TEXT,
ADD COLUMN IF NOT EXISTS billing_city TEXT,
ADD COLUMN IF NOT EXISTS billing_vat_id TEXT;

-- Kommentare für bessere Dokumentation
COMMENT ON COLUMN public.credit_purchases.billing_first_name IS 'Vorname aus dem Credit-Kauf-Formular';
COMMENT ON COLUMN public.credit_purchases.billing_last_name IS 'Nachname aus dem Credit-Kauf-Formular';
COMMENT ON COLUMN public.credit_purchases.billing_email IS 'E-Mail aus dem Credit-Kauf-Formular';
COMMENT ON COLUMN public.credit_purchases.billing_street IS 'Straße und Hausnummer aus dem Credit-Kauf-Formular';
COMMENT ON COLUMN public.credit_purchases.billing_postal_code IS 'PLZ aus dem Credit-Kauf-Formular';
COMMENT ON COLUMN public.credit_purchases.billing_city IS 'Stadt aus dem Credit-Kauf-Formular';
COMMENT ON COLUMN public.credit_purchases.billing_vat_id IS 'USt-IdNr. aus dem Credit-Kauf-Formular (optional)';

-- Index für bessere Performance bei Abfragen
CREATE INDEX IF NOT EXISTS idx_credit_purchases_billing_email ON public.credit_purchases(billing_email);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_billing_name ON public.credit_purchases(billing_first_name, billing_last_name);

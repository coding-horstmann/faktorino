Stripe Abo-Integration (14 Tage Test, 4,99 €/Monat)

Voraussetzungen
- Stripe-Konto vorhanden
- In Stripe ein Produkt + Preis anlegen (monatlich 4,99 €)
- Webhook-Endpunkt in Stripe hinzufügen

Benötigte Umgebungsvariablen (.env.local)
- NEXT_PUBLIC_SUPABASE_URL=
- NEXT_PUBLIC_SUPABASE_ANON_KEY=
- SUPABASE_SERVICE_ROLE_KEY= (für Webhook-Updates)
- STRIPE_SECRET_KEY=
- STRIPE_PRICE_ID=
- STRIPE_WEBHOOK_SECRET=

Setup-Schritte
1) Supabase SQL ausführen: docs/stripe-setup.sql
2) .env.local mit obigen Variablen befüllen
3) In Stripe Webhook auf https://<domain>/api/stripe/webhook konfigurieren und STRIPE_WEBHOOK_SECRET setzen
4) Deployment/Local: Next.js starten (npm run dev)

Ablauf
- Neue Nutzer erhalten automatisch 14 Tage Trial (Supabase-Feld trial_end)
- Checkout unter /api/stripe/checkout erstellt Stripe-Session (Trial wird ggf. übernommen)
- Stripe Webhook aktualisiert Abo-Status (subscription_status, current_period_end, etc.)
- Middleware blockt nach Trial-Ende ohne aktives Abo die App und leitet zu /account-settings

UI
- Konto-Einstellungen Seite: Buttons "Jetzt abonnieren" und "Abo verwalten" (Stripe Customer Portal)
- Dashboard: Banner, wenn kein aktives Abo

Hinweis
- Für Tests können Sie Stripe Test Keys nutzen



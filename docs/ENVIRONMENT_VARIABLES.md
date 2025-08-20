# Umgebungsvariablen Konfiguration

## Übersicht
Diese Datei listet alle erforderlichen Umgebungsvariablen für das Projekt auf.

## Brevo E-Mail Service (NEU)

```env
# Brevo API-Schlüssel (erforderlich für E-Mail-Versendung)
BREVO_API_KEY=your_brevo_api_key_here

# Verifizierte Sender-E-Mail-Adresse
BREVO_SENDER_EMAIL=noreply@faktorino.de

# Name des Absenders
BREVO_SENDER_NAME=Faktorino
```

## Bestehende Variablen

### Supabase
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### PayPal
```env
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
NEXT_PUBLIC_PAYPAL_ENVIRONMENT=sandbox # oder "live" für Produktion
```

### App Konfiguration
```env
# Basis-URL der Anwendung (für E-Mail-Links)
NEXT_PUBLIC_APP_URL=https://yourdomain.vercel.app
```

## Deployment Checkliste

### Lokale Entwicklung (.env.local)
- [ ] Alle Brevo-Variablen gesetzt
- [ ] NEXT_PUBLIC_APP_URL auf localhost:9002
- [ ] PayPal auf "sandbox" gesetzt

### Vercel Produktion
- [ ] Brevo-Variablen in Vercel Environment Variables
- [ ] NEXT_PUBLIC_APP_URL auf Produktions-Domain
- [ ] PayPal auf "live" oder "sandbox" je nach Umgebung
- [ ] Nach Variablen-Update: Redeploy durchführen

## E-Mail Testen

### Test-API verwenden
```bash
# Lokal
curl -X POST http://localhost:9002/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Produktion
curl -X POST https://yourdomain.vercel.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

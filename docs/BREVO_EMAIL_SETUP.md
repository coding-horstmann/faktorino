# Brevo E-Mail Integration - Setup Anleitung

## Übersicht
Dieses Dokument beschreibt die Einrichtung der automatischen E-Mail-Versendung nach erfolgreichen PayPal Credit-Käufen über Brevo (ehemals Sendinblue).

## 1. Brevo Account einrichten

### Schritt 1: Brevo Account erstellen
1. Gehe zu [https://brevo.com](https://brevo.com)
2. Erstelle einen kostenlosen Account
3. Verifiziere deine E-Mail-Adresse

### Schritt 2: API-Schlüssel generieren
1. Gehe zu **Settings > API Keys**
2. Klicke auf **Create a new API key**
3. Benenne den Schlüssel (z.B. "Faktorino Production")
4. Kopiere den generierten API-Schlüssel

### Schritt 3: Sender-Domain verifizieren
1. Gehe zu **Settings > Senders & IP**
2. Füge deine Domain hinzu (z.B. faktorino.de)
3. Folge den DNS-Verifikationsschritten
4. Erstelle eine verifizierte Sender-E-Mail-Adresse

## 2. Umgebungsvariablen konfigurieren

Füge folgende Variablen zu deiner `.env.local` (lokal) und Vercel Environment Variables hinzu:

```env
# Brevo E-Mail Service
BREVO_API_KEY=dein_brevo_api_schlüssel_hier
BREVO_SENDER_EMAIL=noreply@faktorino.de
BREVO_SENDER_NAME=Faktorino

# App URL für E-Mail-Links
NEXT_PUBLIC_APP_URL=https://deine-domain.vercel.app
```

## 3. Vercel Deployment konfigurieren

### In Vercel Dashboard:
1. Gehe zu deinem Projekt
2. **Settings > Environment Variables**
3. Füge die Brevo-Variablen hinzu:
   - `BREVO_API_KEY` → dein API-Schlüssel
   - `BREVO_SENDER_EMAIL` → deine verifizierte Sender-E-Mail
   - `BREVO_SENDER_NAME` → "Faktorino" oder gewünschter Name
   - `NEXT_PUBLIC_APP_URL` → deine Produktions-URL

### Redeploy
Nach dem Hinzufügen der Umgebungsvariablen:
1. Gehe zu **Deployments**
2. Klicke auf das neueste Deployment
3. **Redeploy** klicken

## 4. E-Mail Template Anpassung

Die E-Mail-Templates sind in `src/lib/email-service.ts` definiert. Du kannst sie anpassen:

### HTML-Template anpassen
- Farben und Styling in der CSS-Sektion
- Logos und Branding hinzufügen
- Texte anpassen

### Neue E-Mail-Typen hinzufügen
```typescript
// Neue Methode in EmailService hinzufügen
static async sendWelcomeEmail(params: WelcomeEmailParams) {
  // Implementation hier
}
```

## 5. Testen der Integration

### Lokales Testen
```bash
# Test-E-Mail senden
curl -X POST http://localhost:9002/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "deine-email@example.com"}'
```

### Produktions-Test
```bash
# Test-E-Mail senden
curl -X POST https://deine-domain.vercel.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "deine-email@example.com"}'
```

### PayPal-Integration testen
1. Führe einen echten Credit-Kauf durch
2. Prüfe die Vercel-Logs auf E-Mail-Versendung
3. Überprüfe den E-Mail-Eingang

## 6. Monitoring und Logs

### Brevo Dashboard
- **Statistics > Email** für Versendungsstatistiken
- **Logs > Events** für detaillierte E-Mail-Logs

### Vercel Logs
```bash
# Live-Logs anzeigen
vercel logs --follow

# Spezifische Funktion filtern
vercel logs --follow | grep "email"
```

### Wichtige Log-Nachrichten
- `"Sending credit confirmation email to:"` - E-Mail wird gesendet
- `"Email sent successfully:"` - Erfolgreiche Versendung
- `"Fehler beim Senden der E-Mail:"` - Versendungsfehler

## 7. Troubleshooting

### Problem: E-Mails kommen nicht an
1. **Prüfe Spam-Ordner**
2. **Brevo Logs checken** (Dashboard > Logs)
3. **API-Schlüssel validieren**
4. **Sender-Domain-Verifikation** überprüfen

### Problem: API-Fehler
```
Error: {"code":"unauthorized","message":"Key is invalid"}
```
- API-Schlüssel überprüfen
- Umgebungsvariablen neu deployen

### Problem: Template-Fehler
```
Error: Template parsing failed
```
- HTML-Syntax in `email-service.ts` überprüfen
- Variablen-Interpolation kontrollieren

## 8. Erweiterte Konfiguration

### A/B Testing
- Verschiedene Betreffzeilen testen
- Template-Varianten erstellen
- Conversion-Raten vergleichen

### Personalisierung
- Benutzerdaten aus Supabase nutzen
- Dynamische Inhalte basierend auf Kaufhistorie
- Lokalisierung für verschiedene Sprachen

### Automatisierung
- Welcome-E-Mails für neue Benutzer
- Erinnerungs-E-Mails für niedrige Credits
- Newsletter-Integration

## 9. Kosten und Limits

### Brevo Free Plan
- 300 E-Mails/Tag
- Für kleine bis mittlere Anwendungen ausreichend

### Paid Plans
- Ab €25/Monat für 20.000 E-Mails
- Erweiterte Features und Prioritätssupport

## 10. Sicherheit

### Best Practices
- API-Schlüssel niemals im Code committen
- Separate Schlüssel für Entwicklung/Produktion
- Regelmäßige Rotation der API-Schlüssel
- E-Mail-Validierung vor Versendung

### Datenschutz
- DSGVO-konforme E-Mail-Verwaltung
- Opt-out-Mechanismen implementieren
- Datenminimierung beachten

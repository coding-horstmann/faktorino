# E-Mail-Setup für Bestellbestätigungen

## Übersicht

Das System unterstützt mehrere kostenlose E-Mail-Services für automatische Bestellbestätigungen:

1. **Resend.com** (Empfohlen) - 100 E-Mails/Monat kostenlos
2. **EmailJS** - 200 E-Mails/Monat kostenlos
3. **Fallback** - E-Mails werden in der Konsole geloggt für manuelle Versendung

## Option 1: Resend.com (Empfohlen)

### 1. Account erstellen
- Gehen Sie zu [resend.com](https://resend.com)
- Erstellen Sie ein kostenloses Konto
- Verifizieren Sie Ihre E-Mail-Adresse

### 2. API Key generieren
- Gehen Sie zu "API Keys" im Dashboard
- Klicken Sie auf "Create API Key"
- Kopieren Sie den API Key

### 3. Domain verifizieren (Optional)
- Für professionelle E-Mails verifizieren Sie Ihre Domain
- Oder verwenden Sie die Standard-Domain von Resend

### 4. Environment Variable setzen
Fügen Sie in Ihrer `.env.local` Datei hinzu:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Option 2: EmailJS

### 1. Account erstellen
- Gehen Sie zu [emailjs.com](https://emailjs.com)
- Erstellen Sie ein kostenloses Konto

### 2. E-Mail-Service einrichten
- Gehen Sie zu "Email Services"
- Fügen Sie Ihren E-Mail-Provider hinzu (Gmail, Outlook, etc.)
- Notieren Sie sich die Service ID

### 3. E-Mail-Template erstellen
- Gehen Sie zu "Email Templates"
- Erstellen Sie ein neues Template
- Verwenden Sie diese Variablen:
  - `{{to_email}}` - Empfänger E-Mail
  - `{{subject}}` - E-Mail Betreff
  - `{{message}}` - HTML Nachricht
  - `{{from_name}}` - Absender Name

### 4. Environment Variables setzen
Fügen Sie in Ihrer `.env.local` Datei hinzu:
```env
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
```

## Option 3: Fallback (Kein Setup erforderlich)

Falls keine E-Mail-Service konfiguriert ist, werden E-Mails in der Konsole geloggt:

```
=== ORDER CONFIRMATION EMAIL ===
To: customer@example.com
Subject: Bestellbestätigung - 1000 Credits
HTML: <!DOCTYPE html>...
===============================
```

Sie können diese E-Mails manuell kopieren und versenden.

## Testing

### 1. Test-Bestellung erstellen
- Öffnen Sie das PayPal Modal
- Füllen Sie alle Felder aus
- Klicken Sie auf "Jetzt mit PayPal bezahlen"

### 2. E-Mail-Versand überprüfen
- Schauen Sie in die Browser-Konsole für Logs
- Prüfen Sie den E-Mail-Eingang der angegebenen Adresse
- Bei Fehlern werden diese in der Konsole angezeigt

## Troubleshooting

### E-Mail wird nicht versendet
1. Prüfen Sie die Environment Variables
2. Schauen Sie in die Browser-Konsole für Fehlermeldungen
3. Testen Sie den API Key mit einem einfachen Request

### Resend.com Fehler
- API Key korrekt gesetzt?
- Domain verifiziert (falls verwendet)?
- E-Mail-Limit erreicht?

### EmailJS Fehler
- Service ID korrekt?
- Template ID korrekt?
- E-Mail-Service funktioniert?

## Kosten

- **Resend.com**: 100 E-Mails/Monat kostenlos, dann $0.80/1000 E-Mails
- **EmailJS**: 200 E-Mails/Monat kostenlos, dann $15/Monat für 1000 E-Mails
- **Fallback**: Kostenlos (manuelle Versendung)

## Empfehlung

Für den Start empfehlen wir **Resend.com**:
- Einfaches Setup
- Gute Dokumentation
- Zuverlässiger Service
- Günstige Preise nach dem kostenlosen Limit

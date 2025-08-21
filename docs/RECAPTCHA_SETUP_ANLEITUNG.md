# Google reCAPTCHA v3 Setup-Anleitung

## Übersicht
Diese Anleitung erklärt, wie Sie Google reCAPTCHA v3 für Ihre Next.js-Anwendung einrichten.

## 1. Google reCAPTCHA Admin-Konsole

### Neue reCAPTCHA-Website registrieren

1. Besuchen Sie: https://www.google.com/recaptcha/admin/create
2. Melden Sie sich mit Ihrem Google-Konto an
3. Füllen Sie das Formular aus:

#### Grundkonfiguration:
- **Label**: `EtsyBuchhalter` (oder Ihr gewünschter Name)
- **reCAPTCHA-Typ**: `reCAPTCHA v3`
- **Domains**: 
  - Für Entwicklung: `localhost`
  - Für Produktion: `yourdomain.vercel.app` (Ihre echte Domain)

#### Erweiterte Einstellungen:
- **Eigentümer**: Ihre E-Mail-Adresse
- **Benachrichtigungen**: Aktiviert (empfohlen)

4. Akzeptieren Sie die reCAPTCHA-Nutzungsbedingungen
5. Klicken Sie auf **"Absenden"**

### Keys kopieren

Nach der Erstellung erhalten Sie:
- **Site Key** (öffentlich) - für Frontend
- **Secret Key** (privat) - für Backend

## 2. Environment-Variablen konfigurieren

### Lokale Entwicklung (.env.local)
```env
# Google reCAPTCHA v3 Keys
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lc...your_site_key_here
RECAPTCHA_SECRET_KEY=6Lc...your_secret_key_here
```

### Vercel Produktion
1. Gehen Sie zu Ihrem Vercel Dashboard
2. Wählen Sie Ihr Projekt
3. Gehen Sie zu **Settings** → **Environment Variables**
4. Fügen Sie beide Variablen hinzu:
   - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
   - `RECAPTCHA_SECRET_KEY`
5. Führen Sie ein neues Deployment durch

## 3. Implementierung (bereits erfolgt)

### Installierte Pakete:
- `react-google-recaptcha-v3`

### Erstellte Komponenten:
- `src/components/recaptcha/ReCaptchaProvider.tsx`
- `src/hooks/useRecaptcha.tsx`
- `src/lib/recaptcha-service.ts`
- `src/app/api/verify-recaptcha/route.ts`

### Integrierte Formulare:
- Login (`/login`)
- Registrierung (`/register`)
- Kontakt (`/kontakt`)

## 4. Funktionsweise

### reCAPTCHA v3 Features:
- **Unsichtbar**: Keine CAPTCHAs für Benutzer
- **Score-basiert**: 0.0 (Bot) bis 1.0 (Mensch)
- **Aktions-spezifisch**: Verschiedene Scores für verschiedene Aktionen

### Implementierte Aktionen:
- `login` - Benutzeranmeldung
- `register` - Benutzerregistrierung
- `contact` - Kontaktformular

### Score-Schwellenwert:
- **Standard**: 0.5 (anpassbar in `/api/verify-recaptcha/route.ts`)
- **Empfehlung**: 
  - 0.7+ für kritische Aktionen
  - 0.5+ für normale Formulare
  - 0.3+ für weniger kritische Aktionen

## 5. Testen

### Entwicklungsumgebung:
1. Starten Sie den Dev-Server: `npm run dev`
2. Besuchen Sie `/login`, `/register` oder `/kontakt`
3. Füllen Sie ein Formular aus und senden Sie es ab
4. Überprüfen Sie die Browser-Konsole auf reCAPTCHA-Logs

### reCAPTCHA-Debug:
```javascript
// In Browser-Konsole:
localStorage.setItem('recaptcha_debug', 'true');
// Dann Seite neu laden
```

## 6. Monitoring

### Google reCAPTCHA Admin:
- Besuchen Sie: https://www.google.com/recaptcha/admin
- Wählen Sie Ihre Website
- Überwachen Sie:
  - **Anfragen pro Tag**
  - **Score-Verteilung**
  - **Erkannte Bedrohungen**

### Empfohlene Überwachung:
- Niedrige Scores häufen sich → Schwellenwert anpassen
- Hohe Bot-Aktivität → Zusätzliche Sicherheitsmaßnahmen
- Benutzer-Beschwerden → Score-Schwellenwert senken

## 7. Anpassungen

### Score-Schwellenwert ändern:
Bearbeiten Sie `src/app/api/verify-recaptcha/route.ts`:
```typescript
const minScore = 0.7; // Von 0.5 auf 0.7 erhöhen
```

### Neue Aktionen hinzufügen:
1. Verwenden Sie `useRecaptcha` Hook
2. Rufen Sie `executeAndVerifyRecaptcha` mit neuer Aktion auf
3. Beispiel:
```typescript
const result = await executeAndVerifyRecaptcha(executeRecaptcha, 'payment');
```

## 8. Troubleshooting

### Häufige Probleme:

**"reCAPTCHA ist noch nicht geladen"**
- Überprüfen Sie die Site Key in `.env.local`
- Stellen Sie sicher, dass `ReCaptchaProvider` korrekt eingebunden ist

**"reCAPTCHA Score zu niedrig"**
- Benutzer wird als Bot eingestuft
- Schwellenwert in API-Route anpassen
- Domain in Google Admin überprüfen

**"Domain not allowed"**
- Fügen Sie Domain in Google reCAPTCHA Admin hinzu
- Für localhost: nur `localhost` (ohne Port)
- Für Produktion: vollständige Domain

**Environment-Variablen nicht geladen**
- `.env.local` im Projekt-Root
- Variablen mit `NEXT_PUBLIC_` sind client-seitig sichtbar
- Nach Änderungen Dev-Server neu starten

## 9. Sicherheitshinweise

### Wichtige Regeln:
- **Nie** den Secret Key client-seitig verwenden
- **Immer** server-seitige Verifizierung durchführen
- **Regelmäßig** reCAPTCHA-Statistiken überprüfen
- **Bei Verdacht** auf Missbrauch: Keys regenerieren

### Best Practices:
- Score-Schwellenwerte je nach Anwendungsfall anpassen
- Backup-Authentifizierung für niedrige Scores
- User-Experience bei reCAPTCHA-Fehlern berücksichtigen
- Logs für Debugging und Monitoring aktivieren

## Support

Bei Problemen:
1. Überprüfen Sie die Browser-Konsole
2. Kontrollieren Sie die reCAPTCHA Admin-Konsole
3. Prüfen Sie die Vercel-Logs (bei Deployment-Problemen)
4. Dokumentation: https://developers.google.com/recaptcha/docs/v3

# Vercel Deployment - Umgebungsvariablen

## 🚀 Erforderliche Umgebungsvariablen für Vercel

Für ein vollständiges Deployment der EtsyBuchhalter-App mit PayPal-Integration benötigen Sie folgende Umgebungsvariablen in Ihrem Vercel-Dashboard:

### 1. Supabase-Konfiguration (bereits vorhanden)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. PayPal-Integration (NEU)
```
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AYour_PayPal_Client_ID_Here
PAYPAL_CLIENT_SECRET=EYour_PayPal_Client_Secret_Here
NEXT_PUBLIC_PAYPAL_ENVIRONMENT=live  # oder 'sandbox' für Tests
PAYPAL_ENVIRONMENT=live  # oder 'sandbox' für Tests
```

### 3. App-Konfiguration (NEU)
```
NEXT_PUBLIC_BASE_URL=https://yourapp.vercel.app
NODE_ENV=production
```

## 📝 Schritt-für-Schritt Anleitung

### Schritt 1: PayPal Developer Account
1. Gehen Sie zu https://developer.paypal.com/
2. Erstellen Sie eine neue App:
   - App Name: "EtsyBuchhalter"
   - Sandbox Business Account auswählen
   - Features: "Accept payments" ✅

3. Kopieren Sie die Credentials:
   - **Client ID** → `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
   - **Client Secret** → `PAYPAL_CLIENT_SECRET`

### Schritt 2: Vercel Dashboard
1. Öffnen Sie Ihr Vercel-Projekt
2. Gehen Sie zu **Settings** → **Environment Variables**
3. Fügen Sie alle Variablen hinzu:

#### Production Environment
```
Name: NEXT_PUBLIC_PAYPAL_CLIENT_ID
Value: AYour_PayPal_Live_Client_ID
Environment: Production ✅

Name: PAYPAL_CLIENT_SECRET  
Value: EYour_PayPal_Live_Client_Secret
Environment: Production ✅

Name: NEXT_PUBLIC_PAYPAL_ENVIRONMENT
Value: live
Environment: Production ✅

Name: PAYPAL_ENVIRONMENT
Value: live
Environment: Production ✅

Name: NEXT_PUBLIC_BASE_URL
Value: https://yourapp.vercel.app
Environment: Production ✅
```

#### Development Environment (Optional)
```
Name: NEXT_PUBLIC_PAYPAL_CLIENT_ID
Value: AYour_PayPal_Sandbox_Client_ID
Environment: Development ✅

Name: PAYPAL_CLIENT_SECRET
Value: EYour_PayPal_Sandbox_Client_Secret  
Environment: Development ✅

Name: NEXT_PUBLIC_PAYPAL_ENVIRONMENT
Value: sandbox
Environment: Development ✅

Name: PAYPAL_ENVIRONMENT
Value: sandbox
Environment: Development ✅

Name: NEXT_PUBLIC_BASE_URL
Value: http://localhost:3000
Environment: Development ✅
```

### Schritt 3: Deployment verifizieren
Nach dem Setzen der Variablen:
1. **Redeploy** triggern (Settings → Deployments → Redeploy)
2. **Logs prüfen** auf PayPal-bezogene Fehler
3. **Credit-Kauf testen** mit Sandbox-Account

## ⚠️ Wichtige Hinweise

### Sandbox vs. Production
- **Development/Preview**: Nutzt automatisch PayPal Sandbox
- **Production**: Nutzt PayPal Live Environment
- Stellen Sie sicher, dass Sie die richtigen Credentials für jedes Environment verwenden

### URL-Konfiguration
- `NEXT_PUBLIC_BASE_URL` muss exakt Ihre Vercel-Domain sein
- Ohne korrekte URL funktionieren PayPal-Callbacks nicht
- Format: `https://yourapp.vercel.app` (ohne trailing slash)

### Security Best Practices
- `PAYPAL_CLIENT_SECRET` darf **NIE** in Client-Code verwendet werden
- Nur `NEXT_PUBLIC_*` Variablen sind im Browser verfügbar
- Client Secret wird nur in API-Routen verwendet

## 🧪 Testen der Integration

### 1. Sandbox-Test (Development)
```javascript
// Test-Credentials für PayPal Sandbox
Email: sb-buyer@business.example.com
Password: testpassword123
```

### 2. Live-Test (Production)
- Verwenden Sie echte PayPal-Accounts
- Testen Sie mit kleinen Beträgen
- Verifizieren Sie Credit-Gutschrift

## 🔍 Troubleshooting

### Häufige Fehler

#### "PayPal Client ID not configured"
**Lösung:**
- Überprüfen Sie `NEXT_PUBLIC_PAYPAL_CLIENT_ID` in Vercel
- Triggern Sie ein Redeploy

#### "Failed to get PayPal access token"  
**Lösung:**
- Überprüfen Sie `PAYPAL_CLIENT_SECRET`
- Stellen Sie sicher, dass Sandbox/Live-Modus korrekt ist

#### "Invalid return URL"
**Lösung:**
- `NEXT_PUBLIC_BASE_URL` muss exakt Ihre Domain sein
- Keine localhost-URLs in Production

### Debug-Schritte
1. **Vercel Function Logs** prüfen:
   ```bash
   vercel logs
   ```

2. **Browser Developer Tools** öffnen:
   - Console auf PayPal-Fehler prüfen
   - Network-Tab für API-Aufrufe

3. **PayPal Developer Dashboard**:
   - Sandbox-Transaktionen überwachen
   - Webhook-Events prüfen (falls konfiguriert)

## 📋 Deployment-Checklist

### Vor dem Go-Live
- [ ] PayPal Developer App erstellt
- [ ] Live-Credentials erhalten (nicht Sandbox)
- [ ] Alle Umgebungsvariablen in Vercel gesetzt
- [ ] `NEXT_PUBLIC_BASE_URL` auf Production-Domain gesetzt
- [ ] Test-Kauf mit echtem PayPal-Account durchgeführt
- [ ] Credits wurden korrekt gutgeschrieben
- [ ] Error-Handling getestet

### Nach dem Go-Live
- [ ] Live-Transaktionen überwachen
- [ ] Vercel Function Logs prüfen
- [ ] User-Feedback sammeln
- [ ] PayPal-Dashboard auf failed payments überwachen

## 💡 Pro-Tipps

### Environment-Spezifische URLs
```javascript
// Automatische Environment-Erkennung
const isProduction = process.env.NODE_ENV === 'production';
const baseUrl = isProduction 
  ? 'https://yourapp.vercel.app'
  : 'http://localhost:3000';
```

### Monitoring
- Nutzen Sie Vercel Analytics für Performance-Monitoring
- Implementieren Sie Custom-Logging für PayPal-Transaktionen
- Überwachen Sie Supabase-Credit-Tabellen regelmäßig

Die App ist jetzt bereit für Production! 🎉

**Ihre finale Umgebungsvariablen-Liste für Vercel:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AYour_PayPal_Client_ID
PAYPAL_CLIENT_SECRET=EYour_PayPal_Client_Secret
NEXT_PUBLIC_BASE_URL=https://yourapp.vercel.app
```

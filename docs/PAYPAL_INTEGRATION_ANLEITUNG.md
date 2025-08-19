# PayPal-Integration Anleitung

Diese Anleitung erklärt die vollständige PayPal-Integration für das EtsyBuchhalter Credit-System.

## 📋 Übersicht

Das System integriert PayPal für sichere Credit-Käufe mit folgenden Features:
- Sandbox und Production Environment Support
- Automatische Credit-Gutschrift nach erfolgreicher Zahlung
- Umfassendes Error-Handling
- Success/Cancel Callback-Handling
- Transaktionsprotokollierung

## 🔧 Umgebungsvariablen für Vercel-Deployment

### Erforderliche Umgebungsvariablen

Fügen Sie diese Variablen in Ihr Vercel-Dashboard hinzu:

```bash
# PayPal Credentials
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here

# Base URL für Callbacks (wichtig für Production)
NEXT_PUBLIC_BASE_URL=https://yourdomain.vercel.app

# Supabase (bereits vorhanden)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Vercel-Konfiguration

1. **Vercel Dashboard öffnen**
   - Gehen Sie zu vercel.com und öffnen Sie Ihr Projekt
   - Navigieren Sie zu Settings → Environment Variables

2. **PayPal-Variablen hinzufügen**
   ```
   NEXT_PUBLIC_PAYPAL_CLIENT_ID = AYour_PayPal_Client_ID_Here
   PAYPAL_CLIENT_SECRET = EYour_PayPal_Client_Secret_Here
   NEXT_PUBLIC_BASE_URL = https://yourapp.vercel.app
   ```

3. **Environment Selection**
   - Für Development: Sandbox-Credentials verwenden
   - Für Production: Live-Credentials verwenden

## 🧪 PayPal Test-Accounts Setup

### Sandbox-Account erstellen

1. **PayPal Developer Dashboard**
   - Besuchen Sie: https://developer.paypal.com/
   - Melden Sie sich mit Ihrem PayPal-Account an
   - Gehen Sie zu "Applications"

2. **Neue App erstellen**
   ```
   App Name: EtsyBuchhalter
   Sandbox Business Account: Wählen Sie einen aus oder erstellen Sie einen neuen
   Features: 
   ✅ Accept payments
   ✅ Advanced Checkout
   ```

3. **Credentials abrufen**
   - Client ID: `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
   - Client Secret: `PAYPAL_CLIENT_SECRET`

### Test-Buyer-Accounts

PayPal stellt automatisch Test-Buyer-Accounts zur Verfügung:

#### Standard Test-Käufer
```
Email: sb-buyer@business.example.com
Password: testpassword123
```

#### Test-Kreditkarten (für Sandbox)
```
Visa: 4111111111111111
Mastercard: 5555555555554444
Amex: 378282246310005

Exp Date: 01/25
CVV: 123
```

### Eigene Test-Accounts erstellen

1. **PayPal Sandbox öffnen**
   - Gehen Sie zu: https://www.sandbox.paypal.com/
   - Loggen Sie sich mit Ihren Developer-Credentials ein

2. **Test-Käufer erstellen**
   - Dashboard → Accounts → Create Account
   - Account Type: Personal (Buyer)
   - Country: Germany
   - Email: wählen Sie eine Test-Email
   - Password: mindestens 8 Zeichen

3. **Test-Verkäufer-Account (falls benötigt)**
   - Account Type: Business (Seller)
   - Vervollständigen Sie die Business-Informationen

## 💳 Preismodell-Konfiguration

Die Credit-Pakete sind bereits in der Datenbank konfiguriert:

```sql
-- Aktuelle Pakete (aus docs/credit-system-migration.sql)
Starter Paket: 500 Credits für 7,99€
Professional Paket: 1000 Credits für 9,99€  
Business Paket: 3000 Credits für 19,99€
```

### Preise ändern (falls nötig)

```sql
-- In Supabase SQL Editor
UPDATE credit_packages 
SET price_euros = 8.99 
WHERE name = 'Starter Paket';
```

## 🔄 Workflow der PayPal-Integration

### 1. Credit-Kauf initiieren
```typescript
// Benutzer wählt Paket → PayPal-Button wird geladen
<PayPalButton creditPackage={selectedPackage} />
```

### 2. PayPal-Order erstellen
```
POST /api/paypal/create-order
→ Validierung
→ PayPal Order Creation
→ Database Purchase Record
→ Return Order ID
```

### 3. PayPal-Zahlung
```
PayPal Checkout Flow
→ Benutzer bezahlt
→ PayPal redirectet zu return_url
```

### 4. Payment Capture
```
GET /api/paypal/capture-payment?token=ORDER_ID
→ PayPal Order Details abrufen
→ Payment erfassen
→ Credits hinzufügen (add_credits RPC)
→ Redirect zu Dashboard mit Success-Message
```

## 🛠️ API-Endpunkte

### POST /api/paypal/create-order
**Zweck:** PayPal-Order erstellen und Purchase-Record in DB anlegen

**Request Body:**
```json
{
  "packageId": "uuid",
  "credits": 500,
  "price": 7.99
}
```

**Response:**
```json
{
  "orderID": "paypal_order_id",
  "purchaseId": "database_purchase_id"
}
```

### GET /api/paypal/capture-payment
**Zweck:** PayPal-Zahlung erfassen und Credits gutschreiben

**Query Parameters:**
- `token`: PayPal Order ID
- `PayerID`: PayPal Payer ID (automatisch)

**Redirects:**
- Success: `/dashboard?payment=success&credits=500&amount=7.99`
- Error: `/dashboard?payment=error&message=error_code`
- Cancel: `/dashboard?payment=cancelled`

## 🚨 Error-Handling

### PayPal-Fehler
```typescript
// In PayPalButton.tsx
onError={(err) => {
  console.error('PayPal error:', err);
  toast({
    title: "PayPal Fehler",
    description: "Es ist ein Fehler bei der Zahlung aufgetreten.",
    variant: "destructive",
  });
}}
```

### API-Fehler
```typescript
// In create-order/route.ts
catch (error) {
  console.error('Create Order Error:', error);
  return NextResponse.json(
    { error: 'Interner Server-Fehler' },
    { status: 500 }
  );
}
```

### Callback-Fehler im Dashboard
```typescript
// Verschiedene Error-Codes werden behandelt:
// missing_token, purchase_not_found, capture_failed, etc.
```

## 🔒 Sicherheit

### Validierungen
- Benutzer-Authentifizierung vor jeder Aktion
- Credit-Paket-Validierung gegen Datenbank
- Preis-Validierung (Frontend ≠ Backend)
- PayPal-Transaction-Verifizierung

### RLS-Policies
Alle Credit-Tabellen haben Row Level Security aktiviert:
```sql
-- user_credits: Benutzer sehen nur eigene Credits
-- credit_purchases: Benutzer sehen nur eigene Käufe
-- credit_transactions: Benutzer sehen nur eigene Transaktionen
```

## 📊 Monitoring & Debugging

### Logs prüfen
```bash
# Vercel Function Logs
vercel logs [deployment-url]

# Supabase Logs
# → Supabase Dashboard → Logs
```

### Häufige Probleme

1. **"PayPal Client ID not configured"**
   - Lösung: `NEXT_PUBLIC_PAYPAL_CLIENT_ID` in Vercel setzen

2. **"Failed to get PayPal access token"**
   - Lösung: `PAYPAL_CLIENT_SECRET` prüfen

3. **"Purchase not found"**
   - Lösung: Database Purchase Record überprüfen

4. **Credits werden nicht gutgeschrieben**
   - Lösung: `add_credits` RPC-Function und Permissions prüfen

## 🚀 Deployment-Checklist

### Vor dem Go-Live

- [ ] PayPal-App von Sandbox auf Live umstellen
- [ ] Production-Credentials in Vercel setzen
- [ ] `NEXT_PUBLIC_BASE_URL` auf Production-Domain setzen
- [ ] Test-Käufe mit echten Kreditkarten durchführen
- [ ] Error-Handling in allen Szenarien testen
- [ ] Credit-Gutschrift verifizieren
- [ ] Webhook-URLs bei PayPal registrieren (falls erweitert)

### Nach dem Go-Live

- [ ] Transaction-Logs überwachen
- [ ] PayPal-Dashboard auf failed payments prüfen
- [ ] Supabase Credit-Tabellen überwachen
- [ ] User-Feedback sammeln

## 🔧 Erweiterte Features (Optional)

### Webhooks für zusätzliche Sicherheit
```typescript
// POST /api/paypal/webhook
// Verifiziert PayPal-Events unabhängig von Redirects
```

### Refund-System
```typescript
// POST /api/paypal/refund
// Für Rückerstattungen und Credit-Abzug
```

### Admin-Panel
```typescript
// Überwachung aller Transaktionen
// Manuelle Credit-Gutschriften
// Failed Payment Analysis
```

## 📞 Support

Bei Problemen mit der PayPal-Integration:

1. **Vercel-Logs prüfen**
2. **Supabase-Logs analysieren**
3. **PayPal Developer-Dashboard konsultieren**
4. **Browser-Entwicklertools für Frontend-Fehler**

Die Integration ist vollständig dokumentiert und produktionsbereit! 🎉

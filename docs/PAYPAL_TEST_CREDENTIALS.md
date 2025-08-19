# PayPal Test-Credentials & Test-Anleitung

## 🧪 Sandbox Test-Accounts

### Für Development/Testing

#### PayPal Developer App (Sandbox)
```
App Name: EtsyBuchhalter-Sandbox
Environment: Sandbox
Client ID: Ihre Sandbox Client ID
Client Secret: Ihr Sandbox Client Secret
```

#### Test-Käufer-Accounts
```
Käufer 1:
Email: sb-buyer@personal.example.com  
Password: testpassword123
Land: Deutschland
Balance: 5000 EUR

Käufer 2: 
Email: sb-47m8l5zv@personal.example.com
Password: testpassword123
Land: Deutschland  
Balance: 1000 EUR
```

#### Test-Kreditkarten für Sandbox
```
Visa:
Nummer: 4111111111111111
Exp: 01/25
CVV: 123

Mastercard:
Nummer: 5555555555554444  
Exp: 01/25
CVV: 123

American Express:
Nummer: 378282246310005
Exp: 01/25
CVV: 1234
```

## 🎯 Test-Szenarien

### Szenario 1: Erfolgreicher Kauf (Starter Paket)
1. **Setup:**
   - User eingeloggt
   - Aktuelle Credits: 30 (Standard)
   - Paket: 500 Credits für 7,99€

2. **Test-Schritte:**
   ```
   1. Dashboard → Credits kaufen
   2. Starter Paket auswählen  
   3. PayPal-Button klicken
   4. Mit Test-Account einloggen
   5. Zahlung bestätigen
   6. Weiterleitung zum Dashboard
   ```

3. **Erwartetes Ergebnis:**
   ```
   ✅ Toast: "Zahlung erfolgreich! 500 Credits für 7,99€"
   ✅ Credits erhöht auf: 530
   ✅ Credit-Transaction in DB erstellt
   ✅ Purchase Record als "completed"
   ```

### Szenario 2: Zahlung abgebrochen
1. **Test-Schritte:**
   ```
   1. Credits kaufen → Paket wählen
   2. PayPal-Button klicken
   3. Bei PayPal "Abbrechen" klicken
   ```

2. **Erwartetes Ergebnis:**
   ```
   ✅ Toast: "Zahlung abgebrochen"
   ✅ Weiterleitung zum Dashboard
   ✅ Credits unverändert
   ✅ Purchase Record bleibt "pending"
   ```

### Szenario 3: PayPal-Fehler
1. **Test-Schritte:**
   ```
   1. Ungültige PayPal-Credentials verwenden
   2. Oder Sandbox-Account mit 0€ Balance
   ```

2. **Erwartetes Ergebnis:**
   ```
   ✅ Toast: "PayPal-Fehler" angezeigt
   ✅ Benutzer kann es erneut versuchen
   ✅ Keine falschen Credit-Gutschriften
   ```

## 🔧 Test-Setup in Local Environment

### .env.local Datei erstellen
```bash
# PayPal Sandbox
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AYour_Sandbox_Client_ID_Here
PAYPAL_CLIENT_SECRET=EYour_Sandbox_Client_Secret_Here

# Local development
NEXT_PUBLIC_BASE_URL=http://localhost:9002

# Supabase (bereits vorhanden)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Test-Database Setup
Stellen Sie sicher, dass Credit-System migriert ist:
```sql
-- Prüfen Sie diese Tabellen in Supabase:
SELECT * FROM credit_packages WHERE is_active = true;
SELECT * FROM user_credits WHERE user_id = 'your_test_user_id';
```

## 🚀 End-to-End Test-Checklist

### Vor jedem Release
- [ ] Sandbox-Kauf mit allen 3 Paketen getestet
- [ ] PayPal-Abbruch getestet  
- [ ] Error-Handling verifiziert
- [ ] Credit-Gutschrift in DB bestätigt
- [ ] Toast-Nachrichten korrekt angezeigt
- [ ] URL-Redirects funktionieren
- [ ] Mobile Responsiveness geprüft

### Test-Benutzer anlegen
```
1. In Ihrer App registrieren
2. E-Mail bestätigen  
3. Firmendaten ausfüllen
4. Credits prüfen (sollte 30 sein)
5. Credit-Kauf testen
```

### Monitoring-Tests
```sql
-- Nach Test-Kauf diese Queries ausführen:

-- 1. Credits korrekt gutgeschrieben?
SELECT credits FROM user_credits WHERE user_id = 'test_user_id';

-- 2. Transaction erstellt?  
SELECT * FROM credit_transactions 
WHERE user_id = 'test_user_id' 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Purchase Record vollständig?
SELECT * FROM credit_purchases 
WHERE user_id = 'test_user_id'
ORDER BY created_at DESC 
LIMIT 3;
```

## 🏭 Production-Tests

### Nach Vercel-Deployment

#### Test 1: Live PayPal-Account
```
1. Echten PayPal-Account verwenden
2. Kleinstbetrag testen (7,99€)  
3. Echte Kreditkarte
4. Credits-Gutschrift verifizieren
```

#### Test 2: Mobile Geräte
```
1. iPhone Safari testen
2. Android Chrome testen  
3. PayPal Mobile App Flow
4. Touch-Interaktionen prüfen
```

#### Test 3: Error-Szenarien
```
1. Netzwerk-Unterbrechung simulieren
2. PayPal-Service-Downtime
3. Database-Ausfall testen
4. Unvollständige Zahlungen
```

## 📊 Test-Daten-Tracking

### Erwartete Test-Ergebnisse
```javascript
// Nach erfolgreichem Sandbox-Kauf:
{
  "userCredits": {
    "before": 30,
    "purchased": 500, 
    "after": 530
  },
  "purchaseRecord": {
    "status": "completed",
    "paypal_transaction_id": "present",
    "credits_purchased": 500,
    "price_paid": 7.99
  },
  "transaction": {
    "type": "purchase", 
    "credits_change": 500,
    "credits_balance_after": 530
  }
}
```

## 🔍 Debug-Tipps

### Browser DevTools
```javascript
// PayPal-Integration debuggen:
1. Console → PayPal-Fehler suchen
2. Network → API-Calls prüfen (/api/paypal/*)
3. Application → LocalStorage für PayPal-State
```

### Vercel Function Logs
```bash
# Live-Debugging
vercel logs --follow

# Spezifische Function
vercel logs --function=api/paypal/create-order
```

### Supabase Monitoring
```
1. Logs → Real-time logs anzeigen
2. Database → Performance monitoring  
3. Auth → User sessions prüfen
```

Happy Testing! 🎉

Alle Test-Szenarien sollten vor dem Production-Deployment erfolgreich durchlaufen werden.

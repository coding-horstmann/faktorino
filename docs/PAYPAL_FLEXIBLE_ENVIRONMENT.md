# PayPal Flexible Environment Configuration

## 🎯 Übersicht

Die PayPal-Integration wurde so erweitert, dass Sie flexibel zwischen Sandbox und Live-Umgebung wechseln können, unabhängig von der NODE_ENV-Einstellung.

## 🔧 Neue Umgebungsvariable

### PAYPAL_ENVIRONMENT

Fügen Sie diese Variable in Ihr Vercel-Dashboard hinzu:

```bash
PAYPAL_ENVIRONMENT=live    # Für Live-Umgebung
PAYPAL_ENVIRONMENT=sandbox # Für Sandbox-Umgebung
```

**Wichtig:** Diese Variable hat Vorrang vor der NODE_ENV-basierten Logik!

## 📋 Konfigurationsoptionen

### Option 1: Explizite Umgebung (Empfohlen)

```bash
# Für Live-Tests
PAYPAL_ENVIRONMENT=live
NEXT_PUBLIC_PAYPAL_CLIENT_ID=Ihre_Live_Client_ID
PAYPAL_CLIENT_SECRET=Ihr_Live_Client_Secret

# Für Sandbox-Tests  
PAYPAL_ENVIRONMENT=sandbox
NEXT_PUBLIC_PAYPAL_CLIENT_ID=Ihre_Sandbox_Client_ID
PAYPAL_CLIENT_SECRET=Ihr_Sandbox_Client_Secret
```

### Option 2: Automatische Erkennung (Fallback)

Wenn `PAYPAL_ENVIRONMENT` nicht gesetzt ist, wird automatisch erkannt:

```bash
# Production Environment → Live
NODE_ENV=production → https://api-m.paypal.com

# Development/Preview → Sandbox  
NODE_ENV=development → https://api-m.sandbox.paypal.com
```

## 🚀 Vercel-Konfiguration

### Für Live-Tests in Production

```bash
# Vercel Environment Variables (Production)
PAYPAL_ENVIRONMENT=live
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AYour_Live_Client_ID
PAYPAL_CLIENT_SECRET=EYour_Live_Client_Secret
NEXT_PUBLIC_BASE_URL=https://yourapp.vercel.app
```

### Für Sandbox-Tests in Production

```bash
# Vercel Environment Variables (Production)
PAYPAL_ENVIRONMENT=sandbox
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AYour_Sandbox_Client_ID
PAYPAL_CLIENT_SECRET=EYour_Sandbox_Client_Secret
NEXT_PUBLIC_BASE_URL=https://yourapp.vercel.app
```

## 🧪 Test-Szenarien

### Live-Umgebung mit Test-Kreditkarten

**Vorteile:**
- ✅ Echte PayPal-UI und Performance
- ✅ Realistische Browser-Umgebung
- ✅ Mobile App Integration
- ✅ Echte Callback-URLs

**Test-Strategie:**
1. Kleine Beträge verwenden (7,99€)
2. Echte PayPal-Accounts nutzen
3. Sofortige Rückerstattung möglich
4. PayPal-Dashboard überwachen

### Sandbox-Umgebung

**Vorteile:**
- ✅ Keine echten Geldtransfers
- ✅ Test-Accounts verfügbar
- ✅ Sichere Entwicklungsumgebung

## 🔍 Debugging

### Console-Logs

Die Anwendung zeigt jetzt detaillierte Logs:

```javascript
PayPalProvider - Client ID: SET (AV4xWRMY...)
PayPalProvider - Environment: production
PayPalProvider - PayPal Environment: live
PayPalProvider - Detected environment: live
```

### Umgebung prüfen

```bash
# In Vercel Function Logs
vercel logs --follow

# Browser Console
console.log('PayPal Environment:', process.env.PAYPAL_ENVIRONMENT);
```

## 📊 Migration von alter Konfiguration

### Vorher (NODE_ENV-basiert)
```typescript
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';
```

### Nachher (Flexibel)
```typescript
const getPayPalBaseUrl = () => {
  if (process.env.PAYPAL_ENVIRONMENT === 'live') {
    return 'https://api-m.paypal.com';
  }
  if (process.env.PAYPAL_ENVIRONMENT === 'sandbox') {
    return 'https://api-m.sandbox.paypal.com';
  }
  
  // Fallback auf NODE_ENV
  return process.env.NODE_ENV === 'production' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';
};
```

## ✅ Empfohlene Workflow

### 1. Development
```bash
PAYPAL_ENVIRONMENT=sandbox
# Testen mit Sandbox-Accounts
```

### 2. Production-Tests
```bash
PAYPAL_ENVIRONMENT=live
# Testen mit echten Accounts und kleinen Beträgen
```

### 3. Production-Live
```bash
PAYPAL_ENVIRONMENT=live
# Vollständiger Live-Betrieb
```

## 🚨 Wichtige Hinweise

1. **Sicherheit**: Live-Umgebung bedeutet echte Geldtransfers
2. **Testing**: Verwenden Sie immer kleine Beträge zum Testen
3. **Monitoring**: Überwachen Sie alle Transaktionen im PayPal-Dashboard
4. **Rückerstattung**: PayPal bietet oft sofortige Rückerstattungen für Test-Transaktionen

## 🔄 Schneller Umgebungswechsel

Um schnell zwischen Sandbox und Live zu wechseln:

1. **Vercel Dashboard** → Settings → Environment Variables
2. **PAYPAL_ENVIRONMENT** ändern: `sandbox` ↔ `live`
3. **Redeploy** triggern
4. **Testen** mit entsprechenden Accounts

Diese Konfiguration gibt Ihnen maximale Flexibilität für Tests und Entwicklung! 🎉

# Google Ads Setup für faktorino

## ✅ Was ist bereits eingerichtet:

1. **Google Ads ID**: `AW-17515355179` ist in Vercel gesetzt
2. **Cookie-Management**: Marketing-Cookies werden nur mit Einverständnis geladen
3. **Conversion-Tracking**: Automatisches Tracking für wichtige Events
4. **DSGVO-konform**: Alle Cookies werden nur mit Zustimmung gesetzt

## 🎯 Conversion-Tracking Events:

### Registrierung
- **Event**: `registration`
- **Google Ads Conversion**: `AW-17515355179/Registrierung`
- **Wert**: 1 EUR (Standard)

### Rechnungsgenerierung
- **Event**: `invoice_generated`
- **Google Ads Conversion**: `AW-17515355179/Rechnung`
- **Wert**: 1 EUR (Standard)

### Kredit-Kauf
- **Event**: `credit_purchase`
- **Google Ads Conversion**: `AW-17515355179/Kauf`
- **Wert**: Tatsächlicher Kaufpreis in EUR

## 🧪 Wie du es testest:

### 1. **Lokaler Test:**
```bash
# App starten
npm run dev

# Gehe zu: http://localhost:9002
# Öffne die Test-Komponente (falls verfügbar)
```

### 2. **Browser Developer Tools:**
- Öffne **Console** und prüfe auf Fehler
- Gehe zu **Network** und suche nach `googletagmanager.com` Requests
- Prüfe **Application** → **Cookies** auf Google Ads Cookies

### 3. **Google Tag Assistant:**
- Installiere die **Google Tag Assistant** Browser-Erweiterung
- Teste deine Website und prüfe, ob alle Tags korrekt feuern

### 4. **Manueller Test:**
```javascript
// In der Browser Console:
if (window.gtag) {
  // Test: Registrierung Conversion
  window.gtag('event', 'conversion', {
    send_to: 'AW-17515355179/Registrierung'
  });
  
  // Test: Kauf Conversion mit Wert
  window.gtag('event', 'conversion', {
    send_to: 'AW-17515355179/Kauf',
    value: 29.99,
    currency: 'EUR'
  });
}
```

## 📋 Nächste Schritte:

1. **Google Ads Conversion Actions erstellen** (falls noch nicht geschehen)
2. **Conversion IDs in den Code einfügen** (falls andere IDs benötigt werden)
3. **Testen mit Tag Assistant**
4. **Kampagne starten**

## 🔧 Code-Integration:

### In Komponenten verwenden:
```tsx
import { useGoogleAdsConversion } from '@/hooks/useCookieAnalytics';

function MyComponent() {
  const { trackGoogleAdsConversion } = useGoogleAdsConversion();

  const handleRegistration = () => {
    // Registrierung durchführen
    trackGoogleAdsConversion('Registrierung');
  };

  const handlePurchase = (amount: number) => {
    // Kauf durchführen
    trackGoogleAdsConversion('Kauf', amount, 'EUR');
  };

  return (
    // ...
  );
}
```

## 🚨 Wichtige Hinweise:

- **Marketing-Cookies müssen aktiviert sein** für Google Ads Tracking
- **Nur bei Einverständnis** werden Conversion-Events gesendet
- **Teste immer lokal** bevor du in Produktion gehst
- **Überprüfe die Console** auf Fehler

## 📞 Support:

Bei Problemen:
1. Prüfe die Browser Console auf Fehler
2. Überprüfe die Network-Tab für fehlende Requests
3. Teste mit Google Tag Assistant
4. Prüfe die Cookie-Einstellungen

---

**Status**: ✅ Setup abgeschlossen - Bereit zum Testen!

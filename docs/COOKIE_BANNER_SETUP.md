# Cookie-Banner Setup für faktorino

## Übersicht

Das Cookie-Banner-System ist vollständig DSGVO-konform und verwaltet automatisch die Cookie-Einstellungen der Benutzer. Es unterstützt die folgenden Kategorien:

- **Notwendige Cookies** (immer aktiv): Supabase Session, reCAPTCHA, PayPal
- **Analyse-Cookies**: Google Analytics, Google Search Console
- **Marketing-Cookies**: Google Ads
- **E-Mail-Cookies**: Brevo (Sendinblue)

## Features

✅ **DSGVO-konform** - Vollständige Einverständnisverwaltung  
✅ **Granular** - Einzelne Kategorien können aktiviert/deaktiviert werden  
✅ **Persistent** - Einstellungen werden lokal gespeichert  
✅ **Jederzeit zugänglich** - Cookie-Einstellungen über Footer verfügbar  
✅ **Automatisches Loading** - Services werden nur bei Einverständnis geladen  
✅ **Analytics-Tracking** - Einfache Event-Tracking-Integration  

## Installation

Das Cookie-Banner ist bereits in das Layout integriert. Es wird automatisch beim ersten Besuch angezeigt.

## Umgebungsvariablen

Füge folgende Umgebungsvariablen zu deiner `.env.local` hinzu:

```env
# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Google Ads (optional)
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXXX
```

## Verwendung

### 1. Analytics-Tracking in Komponenten

```tsx
import { useCookieEventTracking } from '@/hooks/useCookieAnalytics';

function MyComponent() {
  const { trackRegistration, trackInvoiceGeneration } = useCookieEventTracking();

  const handleRegistration = () => {
    // Registrierung durchführen
    trackRegistration(); // Analytics-Event (nur wenn aktiviert)
  };

  const handleInvoiceGeneration = (count: number) => {
    // Rechnung generieren
    trackInvoiceGeneration(count); // Analytics-Event (nur wenn aktiviert)
  };

  return (
    // ...
  );
}
```

### 2. Automatisches Page-View Tracking

```tsx
import { useCookieAnalytics } from '@/hooks/useCookieAnalytics';

function MyPage() {
  useCookieAnalytics(); // Automatisches Page-View Tracking

  return (
    // ...
  );
}
```

### 3. Manuelles Event-Tracking

```tsx
import { useAnalytics } from '@/components/cookie';

function MyComponent() {
  const { trackEvent } = useAnalytics();

  const handleCustomAction = () => {
    trackEvent('custom_action', 'category', 'label', 1);
  };

  return (
    // ...
  );
}
```

## Cookie-Kategorien

### Notwendige Cookies (immer aktiv)
- **Supabase Session**: Benutzerauthentifizierung
- **reCAPTCHA**: Spam-Schutz bei Login/Register
- **PayPal**: Zahlungsabwicklung

### Analyse-Cookies (Einverständnis erforderlich)
- **Google Analytics**: Website-Analyse
- **Google Search Console**: SEO-Analyse

### Marketing-Cookies (Einverständnis erforderlich)
- **Google Ads**: Werbung

### E-Mail-Cookies (Einverständnis erforderlich)
- **Brevo (Sendinblue)**: E-Mail-Benachrichtigungen

## DSGVO-Konformität

Das System erfüllt alle DSGVO-Anforderungen:

- ✅ **Transparenz**: Klare Kategorisierung aller Cookies
- ✅ **Einverständnis**: Explizite Zustimmung vor Cookie-Setzung
- ✅ **Granularität**: Einzelne Kategorien können verwaltet werden
- ✅ **Widerruflichkeit**: Einstellungen können jederzeit geändert werden
- ✅ **Nachweisbarkeit**: Speicherung der Einverständnisse
- ✅ **Zugänglichkeit**: Cookie-Einstellungen immer verfügbar

## Benutzeroberfläche

### Cookie-Banner
- Erscheint beim ersten Besuch
- Optionen: "Alle akzeptieren", "Nur notwendige", "Einstellungen"
- Erweiterbare Details zu Cookie-Kategorien

### Cookie-Einstellungen
- Detaillierte Einstellungen für jede Kategorie
- Übersicht über aktive/inaktive Services
- Speichern/Abbrechen-Funktionalität

### Footer-Link
- "Cookie-Einstellungen" im Footer verfügbar
- Jederzeitiger Zugriff auf Einstellungen

## Technische Details

### Dateien
- `src/contexts/CookieContext.tsx` - State Management
- `src/components/cookie/CookieBanner.tsx` - Hauptbanner
- `src/components/cookie/CookieSettings.tsx` - Detaillierte Einstellungen
- `src/components/cookie/CookieManager.tsx` - Service-Loading
- `src/hooks/useCookieAnalytics.ts` - Analytics-Integration

### Speicherung
- Cookie-Einstellungen werden in `localStorage` gespeichert
- Schlüssel: `cookie-preferences` und `cookie-consent-given`

### Performance
- Services werden nur bei Einverständnis geladen
- Keine unnötigen Skripte bei Ablehnung
- Lazy Loading der Analytics-Skripte

## Anpassungen

### Neue Cookie-Kategorien hinzufügen

1. `CookiePreferences` Interface erweitern
2. UI-Komponenten anpassen
3. Service-Loading-Logik hinzufügen

### Design anpassen

Die Komponenten verwenden das bestehende UI-System (shadcn/ui) und können über Tailwind CSS angepasst werden.

## Support

Bei Fragen oder Problemen wende dich an: kontakt@faktorino.de

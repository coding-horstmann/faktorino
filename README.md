# EtsyBuchhalter - Credit-System mit PayPal-Integration

Ein modernes Next.js-basiertes Buchhaltungssystem für Etsy-Verkäufer mit integriertem Credit-System und PayPal-Zahlungsabwicklung.

## 🚀 Features

- **Credit-System**: Kaufen und verwalten Sie Credits für Buchhaltungsfunktionen
- **PayPal-Integration**: Sichere Zahlungsabwicklung mit flexibler Umgebungskonfiguration
- **Supabase Backend**: Moderne Datenbank mit Row Level Security
- **Responsive Design**: Optimiert für Desktop und Mobile
- **Vercel Deployment**: Einfaches Hosting und Deployment

## 🔧 PayPal-Integration

### Flexible Umgebungskonfiguration

Die PayPal-Integration unterstützt jetzt flexible Umgebungskonfiguration:

```bash
# Für Live-Umgebung
PAYPAL_ENVIRONMENT=live

# Für Sandbox-Umgebung  
PAYPAL_ENVIRONMENT=sandbox
```

### Vorteile der Live-Umgebung für Tests

- ✅ Echte PayPal-UI und Performance
- ✅ Realistische Browser-Umgebung
- ✅ Mobile App Integration
- ✅ Echte Callback-URLs
- ✅ Testen mit echten PayPal-Accounts

## 📋 Installation

1. **Repository klonen**
   ```bash
   git clone https://github.com/coding-horstmann/bishierhingut.git
   cd bishierhingut
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Umgebungsvariablen konfigurieren**
   ```bash
   # .env.local erstellen
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
   PAYPAL_CLIENT_SECRET=your_paypal_client_secret
   PAYPAL_ENVIRONMENT=sandbox  # oder 'live'
   ```

4. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```

## 🚀 Deployment

### Vercel Deployment

1. **Repository mit Vercel verbinden**
2. **Umgebungsvariablen in Vercel setzen**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
   PAYPAL_CLIENT_SECRET=your_paypal_client_secret
   PAYPAL_ENVIRONMENT=live  # oder 'sandbox'
   NEXT_PUBLIC_BASE_URL=https://yourapp.vercel.app
   ```

3. **Deployen**

## 📚 Dokumentation

- [PayPal Integration Anleitung](docs/PAYPAL_INTEGRATION_ANLEITUNG.md)
- [Flexible Environment Configuration](docs/PAYPAL_FLEXIBLE_ENVIRONMENT.md)
- [Vercel Deployment Guide](docs/VERCEL_DEPLOYMENT.md)
- [Supabase Setup](docs/SUPABASE_SETUP.md)

## 🧪 Testing

### Sandbox-Tests
```bash
PAYPAL_ENVIRONMENT=sandbox
# Verwenden Sie Sandbox-Accounts von developer.paypal.com
```

### Live-Tests
```bash
PAYPAL_ENVIRONMENT=live
# Verwenden Sie echte PayPal-Accounts mit kleinen Beträgen
```

## 🔒 Sicherheit

- Row Level Security (RLS) in Supabase
- Benutzer-Authentifizierung vor jeder Zahlung
- PayPal-Transaction-Verifizierung
- Sichere Umgebungsvariablen-Verwaltung

## 📄 Lizenz

Dieses Projekt ist für den internen Gebrauch bestimmt.

## 🆘 Support

Bei Fragen oder Problemen:
1. Dokumentation in `/docs` durchsuchen
2. GitHub Issues erstellen
3. PayPal Developer Dashboard konsultieren

---

**Live Demo**: [bishierhingut.vercel.app](https://bishierhingut.vercel.app)

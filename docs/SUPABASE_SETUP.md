# Supabase Setup Anleitung

Diese Anleitung hilft Ihnen bei der Einrichtung von Supabase für die EtsyBuchhalter-Anwendung.

## 1. Supabase Projekt erstellen

1. Gehen Sie zu [supabase.com](https://supabase.com)
2. Erstellen Sie ein kostenloses Konto
3. Erstellen Sie ein neues Projekt
4. Wählen Sie eine Region aus (empfohlen: Deutschland/Europa)
5. Notieren Sie sich die Projekt-URL und den Anon Key

## 2. Umgebungsvariablen einrichten

1. Erstellen Sie eine `.env.local` Datei im Projektverzeichnis
2. Fügen Sie die folgenden Variablen hinzu:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Diese Werte finden Sie in Ihrem Supabase Dashboard unter Settings > API.

## 3. Datenbank einrichten

1. Öffnen Sie das Supabase Dashboard
2. Gehen Sie zum SQL Editor
3. Kopieren Sie den Inhalt der Datei `docs/supabase-setup.sql`
4. Fügen Sie das SQL-Skript ein und führen Sie es aus

Das Skript erstellt:
- `users` Tabelle für Nutzerdaten
- `invoices` Tabelle für Rechnungsdaten
- Row Level Security (RLS) Policies
- Automatische Trigger für Timestamps
- Indizes für bessere Performance

## 4. Authentifizierung konfigurieren

### E-Mail Authentifizierung (Standard)
Die E-Mail-Authentifizierung ist standardmäßig aktiviert.

### Google OAuth (Optional)
Für Google-Anmeldung:

1. Gehen Sie zu Authentication > Settings > Auth Providers
2. Aktivieren Sie Google
3. Erstellen Sie ein Google OAuth-Projekt in der [Google Cloud Console](https://console.cloud.google.com)
4. Fügen Sie die Client ID und Client Secret hinzu
5. Fügen Sie Ihre Domain zu den autorisierten Domains hinzu

## 5. RLS (Row Level Security) Verifikation

Überprüfen Sie, dass RLS aktiviert ist:

1. Gehen Sie zu Database > Tables
2. Klicken Sie auf die `users` Tabelle
3. Überprüfen Sie, dass "Row Level Security" aktiviert ist
4. Wiederholen Sie für die `invoices` Tabelle

## 6. Migration bestehender Daten

Falls Sie bereits lokale Daten haben:

1. Die Anwendung migriert automatisch localStorage-Daten nach der ersten Anmeldung
2. Nutzerdaten werden beim ersten Login/Register erstellt
3. Rechnungen werden beim ersten Laden synchronisiert

## 7. Testing

1. Starten Sie die Anwendung: `npm run dev`
2. Registrieren Sie einen Test-Nutzer
3. Erstellen Sie Test-Rechnungen
4. Überprüfen Sie die Daten im Supabase Dashboard

## Troubleshooting

### Verbindungsfehler
- Überprüfen Sie die Umgebungsvariablen
- Stellen Sie sicher, dass der Anon Key korrekt ist

### RLS Probleme
- Überprüfen Sie, dass die Policies korrekt erstellt wurden
- Nutzer können nur ihre eigenen Daten sehen und bearbeiten

### OAuth Probleme
- Überprüfen Sie die OAuth-Konfiguration
- Stellen Sie sicher, dass die Redirect-URLs korrekt sind

## Produktionsumgebung

Für die Produktionsumgebung:

1. Verwenden Sie eine separate Supabase-Instanz
2. Konfigurieren Sie Custom Domains
3. Aktivieren Sie zusätzliche Sicherheitsfeatures
4. Überwachen Sie die Nutzung und Performance

## Support

Bei Problemen:
1. Überprüfen Sie die Supabase-Logs
2. Konsultieren Sie die [Supabase Dokumentation](https://docs.supabase.com)
3. Prüfen Sie die Browser-Konsole auf Fehlermeldungen

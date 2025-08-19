# Credit-System Migration Anleitung

Diese Anleitung führt Sie durch die Migration vom alten monatlichen Limit-System zum neuen Credit-System.

## 📋 Übersicht der Änderungen

Das neue Credit-System ersetzt das bisherige System komplett:

### Vorher (Alt)
- 14 Tage kostenlose Testzeit
- Abonnenten konnten bis zu 10.000 Rechnungen pro Monat erstellen
- Monatliche Limits mit automatischem Reset

### Jetzt (Neu)
- 30 kostenlose Start-Credits für alle Benutzer
- Credit-basierte Rechnungserstellung (1 Credit = 1 Rechnung)
- Credits verfallen nicht
- Flexible Credit-Pakete zum Kauf

## 🗄️ Datenbank-Migration

### Schritt 1: Backup erstellen
**WICHTIG**: Erstellen Sie vor der Migration ein Backup Ihrer Supabase-Datenbank!

### Schritt 2: Migration ausführen
1. Öffnen Sie Ihr Supabase Dashboard
2. Gehen Sie zum SQL Editor
3. Kopieren Sie den Inhalt von `docs/credit-system-migration.sql`
4. Führen Sie das Skript aus

### Schritt 3: Daten migrieren
Das Migrationsskript:
- Erstellt alle neuen Tabellen mit RLS-Policies
- Fügt Standard Credit-Pakete hinzu
- Gibt allen bestehenden Benutzern 30 kostenlose Credits
- Erstellt entsprechende Transaktionslogs

## 📦 Neue Datenbankstruktur

### Neue Tabellen:
1. **`user_credits`** - Aktuelles Credit-Guthaben pro Benutzer
2. **`credit_packages`** - Verfügbare Credit-Pakete
3. **`credit_transactions`** - Alle Credit-Bewegungen
4. **`credit_purchases`** - PayPal-Käufe und deren Status

### Neue Funktionen:
- `use_credits()` - Credits verwenden
- `add_credits()` - Credits hinzufügen
- `initialize_user_credits()` - Start-Credits für neue Benutzer

## 🚀 Code-Änderungen

### Backend
- **Neuer Service**: `src/lib/credit-service.ts`
- **Erweiterte Types**: `src/lib/supabase.ts`
- **Aktualisierte Actions**: `src/app/actions.ts`

### Frontend
- **Neue Komponenten**: 
  - `src/app/(components)/credit-purchase.tsx`
  - `src/app/(components)/credit-dashboard.tsx`
- **Neue Seite**: `src/app/credits/page.tsx`
- **Aktualisiertes Dashboard**: `src/app/dashboard/page.tsx`
- **Aktualisierter Invoice Generator**: `src/app/(components)/invoice-generator.tsx`

## 🔄 Workflow-Änderungen

### Alte Rechnungserstellung:
1. CSV hochladen
2. Monatliches Limit prüfen
3. Bei Überschreitung: Fehlermeldung
4. Rechnungen erstellen
5. Monatliche Nutzung inkrementieren

### Neue Rechnungserstellung:
1. CSV hochladen
2. Credit-Guthaben prüfen
3. Bei unzureichenden Credits: Fehlermeldung mit Kauf-Option
4. Rechnungen erstellen
5. Credits dekrementieren

## 💳 Credit-Pakete

Die folgenden Standard-Pakete sind verfügbar:
- **Starter Paket**: 500 Credits für 7,99€
- **Professional Paket**: 1000 Credits für 9,99€
- **Business Paket**: 3000 Credits für 19,99€

## 🧪 Tests nach der Migration

### 1. Benutzer-Credits prüfen
```sql
SELECT * FROM user_credits WHERE user_id = 'YOUR_USER_ID';
```

### 2. Standard-Pakete prüfen
```sql
SELECT * FROM credit_packages WHERE is_active = true;
```

### 3. Frontend testen
1. Dashboard aufrufen → Credit-Übersicht sollte angezeigt werden
2. `/credits` Seite aufrufen → Credit-Management sollte funktionieren
3. Rechnungserstellung testen → Credit-Validierung sollte funktionieren

## 🔧 Troubleshooting

### Problem: "Credits not found" Fehler
**Lösung**: Führen Sie die User-Credits-Initialisierung erneut aus:
```sql
INSERT INTO public.user_credits (user_id, credits)
SELECT id, 30 FROM public.users 
WHERE id NOT IN (SELECT user_id FROM public.user_credits)
ON CONFLICT (user_id) DO NOTHING;
```

### Problem: Credit-Pakete werden nicht angezeigt
**Lösung**: Prüfen Sie, ob die Pakete erstellt wurden:
```sql
SELECT * FROM credit_packages;
```

### Problem: Credit-Funktionen funktionieren nicht
**Lösung**: Prüfen Sie die RPC-Berechtigungen:
```sql
GRANT EXECUTE ON FUNCTION public.use_credits(UUID, INTEGER, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(UUID, INTEGER, TEXT, UUID) TO authenticated;
```

## 📝 Entfernte Features

Die folgenden Dateien/Funktionen werden nicht mehr benötigt:
- `UsageService.canCreateInvoices()` 
- `UsageService.incrementUsage()`
- Monatliche Limit-Validierung im InvoiceGenerator
- `user_monthly_usage` Tabelle (kann optional beibehalten werden für Statistiken)

## ⚠️ Wichtige Hinweise

1. **Bestehende Benutzer**: Alle erhalten automatisch 30 kostenlose Credits
2. **PayPal-Integration**: Aktuell simuliert - echte PayPal-Integration muss separat implementiert werden
3. **Credits verfallen nicht**: Im Gegensatz zum alten monatlichen System
4. **Rückwärtskompatibilität**: Das alte `user_monthly_usage` System bleibt funktional für Statistiken
5. **Performance**: Credit-Abfragen sind optimiert durch Indizes

## 🎯 Nächste Schritte

1. **PayPal-Integration**: Echte Zahlungsabwicklung implementieren
2. **Admin-Panel**: Verwaltung von Credit-Paketen und Transaktionen
3. **Bulk-Credits**: Für Enterprise-Kunden
4. **Credit-Expiry**: Optional, falls gewünscht
5. **Refund-System**: Für Rückerstattungen

## 📞 Support

Bei Fragen oder Problemen:
1. Prüfen Sie die Konsole auf Fehlermeldungen
2. Überprüfen Sie die Supabase-Logs
3. Stellen Sie sicher, dass alle RLS-Policies aktiv sind

Die Migration ist abgeschlossen! 🎉

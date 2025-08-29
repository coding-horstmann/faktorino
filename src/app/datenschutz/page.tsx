
export default function DatenschutzPage() {
  return (
    <div className="prose dark:prose-invert max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1>Datenschutzerklärung</h1>
      
      <p><strong>Datenschutzhinweise gemäß Art. 12 ff. DSGVO</strong></p>
      
      <h2>1. Verantwortlicher</h2>
      <p>
        faktorino – Niklas Maximilian Heinrich Horstmann<br/>
        Ückendorfer Straße 95<br/>
        45886 Gelsenkirchen<br/>
        Deutschland<br/>
        E-Mail: kontakt@faktorino.de
      </p>

      <h2>2. Erhebung und Verarbeitung personenbezogener Daten</h2>
      <p>Wir verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung unserer Dienste erforderlich ist.</p>

      <h3>a) Benutzerkonto</h3>
      <p>
        <strong>Erhobene Daten:</strong> Name, E-Mail-Adresse, Passwort (verschlüsselt)<br/>
        <strong>Zweck:</strong> Registrierung, Nutzung und Verwaltung des Accounts
      </p>

      <h3>b) Rechnungsdaten</h3>
      <p>
        <strong>Erhobene Daten:</strong> Kundendaten, Bestelldetails (aus hochgeladenen CSV-Dateien)<br/>
        <strong>Zweck:</strong> Erstellung von Rechnungen im Auftrag des Nutzers
      </p>
      <p><em>Hinweis: Der Nutzer ist für die rechtliche Zulässigkeit der Verarbeitung der in den CSV-Dateien enthaltenen Daten verantwortlich.</em></p>

      <h3>c) Zahlungsdaten</h3>
      <p>
        Zahlungsabwicklung ausschließlich über PayPal<br/>
        Verantwortlicher für die Verarbeitung der Zahlungsdaten ist PayPal (Europe) S.à r.l. et Cie, S.C.A.
      </p>

      <h3>d) Kommunikations- und Marketingdaten</h3>
      <p>
        Einsatz von Google Analytics, Google Ads und Google Search Console zur Analyse und Optimierung der Website<br/>
        E-Mail-Kommunikation über Brevo (Sendinblue)
      </p>

      <h2>3. Hosting</h2>
      <p>Unsere Dienste werden über Vercel (Vercel Inc.) mit Serverstandorten in der Europäischen Union bereitgestellt.</p>

      <h2>4. Rechtsgrundlagen</h2>
      <p>Die Verarbeitung erfolgt auf Basis von:</p>
      <ul>
        <li>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</li>
        <li>Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse, z. B. Betrieb und Sicherheit der Website, Marketing)</li>
        <li>Art. 6 Abs. 1 lit. c DSGVO (gesetzliche Verpflichtungen)</li>
      </ul>

      <h2>5. Weitergabe an Dritte</h2>
      <p>Eine Weitergabe der Daten erfolgt nur an:</p>
      <ul>
        <li>Zahlungsdienstleister (PayPal)</li>
        <li>Hostinganbieter (Vercel)</li>
        <li>Marketing- und Analysetools (Google, Brevo)</li>
      </ul>
      <p>Eine Übermittlung in Drittländer erfolgt nur, wenn ein angemessenes Datenschutzniveau gemäß Art. 44 ff. DSGVO gewährleistet ist (z. B. EU-Standardvertragsklauseln).</p>

      <h2>6. Speicherdauer</h2>
      <p>Daten werden nur so lange gespeichert, wie es für den jeweiligen Zweck erforderlich ist. Benutzerkonten können jederzeit gelöscht werden. Rechnungsdaten verbleiben im Account des Nutzers und können von diesem jederzeit entfernt werden.</p>

      <h2>7. Betroffenenrechte</h2>
      <p>Nutzer haben das Recht auf:</p>
      <ul>
        <li>Auskunft (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO)</li>
        <li>Löschung (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch (Art. 21 DSGVO)</li>
      </ul>
      <p>Anfragen sind an kontakt@faktorino.de zu richten.</p>

      <h2>8. Datensicherheit</h2>
      <p>Wir setzen technische und organisatorische Maßnahmen ein, um personenbezogene Daten gegen Verlust, Manipulation und unbefugten Zugriff zu schützen.</p>

      <h2>9. Beschwerderecht</h2>
      <p>Betroffene Personen haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen.</p>
    </div>
  );
}

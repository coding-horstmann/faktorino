
export default function ImpressumPage() {
  return (
    <div className="prose dark:prose-invert max-w-3xl mx-auto">
      <h1>Impressum</h1>
      
      <h2>Angaben gemäß § 5 TMG</h2>
      <p>
        Max Mustermann<br/>
        Musterstraße 123<br/>
        12345 Musterstadt
      </p>
      
      <h2>Kontakt</h2>
      <p>
        Telefon: +49 (0) 123 456789<br/>
        E-Mail: max.mustermann@example.com
      </p>

      <h2>Umsatzsteuer-ID</h2>
      <p>
        Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br/>
        DE123456789
      </p>

      <h2>Redaktionell verantwortlich</h2>
      <p>
        Max Mustermann<br/>
        Anschrift wie oben
      </p>
    </div>
  );
}

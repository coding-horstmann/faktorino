export default function HinweisZurNutzungPage() {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="prose dark:prose-invert">
        <h1>Hinweis zur Nutzung</h1>
        
        <p>
          Dieses Tool dient ausschließlich der Unterstützung bei der Rechnungserstellung. 
          Es ersetzt keine steuerliche oder rechtliche Beratung. Für die Richtigkeit, 
          Vollständigkeit und rechtliche Gültigkeit der erstellten Rechnungen ist 
          allein der Nutzer verantwortlich. Das Tool unterstützt das One-Stop-Shop Verfahren nicht.
        </p>

        <h2>Wichtige Hinweise</h2>
        
        <ul>
          <li>
            <strong>Keine Rechtsberatung:</strong> Die Nutzung dieses Tools stellt keine 
            steuerliche oder rechtliche Beratung dar.
          </li>
          <li>
            <strong>Eigene Verantwortung:</strong> Der Nutzer ist für die Richtigkeit 
            und Vollständigkeit der erstellten Rechnungen verantwortlich.
          </li>
          <li>
            <strong>Rechtliche Gültigkeit:</strong> Die rechtliche Gültigkeit der 
            Rechnungen liegt in der Verantwortung des Nutzers.
          </li>
        </ul>

        <h2>Empfehlung</h2>
        
        <p>
          Bei Unsicherheiten bezüglich der steuerlichen oder rechtlichen Aspekte 
          Ihrer Rechnungen empfehlen wir die Konsultation eines Steuerberaters 
          oder Rechtsanwalts.
        </p>
      </div>
    </div>
  );
}

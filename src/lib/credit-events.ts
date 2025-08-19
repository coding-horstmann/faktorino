/**
 * Credit Event System für Echtzeit-Updates der Credit-Anzeigen
 */

export const CreditEvents = {
  /**
   * Löst ein Credit-Update-Event aus, um alle Credit-Anzeigen zu aktualisieren
   */
  triggerCreditUpdate: () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('creditUpdated'));
    }
  },

  /**
   * Löst ein Event aus mit spezifischen Credit-Informationen
   */
  triggerCreditChange: (data: { userId: string; newCredits: number; change: number }) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('creditChanged', { detail: data }));
    }
  }
};

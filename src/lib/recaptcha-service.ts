/**
 * Client-seitiger Service für reCAPTCHA-Verifizierung
 */

interface VerifyRecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  error?: string;
}

export async function verifyRecaptchaToken(
  token: string, 
  action: string
): Promise<VerifyRecaptchaResponse> {
  try {
    const response = await fetch('/api/verify-recaptcha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, action }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fehler bei reCAPTCHA Verifizierung:', error);
    return {
      success: false,
      error: 'Netzwerk-Fehler bei reCAPTCHA Verifizierung'
    };
  }
}

/**
 * Hilfsfunktion für die komplette reCAPTCHA-Verarbeitung
 * Führt reCAPTCHA aus und verifiziert das Token
 */
export async function executeAndVerifyRecaptcha(
  executeRecaptcha: (action: string) => Promise<string | null>,
  action: string
): Promise<{ success: boolean; error?: string; score?: number }> {
  // reCAPTCHA Token generieren
  const token = await executeRecaptcha(action);
  
  if (!token) {
    return {
      success: false,
      error: 'reCAPTCHA Token konnte nicht generiert werden'
    };
  }

  // Token verifizieren
  const verification = await verifyRecaptchaToken(token, action);
  
  if (!verification.success) {
    return {
      success: false,
      error: verification.error || 'reCAPTCHA Verifizierung fehlgeschlagen'
    };
  }

  return {
    success: true,
    score: verification.score
  };
}

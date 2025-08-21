import { NextRequest, NextResponse } from 'next/server';

interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { token, action } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'reCAPTCHA Token fehlt' },
        { status: 400 }
      );
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY ist nicht konfiguriert');
      return NextResponse.json(
        { success: false, error: 'reCAPTCHA ist nicht konfiguriert' },
        { status: 500 }
      );
    }

    // reCAPTCHA Token mit Google verifizieren
    const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const verificationResponse = await fetch(verificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const verificationData: RecaptchaResponse = await verificationResponse.json();

    // Erfolgreiche Verifizierung prüfen
    if (verificationData.success) {
      // Für reCAPTCHA v3: Score prüfen (0.0 = Bot, 1.0 = Mensch)
      const score = verificationData.score || 0;
      const minScore = 0.5; // Anpassbar je nach Sicherheitsanforderungen

      if (score >= minScore) {
        return NextResponse.json({
          success: true,
          score,
          action: verificationData.action,
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'reCAPTCHA Score zu niedrig',
          score,
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'reCAPTCHA Verifizierung fehlgeschlagen',
        errors: verificationData['error-codes'],
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Fehler bei reCAPTCHA Verifizierung:', error);
    return NextResponse.json(
      { success: false, error: 'Server-Fehler bei reCAPTCHA Verifizierung' },
      { status: 500 }
    );
  }
}

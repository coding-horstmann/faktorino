import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'E-Mail-Adresse erforderlich' },
        { status: 400 }
      );
    }

    console.log('Sending test email to:', email);

    const result = await EmailService.sendTestEmail(email);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test-E-Mail erfolgreich gesendet'
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Fehler beim Senden der Test-E-Mail' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in test-email:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}

// GET für einfachen Test ohne Parameter
export async function GET() {
  return NextResponse.json({
    message: 'E-Mail Test Endpoint bereit. Verwende POST mit { "email": "test@example.com" }',
    endpoints: {
      test: 'POST /api/test-email',
      body: '{ "email": "your-email@example.com" }'
    }
  });
}

import * as brevo from '@getbrevo/brevo';

// Brevo API Client Setup
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || '');

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface SendEmailParams {
  to: {
    email: string;
    name?: string;
  };
  templateData: {
    userName: string;
    creditsAdded: number;
    newBalance: number;
    purchaseAmount: string;
    transactionId: string;
    date: string;
  };
}

export class EmailService {
  /**
   * Erstellt HTML-Template für Credit-Bestätigung
   */
  private static createCreditConfirmationTemplate(data: SendEmailParams['templateData']): EmailTemplate {
    const subject = `Bestätigung: ${data.creditsAdded} Credits erfolgreich gekauft`;
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Credit-Kauf Bestätigung</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
            margin: -20px -20px 20px -20px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }

        .content {
            padding: 20px 0;
        }
        .highlight-box {
            background-color: #f8f9fa;
            border: 2px solid #28a745;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
        .credit-amount {
            font-size: 32px;
            font-weight: bold;
            color: #28a745;
            margin: 10px 0;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .details-table th,
        .details-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .details-table th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 14px;
        }

    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="width: 80px; height: 80px; margin: 0 auto 15px auto; background: #FF9700; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; color: white;">✓</div>
            <h1>Credit-Kauf erfolgreich!</h1>
        </div>
        
        <div class="content">
            <p>Hallo <strong>${data.userName}</strong>,</p>
            
            <p>vielen Dank für Ihren Kauf! Ihre Credits wurden erfolgreich Ihrem Konto hinzugefügt.</p>
            
            <div class="highlight-box">
                <h3>Gekaufte Credits</h3>
                <div class="credit-amount">${data.creditsAdded} Credits</div>
            </div>
            
            <h3>Transaktionsdetails</h3>
            <table class="details-table">
                <tr>
                    <th>Kaufbetrag:</th>
                    <td>${data.purchaseAmount}</td>
                </tr>
                <tr>
                    <th>Credits erhalten:</th>
                    <td>${data.creditsAdded}</td>
                </tr>
                <tr>
                    <th>Transaktions-ID:</th>
                    <td>${data.transactionId}</td>
                </tr>
                <tr>
                    <th>Datum:</th>
                    <td>${data.date}</td>
                </tr>
            </table>
            
            <p>Sie können Ihre Credits jetzt für die Rechnungserstellung verwenden.</p>
            <p>Sie werden zeitnah eine Rechnung von uns per E-Mail erhalten.</p>
        </div>
        
        <div class="footer">
            <p>Bei Fragen wenden Sie sich gerne an unseren Support.</p>
            <p>Vielen Dank für Ihr Vertrauen!</p>
        </div>
    </div>
</body>
</html>`;

    const textContent = `
Hallo ${data.userName},

vielen Dank für Ihren Credit-Kauf!

TRANSAKTIONSDETAILS:
- Gekaufte Credits: ${data.creditsAdded}
- Kaufbetrag: ${data.purchaseAmount}
- Transaktions-ID: ${data.transactionId}
- Datum: ${data.date}

Ihre Credits wurden erfolgreich Ihrem Konto hinzugefügt und stehen sofort zur Verfügung.

Sie werden zeitnah eine Rechnung von uns per E-Mail erhalten.

Bei Fragen wenden Sie sich gerne an unseren Support.

Vielen Dank für Ihr Vertrauen!
`;

    return {
      subject,
      htmlContent,
      textContent
    };
  }

  /**
   * Sendet Bestätigungs-E-Mail nach Credit-Kauf
   */
  static async sendCreditPurchaseConfirmation(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
    try {
      if (!process.env.BREVO_API_KEY) {
        console.error('BREVO_API_KEY nicht gesetzt');
        return { success: false, error: 'E-Mail Service nicht konfiguriert' };
      }

      if (!process.env.BREVO_SENDER_EMAIL || !process.env.BREVO_SENDER_NAME) {
        console.error('BREVO_SENDER_EMAIL oder BREVO_SENDER_NAME nicht gesetzt');
        return { success: false, error: 'Sender-Konfiguration fehlt' };
      }

      const template = this.createCreditConfirmationTemplate(params.templateData);

      const sendSmtpEmail = new brevo.SendSmtpEmail();
      sendSmtpEmail.subject = template.subject;
      sendSmtpEmail.htmlContent = template.htmlContent;
      sendSmtpEmail.textContent = template.textContent;
      sendSmtpEmail.sender = {
        name: process.env.BREVO_SENDER_NAME,
        email: process.env.BREVO_SENDER_EMAIL
      };
      sendSmtpEmail.to = [{
        email: params.to.email,
        name: params.to.name || params.templateData.userName
      }];

      console.log('Sending credit confirmation email to:', params.to.email);
      
      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
      
      console.log('Email sent successfully:', result.response?.data);
      
      return { success: true };

    } catch (error) {
      console.error('Fehler beim Senden der E-Mail:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler beim E-Mail-Versand' 
      };
    }
  }

  /**
   * Test-E-Mail senden (für Debugging)
   */
  static async sendTestEmail(toEmail: string): Promise<{ success: boolean; error?: string }> {
    return this.sendCreditPurchaseConfirmation({
      to: { email: toEmail, name: 'Test User' },
      templateData: {
        userName: 'Test User',
        creditsAdded: 100,
        newBalance: 250,
        purchaseAmount: '€9.99',
        transactionId: 'TEST_12345',
        date: new Date().toLocaleDateString('de-DE')
      }
    });
  }
}

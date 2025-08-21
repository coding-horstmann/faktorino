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

export interface AdminNotificationParams {
  userEmail: string;
  userName: string;
  userBillingData: {
    company?: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    vatNumber?: string;
  };
  purchaseData: {
    creditsAdded: number;
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

  /**
   * Erstellt HTML-Template für Admin-Benachrichtigung
   */
  private static createAdminNotificationTemplate(data: AdminNotificationParams): EmailTemplate {
    const subject = `Neuer Credit-Kauf: ${data.userName} - ${data.purchaseData.creditsAdded} Credits`;
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neuer Credit-Kauf</title>
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
            <h1>Neuer Credit-Kauf</h1>
        </div>
        
        <div class="content">
            <p>Ein neuer Credit-Kauf wurde erfolgreich abgeschlossen.</p>
            
            <div class="highlight-box">
                <h3>Kaufdetails</h3>
                <div class="credit-amount">${data.purchaseData.creditsAdded} Credits</div>
                <p>Kaufbetrag: <strong>${data.purchaseData.purchaseAmount}</strong></p>
            </div>
            
                         <h3>Kundendaten</h3>
             <table class="details-table">
                 <tr>
                     <th>Name:</th>
                     <td>${data.userName}</td>
                 </tr>
                 <tr>
                     <th>E-Mail:</th>
                     <td>${data.userEmail}</td>
                 </tr>
                 ${data.userBillingData.company && data.userBillingData.company.trim() ? `<tr><th>Firma:</th><td>${data.userBillingData.company}</td></tr>` : ''}
                 ${data.userBillingData.firstName && data.userBillingData.firstName.trim() ? `<tr><th>Vorname:</th><td>${data.userBillingData.firstName}</td></tr>` : ''}
                 ${data.userBillingData.lastName && data.userBillingData.lastName.trim() ? `<tr><th>Nachname:</th><td>${data.userBillingData.lastName}</td></tr>` : ''}
                 ${data.userBillingData.address && data.userBillingData.address.trim() ? `<tr><th>Adresse:</th><td>${data.userBillingData.address}</td></tr>` : ''}
                 ${data.userBillingData.city && data.userBillingData.city.trim() ? `<tr><th>Stadt:</th><td>${data.userBillingData.city}</td></tr>` : ''}
                 ${data.userBillingData.postalCode && data.userBillingData.postalCode.trim() ? `<tr><th>PLZ:</th><td>${data.userBillingData.postalCode}</td></tr>` : ''}
                 ${data.userBillingData.country && data.userBillingData.country.trim() ? `<tr><th>Land:</th><td>${data.userBillingData.country}</td></tr>` : ''}
                 ${data.userBillingData.vatNumber && data.userBillingData.vatNumber.trim() ? `<tr><th>USt-IdNr.:</th><td>${data.userBillingData.vatNumber}</td></tr>` : ''}
             </table>
            
            <h3>Transaktionsdetails</h3>
            <table class="details-table">
                <tr>
                    <th>Kaufbetrag:</th>
                    <td>${data.purchaseData.purchaseAmount}</td>
                </tr>
                <tr>
                    <th>Credits erhalten:</th>
                    <td>${data.purchaseData.creditsAdded}</td>
                </tr>
                <tr>
                    <th>Transaktions-ID:</th>
                    <td>${data.purchaseData.transactionId}</td>
                </tr>
                <tr>
                    <th>Datum:</th>
                    <td>${data.purchaseData.date}</td>
                </tr>
            </table>
        </div>
        
        <div class="footer">
            <p>Diese E-Mail wurde automatisch generiert.</p>
        </div>
    </div>
</body>
</html>`;

         const textContent = `
 Neuer Credit-Kauf
 
 KUNDENDATEN:
 - Name: ${data.userName}
 - E-Mail: ${data.userEmail}
 ${data.userBillingData.company && data.userBillingData.company.trim() ? `- Firma: ${data.userBillingData.company}` : ''}
 ${data.userBillingData.firstName && data.userBillingData.firstName.trim() ? `- Vorname: ${data.userBillingData.firstName}` : ''}
 ${data.userBillingData.lastName && data.userBillingData.lastName.trim() ? `- Nachname: ${data.userBillingData.lastName}` : ''}
 ${data.userBillingData.address && data.userBillingData.address.trim() ? `- Adresse: ${data.userBillingData.address}` : ''}
 ${data.userBillingData.city && data.userBillingData.city.trim() ? `- Stadt: ${data.userBillingData.city}` : ''}
 ${data.userBillingData.postalCode && data.userBillingData.postalCode.trim() ? `- PLZ: ${data.userBillingData.postalCode}` : ''}
 ${data.userBillingData.country && data.userBillingData.country.trim() ? `- Land: ${data.userBillingData.country}` : ''}
 ${data.userBillingData.vatNumber && data.userBillingData.vatNumber.trim() ? `- USt-IdNr.: ${data.userBillingData.vatNumber}` : ''}
 
 TRANSAKTIONSDETAILS:
 - Kaufbetrag: ${data.purchaseData.purchaseAmount}
 - Credits erhalten: ${data.purchaseData.creditsAdded}
 - Transaktions-ID: ${data.purchaseData.transactionId}
 - Datum: ${data.purchaseData.date}
 `;

    return {
      subject,
      htmlContent,
      textContent
    };
  }

  /**
   * Sendet Admin-Benachrichtigung nach Credit-Kauf
   */
  static async sendAdminNotification(params: AdminNotificationParams): Promise<{ success: boolean; error?: string }> {
    try {
      if (!process.env.BREVO_API_KEY) {
        console.error('BREVO_API_KEY nicht gesetzt');
        return { success: false, error: 'E-Mail Service nicht konfiguriert' };
      }

      if (!process.env.BREVO_SENDER_EMAIL || !process.env.BREVO_SENDER_NAME) {
        console.error('BREVO_SENDER_EMAIL oder BREVO_SENDER_NAME nicht gesetzt');
        return { success: false, error: 'Sender-Konfiguration fehlt' };
      }

      const template = this.createAdminNotificationTemplate(params);

      const sendSmtpEmail = new brevo.SendSmtpEmail();
      sendSmtpEmail.subject = template.subject;
      sendSmtpEmail.htmlContent = template.htmlContent;
      sendSmtpEmail.textContent = template.textContent;
      sendSmtpEmail.sender = {
        name: process.env.BREVO_SENDER_NAME,
        email: process.env.BREVO_SENDER_EMAIL
      };
      sendSmtpEmail.to = [{
        email: 'kontakt@faktorino.de',
        name: 'Faktorino Support'
      }];

      console.log('Sending admin notification email to: kontakt@faktorino.de');
      
      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
      
      console.log('Admin notification email sent successfully:', result.response?.data);
      
      return { success: true };

    } catch (error) {
      console.error('Fehler beim Senden der Admin-Benachrichtigung:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler beim E-Mail-Versand' 
      };
    }
  }
}

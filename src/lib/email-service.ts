import { supabaseAdmin } from './supabase'

export interface OrderConfirmationData {
  orderId: string
  customerEmail: string
  customerName: string
  packageName: string
  credits: number
  price: number
  orderDate: string
  customerAddress: {
    street: string
    postalCode: string
    city: string
  }
  vatId?: string
}

export class EmailService {
  /**
   * Bestellbestätigung per E-Mail versenden
   */
  static async sendOrderConfirmation(orderData: OrderConfirmationData): Promise<boolean> {
    try {
      // Verwende Next.js API Route für E-Mail-Versand
      const response = await fetch('/api/send-order-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderData }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        console.error('Error sending order confirmation email:', result.error)
        return false
      }

      console.log('Order confirmation email sent successfully:', result)
      return true
    } catch (error) {
      console.error('Failed to send order confirmation email:', error)
      return false
    }
  }

  /**
   * E-Mail-Template für Bestellbestätigung generieren
   */
  static generateOrderConfirmationEmail(orderData: OrderConfirmationData): string {
    const formattedDate = new Date(orderData.orderDate).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const formattedPrice = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(orderData.price)

    return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bestellbestätigung - Credits</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0070ba; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        .highlight { color: #0070ba; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Bestellbestätigung</h1>
            <p>Vielen Dank für Ihren Kauf!</p>
        </div>
        
        <div class="content">
            <p>Sehr geehrte(r) ${orderData.customerName},</p>
            
            <p>vielen Dank für Ihre Bestellung. Wir haben Ihre Anfrage erhalten und werden diese umgehend bearbeiten.</p>
            
            <div class="order-details">
                <h2>Bestelldetails</h2>
                <p><strong>Bestellnummer:</strong> ${orderData.orderId}</p>
                <p><strong>Bestelldatum:</strong> ${formattedDate}</p>
                <p><strong>Paket:</strong> ${orderData.packageName}</p>
                <p><strong>Credits:</strong> ${orderData.credits.toLocaleString('de-DE')}</p>
                <p><strong>Betrag:</strong> <span class="highlight">${formattedPrice}</span></p>
            </div>
            
            <div class="order-details">
                <h2>Rechnungsadresse</h2>
                <p>${orderData.customerName}</p>
                <p>${orderData.customerAddress.street}</p>
                <p>${orderData.customerAddress.postalCode} ${orderData.customerAddress.city}</p>
                ${orderData.vatId ? `<p><strong>USt-IdNr.:</strong> ${orderData.vatId}</p>` : ''}
            </div>
            
            <p><strong>Wichtiger Hinweis:</strong> Eine separate Rechnung wird Ihnen in Kürze per E-Mail zugesendet.</p>
            
            <p>Ihre Credits werden nach erfolgreicher Zahlungsabwicklung automatisch Ihrem Konto gutgeschrieben.</p>
            
            <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
            
            <p>Mit freundlichen Grüßen<br>
            Ihr bishierhingut Team</p>
        </div>
        
        <div class="footer">
            <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
            <p>© 2024 bishierhingut. Alle Rechte vorbehalten.</p>
        </div>
    </div>
</body>
</html>
    `.trim()
  }
}

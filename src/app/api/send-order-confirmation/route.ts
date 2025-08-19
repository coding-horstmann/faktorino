import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface OrderConfirmationData {
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

export async function POST(request: NextRequest) {
  try {
    const { orderData }: { orderData: OrderConfirmationData } = await request.json()

    // Validierung der Eingabedaten
    if (!orderData.customerEmail || !orderData.customerName) {
      return NextResponse.json(
        { success: false, error: 'Missing required order data' },
        { status: 400 }
      )
    }

    // E-Mail-Template generieren
    const emailHtml = generateOrderConfirmationEmail(orderData)

    // E-Mail über kostenlosen Service versenden
    const emailSent = await sendEmailViaFreeService({
      to: orderData.customerEmail,
      subject: `Bestellbestätigung - ${orderData.packageName}`,
      html: emailHtml,
      from: 'noreply@bishierhingut.com'
    })

    if (!emailSent.success) {
      console.error('Failed to send email:', emailSent.error)
      
      // Trotzdem Bestellung in Datenbank speichern
      await saveOrderToDatabase(orderData)
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email could not be sent, but order was saved',
          orderSaved: true 
        },
        { status: 200 }
      )
    }

    // Bestellung in Datenbank speichern
    await saveOrderToDatabase(orderData)

    return NextResponse.json(
      { 
        success: true, 
        message: 'Order confirmation email sent successfully',
        orderSaved: true 
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error in send-order-confirmation API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

async function sendEmailViaFreeService({ to, subject, html, from }: {
  to: string
  subject: string
  html: string
  from: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Option 1: Resend.com (kostenlos bis 100 E-Mails/Monat)
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
          subject,
          html,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        return { success: true }
      } else {
        return {
          success: false,
          error: result.message || 'Resend API error'
        }
      }
    }

    // Option 2: EmailJS (kostenlos bis 200 E-Mails/Monat)
    if (process.env.EMAILJS_PUBLIC_KEY && process.env.EMAILJS_SERVICE_ID) {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_ID,
          user_id: process.env.EMAILJS_PUBLIC_KEY,
          template_params: {
            to_email: to,
            subject: subject,
            message: html,
            from_name: 'bishierhingut'
          }
        }),
      })

      if (response.ok) {
        return { success: true }
      } else {
        return {
          success: false,
          error: 'EmailJS API error'
        }
      }
    }

    // Fallback: Log E-Mail für manuelle Versendung
    console.log('=== ORDER CONFIRMATION EMAIL ===')
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('HTML:', html)
    console.log('===============================')

    return { 
      success: false, 
      error: 'No email service configured - email logged for manual sending' 
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function saveOrderToDatabase(orderData: OrderConfirmationData) {
  try {
    // Bestellung in credit_purchases Tabelle speichern
    const { error } = await supabaseAdmin
      .from('credit_purchases')
      .insert({
        id: orderData.orderId,
        user_id: 'temp-user', // Wird später mit echten User-ID ersetzt
        credits_purchased: orderData.credits,
        price_paid: orderData.price,
        payment_status: 'pending',
        customer_email: orderData.customerEmail,
        customer_name: orderData.customerName,
        customer_address: JSON.stringify(orderData.customerAddress),
        vat_id: orderData.vatId,
        email_sent: true,
        email_sent_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error saving order to database:', error)
    }
  } catch (error) {
    console.error('Error in saveOrderToDatabase:', error)
  }
}

function generateOrderConfirmationEmail(orderData: OrderConfirmationData): string {
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

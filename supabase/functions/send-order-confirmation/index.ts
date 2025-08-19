import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderData }: { orderData: OrderConfirmationData } = await req.json()

    // Validierung der Eingabedaten
    if (!orderData.customerEmail || !orderData.customerName) {
      throw new Error('Missing required order data')
    }

    // E-Mail-Template generieren
    const emailHtml = generateOrderConfirmationEmail(orderData)

    // E-Mail über Resend.com versenden (kostenlos bis 100 E-Mails/Monat)
    const emailResponse = await sendEmailViaResend({
      to: orderData.customerEmail,
      subject: `Bestellbestätigung - ${orderData.packageName}`,
      html: emailHtml,
      from: 'noreply@bishierhingut.com' // Ihre Domain
    })

    if (!emailResponse.success) {
      throw new Error(`Failed to send email: ${emailResponse.error}`)
    }

    // Bestellung in Datenbank als "E-Mail gesendet" markieren
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabaseClient
      .from('credit_purchases')
      .update({ 
        email_sent: true,
        email_sent_at: new Date().toISOString()
      })
      .eq('id', orderData.orderId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Order confirmation email sent successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in send-order-confirmation function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

async function sendEmailViaResend({ to, subject, html, from }: {
  to: string
  subject: string
  html: string
  from: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
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

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to send email'
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
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

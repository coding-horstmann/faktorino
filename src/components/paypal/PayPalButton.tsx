'use client';

import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CreditPackage } from '@/lib/credit-service';
import { Loader2 } from 'lucide-react';

interface PayPalButtonProps {
  creditPackage: CreditPackage;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function PayPalButton({ creditPackage, onSuccess, onError }: PayPalButtonProps) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  console.log('PayPalButton - State:', { isPending, isRejected, creditPackage: creditPackage.name });

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">PayPal wird geladen...</span>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="text-center py-4">
        <div className="text-red-600 mb-4">
          PayPal konnte nicht geladen werden.
        </div>
        <div className="text-sm text-gray-600">
          Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.
        </div>
      </div>
    );
  }

  return (
    <PayPalButtons
      style={{
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
        height: 40,
      }}
      createOrder={async (data, actions) => {
        console.log('PayPal createOrder called for package:', creditPackage.name);
        
        try {
          // Purchase Record in unserer Datenbank erstellen
          const response = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              packageId: creditPackage.id,
              credits: creditPackage.credits,
              price: creditPackage.price_euros,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Fehler beim Erstellen des Kauf-Records');
          }

          const result = await response.json();
          console.log('Purchase record created:', result);

          // PayPal Order erstellen
          const order = await actions.order.create({
            purchase_units: [
              {
                description: `EtsyBuchhalter - ${creditPackage.credits} Credits`,
                amount: {
                  currency_code: 'EUR',
                  value: creditPackage.price_euros.toFixed(2),
                },
                custom_id: result.purchaseId, // Purchase ID für Referenz
              }
            ]
          });

          return order;
        } catch (error) {
          console.error('Error creating order:', error);
          throw error;
        }
      }}
      onApprove={async (data, actions) => {
        console.log('PayPal onApprove called with data:', data);
        setIsProcessing(true);
        
        try {
          if (!actions.order) {
            throw new Error('PayPal actions not available');
          }

          // PayPal-Zahlung direkt über Client erfassen
          const details = await actions.order.capture();
          console.log('PayPal payment captured:', details);
          
          const orderID = data.orderID;
          const payerID = details.payer.payer_id;
          const purchaseId = details.purchase_units[0].custom_id;
          
          // Credits über unsere API hinzufügen
          const response = await fetch('/api/paypal/capture-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderID,
              payerID,
              purchaseId,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Fehler beim Hinzufügen der Credits');
          }

          const result = await response.json();
          console.log('Credits successfully added:', result);

          toast({
            title: "Zahlung erfolgreich!",
            description: `${creditPackage.credits} Credits wurden zu Ihrem Konto hinzugefügt.`,
          });

          if (onSuccess) {
            onSuccess();
          }

          // Weiterleitung zur Erfolgsseite
          setTimeout(() => {
            window.location.href = `/dashboard?payment=success&credits=${creditPackage.credits}&amount=${creditPackage.price_euros}`;
          }, 1500);
          
        } catch (error) {
          console.error('Payment processing error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
          
          toast({
            title: "Fehler bei der Zahlung",
            description: `Die Zahlung konnte nicht abgeschlossen werden: ${errorMessage}`,
            variant: "destructive",
          });
          
          if (onError) {
            onError(errorMessage);
          }
        } finally {
          setIsProcessing(false);
        }
      }}
      onError={(err) => {
        console.error('PayPal error:', err);
        
        toast({
          title: "PayPal Fehler",
          description: "Es ist ein Fehler bei der Zahlung aufgetreten. Bitte versuchen Sie es erneut.",
          variant: "destructive",
        });

        if (onError) {
          onError('PayPal payment error');
        }
      }}
      onCancel={() => {
        console.log('PayPal payment cancelled by user');
        
        toast({
          title: "Zahlung abgebrochen",
          description: "Die Zahlung wurde von Ihnen abgebrochen.",
        });
      }}
      disabled={isProcessing}
    />
  );
}
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
        <button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          onClick={() => {
            toast({
              title: "PayPal-Integration",
              description: "PayPal-Service ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.",
              variant: "destructive",
            });
          }}
        >
          Jetzt mit PayPal bezahlen (Service nicht verfügbar)
        </button>
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
      createOrder={async () => {
        setIsProcessing(true);
        
        try {
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
            throw new Error(errorData.error || 'Fehler beim Erstellen der Bestellung');
          }

          const data = await response.json();
          return data.orderID;
        } catch (error) {
          console.error('Create order error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
          
          toast({
            title: "Fehler",
            description: `Bestellung konnte nicht erstellt werden: ${errorMessage}`,
            variant: "destructive",
          });
          
          if (onError) {
            onError(errorMessage);
          }
          
          throw error;
        } finally {
          setIsProcessing(false);
        }
      }}
      onApprove={async (data) => {
        setIsProcessing(true);
        
        try {
          console.log('PayPal onApprove data:', data);
          
          // PayPal-Zahlung erfassen
          const captureResponse = await fetch('/api/paypal/capture-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderID: data.orderID,
              payerID: data.payerID,
            }),
          });

          if (!captureResponse.ok) {
            const errorData = await captureResponse.json();
            throw new Error(errorData.error || 'Fehler beim Erfassen der Zahlung');
          }

          const result = await captureResponse.json();
          
          toast({
            title: "Zahlung erfolgreich!",
            description: `${creditPackage.credits} Credits wurden zu Ihrem Konto hinzugefügt.`,
          });

          if (onSuccess) {
            onSuccess();
          }
          
          // Nach erfolgreicher Zahlung zur Bestätigung weiterleiten
          window.location.href = `/dashboard?payment=success&credits=${creditPackage.credits}&amount=${creditPackage.price_euros}`;
          
        } catch (error) {
          console.error('Capture payment error:', error);
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
        toast({
          title: "Zahlung abgebrochen",
          description: "Die Zahlung wurde von Ihnen abgebrochen.",
        });
      }}
      disabled={isProcessing}
    />
  );
}

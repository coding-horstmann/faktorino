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
      <div className="text-center py-4 text-red-600">
        Fehler beim Laden von PayPal. Bitte versuchen Sie es später erneut.
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
        // Die Zahlung wird über die capture-payment Route abgewickelt
        // PayPal leitet automatisch zur return_url weiter
        
        toast({
          title: "Zahlung erfolgreich",
          description: "Sie werden zur Bestätigung weitergeleitet...",
        });

        // Optional: Custom success handling hier
        if (onSuccess) {
          onSuccess();
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

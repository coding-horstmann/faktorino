'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CreditPackage } from '@/lib/credit-service';
import { AlertTriangle } from 'lucide-react';

interface PayPalFallbackProps {
  creditPackage: CreditPackage;
  onError?: (error: string) => void;
}

export function PayPalFallback({ creditPackage, onError }: PayPalFallbackProps) {
  const { toast } = useToast();

  const handleFallbackClick = () => {
    const message = `PayPal-Integration ist nicht verfügbar. 
    
Bitte überprüfen Sie:
1. PayPal-Umgebungsvariablen sind korrekt gesetzt
2. Vercel-Deployment ist aktuell
3. PayPal-Service ist verfügbar

Paket: ${creditPackage.name} (${creditPackage.credits} Credits für ${creditPackage.price_euros.toFixed(2)}€)`;

    toast({
      title: "PayPal nicht verfügbar",
      description: message,
      variant: "destructive",
      duration: 8000,
    });

    if (onError) {
      onError('PayPal service not available');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-amber-600 text-sm">
        <AlertTriangle className="h-4 w-4" />
        <span>PayPal-Service ist momentan nicht verfügbar</span>
      </div>
      
      <Button 
        className="w-full"
        variant="outline"
        onClick={handleFallbackClick}
      >
        PayPal-Problem melden
      </Button>
      
      <div className="text-xs text-muted-foreground text-center">
        {creditPackage.credits} Credits für {creditPackage.price_euros.toFixed(2)}€
      </div>
    </div>
  );
}

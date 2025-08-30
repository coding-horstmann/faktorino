'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CreditService, type CreditPackage } from '@/lib/credit-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PayPalButton } from '@/components/paypal/PayPalButton';
import { PayPalFallback } from '@/components/paypal/PayPalFallback';

interface CreditPurchaseProps {
  onPurchaseComplete?: () => void;
  userCredits?: number;
}

export function CreditPurchase({ onPurchaseComplete, userCredits = 0 }: CreditPurchaseProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  
  // Check if PayPal is configured
  const isPayPalConfigured = !!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  
  console.log('CreditPurchase - PayPal configured:', isPayPalConfigured);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const availablePackages = await CreditService.getAvailablePackages();
      setPackages(availablePackages);
    } catch (error) {
      console.error('Error loading packages:', error);
      toast({
        title: "Fehler",
        description: "Credit-Pakete konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackage = (packageItem: CreditPackage) => {
    if (!user) {
      toast({
        title: "Nicht angemeldet",
        description: "Sie müssen angemeldet sein, um Credits zu kaufen.",
        variant: "destructive"
      });
      return;
    }
    setSelectedPackage(packageItem);
  };

  const handlePayPalSuccess = () => {
    if (onPurchaseComplete) {
      onPurchaseComplete();
    }
    setSelectedPackage(null);
  };

  const handlePayPalError = (error: string) => {
    toast({
      title: "Fehler",
      description: `PayPal-Fehler: ${error}`,
      variant: "destructive"
    });
    setSelectedPackage(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const calculatePricePerCredit = (credits: number, price: number) => {
    return (price / credits).toFixed(4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6 px-1 sm:px-0">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold">Credits kaufen</h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base px-4 sm:px-0">
            Wählen Sie ein Credit-Paket für die Rechnungserstellung
          </p>
          <div className="mt-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              Aktuelle Credits: {userCredits.toLocaleString('de-DE')}
            </Badge>
          </div>
        </div>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>1 Credit = 1 Rechnung</strong><br />
            Credits verfallen nicht und können unbegrenzt verwendet werden.
          </AlertDescription>
        </Alert>

        {!selectedPackage ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pb-4">
            {packages.map((packageItem) => {
              const pricePerCredit = calculatePricePerCredit(packageItem.credits, packageItem.price_euros);
              
              return (
                <Card key={packageItem.id} className="relative">
                  <CardHeader className="text-center">
                    <CardTitle className="text-lg sm:text-xl">{packageItem.name}</CardTitle>
                    <CardDescription>{packageItem.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold">{formatPrice(packageItem.price_euros)}</div>
                      <div className="text-sm text-muted-foreground">
                        {packageItem.credits.toLocaleString('de-DE')} Credits
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ~{pricePerCredit}€ pro Rechnung
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={() => handleSelectPackage(packageItem)}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Auswählen
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>{selectedPackage.name}</CardTitle>
                <CardDescription>
                  {selectedPackage.credits.toLocaleString('de-DE')} Credits für {formatPrice(selectedPackage.price_euros)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isPayPalConfigured ? (
                  <PayPalButton
                    creditPackage={selectedPackage}
                    onSuccess={handlePayPalSuccess}
                    onError={handlePayPalError}
                  />
                ) : (
                  <PayPalFallback
                    creditPackage={selectedPackage}
                    onError={handlePayPalError}
                  />
                )}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setSelectedPackage(null)}
                >
                  Zurück zur Auswahl
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <p>Sichere Zahlung über PayPal • Sofortige Credit-Gutschrift</p>
        </div>
      </div>
  );
}

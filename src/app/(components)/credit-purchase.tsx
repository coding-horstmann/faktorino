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

interface CreditPurchaseProps {
  onPurchaseComplete?: () => void;
  userCredits?: number;
}

export function CreditPurchase({ onPurchaseComplete, userCredits = 0 }: CreditPurchaseProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

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

  const handlePurchase = async (packageItem: CreditPackage) => {
    if (!user) {
      toast({
        title: "Nicht angemeldet",
        description: "Sie müssen angemeldet sein, um Credits zu kaufen.",
        variant: "destructive"
      });
      return;
    }

    setPurchasing(packageItem.id);
    
    try {
      // Create purchase record
      const purchaseResult = await CreditService.createPurchase(
        user.id,
        packageItem.id,
        packageItem.credits,
        packageItem.price_euros
      );

      if (!purchaseResult.success) {
        throw new Error(purchaseResult.error || 'Fehler beim Erstellen des Kaufs');
      }

      // TODO: Hier würde die PayPal-Integration kommen
      // Für jetzt simulieren wir eine erfolgreiche Zahlung
      setTimeout(async () => {
        try {
          const completeResult = await CreditService.completePurchase(purchaseResult.purchaseId!);
          
          if (completeResult.success) {
            toast({
              title: "Kauf erfolgreich",
              description: `Sie haben ${packageItem.credits} Credits für ${packageItem.price_euros.toFixed(2)}€ gekauft.`,
              variant: "default"
            });
            
            if (onPurchaseComplete) {
              onPurchaseComplete();
            }
          } else {
            throw new Error(completeResult.error || 'Fehler beim Abschließen des Kaufs');
          }
        } catch (error) {
          console.error('Error completing purchase:', error);
          toast({
            title: "Fehler",
            description: "Kauf konnte nicht abgeschlossen werden.",
            variant: "destructive"
          });
        } finally {
          setPurchasing(null);
        }
      }, 2000); // Simulation der PayPal-Verarbeitung

    } catch (error) {
      console.error('Error purchasing credits:', error);
      toast({
        title: "Fehler",
        description: "Credits konnten nicht gekauft werden.",
        variant: "destructive"
      });
      setPurchasing(null);
    }
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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Credits kaufen</h2>
        <p className="text-muted-foreground mt-2">
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

      <div className="grid gap-4 md:grid-cols-3">
        {packages.map((packageItem) => {
          const isPurchasing = purchasing === packageItem.id;
          const pricePerCredit = calculatePricePerCredit(packageItem.credits, packageItem.price_euros);
          
          return (
            <Card key={packageItem.id} className="relative">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{packageItem.name}</CardTitle>
                <CardDescription>{packageItem.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{formatPrice(packageItem.price_euros)}</div>
                  <div className="text-sm text-muted-foreground">
                    {packageItem.credits.toLocaleString('de-DE')} Credits
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ~{pricePerCredit}€ pro Credit
                  </div>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={() => handlePurchase(packageItem)}
                  disabled={isPurchasing}
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verarbeitung...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Jetzt kaufen
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>Sichere Zahlung über PayPal • Sofortige Credit-Gutschrift</p>
      </div>
    </div>
  );
}

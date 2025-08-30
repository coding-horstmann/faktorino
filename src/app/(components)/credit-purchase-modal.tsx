'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CreditService, type CreditPackage } from '@/lib/credit-service';
import { PayPalPaymentButtons } from '@/components/paypal/PayPalPaymentButtons';
import Link from 'next/link';

interface PurchaseFormData {
  firstName: string;
  lastName: string;
  street: string;
  postalCode: string;
  city: string;
  vatId: string;
}

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

export function CreditPurchaseModal({ isOpen, onClose, onPurchaseComplete }: CreditPurchaseModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [formData, setFormData] = useState<PurchaseFormData>({
    firstName: '',
    lastName: '',
    street: '',
    postalCode: '',
    city: '',
    vatId: '',
  });
  const [errors, setErrors] = useState<Partial<PurchaseFormData>>({});
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<'packages' | 'form'>('packages');

  console.log('CreditPurchaseModal - Rendering:', { isOpen, currentStep, selectedPackage: selectedPackage?.name });

  useEffect(() => {
    if (isOpen) {
      loadPackages();
    }
  }, [isOpen]);

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
    setCurrentStep('form');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof PurchaseFormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<PurchaseFormData> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Vorname ist erforderlich';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Nachname ist erforderlich';
    }
    if (!formData.street.trim()) {
      newErrors.street = 'Straße und Hausnummer sind erforderlich';
    }
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'PLZ ist erforderlich';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'Stadt ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };



  const handlePayPalSuccess = () => {
    if (onPurchaseComplete) {
      onPurchaseComplete();
    }
    onClose();
  };

  const handlePayPalError = (error: string) => {
    toast({
      title: "Fehler",
      description: `PayPal-Fehler: ${error}`,
      variant: "destructive",
    });
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

  const handleBack = () => {
    if (currentStep === 'form') {
      setCurrentStep('packages');
      setSelectedPackage(null);
    }
  };

  const handleClose = () => {
    setCurrentStep('packages');
    setSelectedPackage(null);
    onClose();
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Lade Credit-Pakete...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto mx-1 sm:mx-4 md:mx-auto w-[calc(100vw-0.5rem)] sm:w-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credits kaufen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-6">
          {currentStep === 'packages' && (
            <>
              <p className="text-gray-600 text-sm sm:text-base px-2 sm:px-0">
                Wählen Sie ein Credit-Paket für die Rechnungserstellung
              </p>

              <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                {packages.map((packageItem) => {
                  const pricePerCredit = calculatePricePerCredit(packageItem.credits, packageItem.price_euros);
                  
                  return (
                    <Card key={packageItem.id} className="relative cursor-pointer hover:shadow-md transition-all" onClick={() => handleSelectPackage(packageItem)}>
                      <CardContent className="p-3 sm:p-4 text-center">
                        <div className="text-base sm:text-lg font-bold">{packageItem.name}</div>
                        <div className="text-xl sm:text-2xl font-bold text-blue-600 my-2">
                          {formatPrice(packageItem.price_euros)}
                        </div>
                        <div className="text-sm text-gray-500 mb-2">
                          {packageItem.credits.toLocaleString('de-DE')} Credits
                        </div>
                        <div className="text-xs text-gray-500">
                          ~{pricePerCredit}€ pro Rechnung
                        </div>
                        <Button className="w-full mt-3" size="sm">
                          Auswählen
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {currentStep === 'form' && selectedPackage && (
            <>
              {/* Zurück Button */}
              <div className="flex justify-start mb-2">
                <Button variant="ghost" onClick={handleBack} className="text-sm p-2">
                  ← Zurück zur Paketauswahl
                </Button>
              </div>

              {/* Bestellübersicht */}
              <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">Bestellübersicht</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-800">{selectedPackage.name}</span>
                    <span className="font-bold text-blue-900">{formatPrice(selectedPackage.price_euros)}</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    {selectedPackage.credits.toLocaleString('de-DE')} Credits • Inkl. MwSt.
                  </div>
                </div>
              </div>

              {/* Datenschutz und AGB Hinweis */}
              <div className="text-xs text-gray-600 text-center">
                Mit dem Kauf erklären Sie sich mit der{' '}
                <Link href="/datenschutz" className="text-blue-600 hover:underline" target="_blank">
                  Datenschutzerklärung
                </Link>
                {' '}und den{' '}
                <Link href="/agb" className="text-blue-600 hover:underline" target="_blank">
                  Allgemeinen Geschäftsbedingungen
                </Link>
                {' '}einverstanden.
              </div>

              {/* Rechnungsdaten */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm sm:text-base">Rechnungsdaten eingeben</h3>
                
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label htmlFor="firstName">Vorname *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={cn(errors.firstName && "border-red-500")}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Nachname *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={cn(errors.lastName && "border-red-500")}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
                    )}
                  </div>

                <div>
                  <Label htmlFor="street">Straße & Hausnummer *</Label>
                  <Input
                    id="street"
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    className={cn(errors.street && "border-red-500")}
                    placeholder="Musterstraße 123"
                  />
                  {errors.street && (
                    <p className="text-sm text-red-500 mt-1">{errors.street}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label htmlFor="postalCode">PLZ *</Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      className={cn(errors.postalCode && "border-red-500")}
                      placeholder="12345"
                    />
                    {errors.postalCode && (
                      <p className="text-sm text-red-500 mt-1">{errors.postalCode}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="city">Stadt *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={cn(errors.city && "border-red-500")}
                      placeholder="Musterstadt"
                    />
                    {errors.city && (
                      <p className="text-sm text-red-500 mt-1">{errors.city}</p>
                    )}
                  </div>

                <div>
                  <Label htmlFor="vatId">USt-IdNr. (optional)</Label>
                  <Input
                    id="vatId"
                    name="vatId"
                    value={formData.vatId}
                    onChange={handleInputChange}
                    placeholder="DE123456789"
                  />
                </div>
              </div>

              {/* PayPal-Zahlungsbuttons */}
              <div className="space-y-4">
                <h3 className="font-semibold">Zahlungsmethode wählen</h3>
                
                <PayPalPaymentButtons
                  creditPackage={selectedPackage}
                  billingData={formData}
                  onSuccess={handlePayPalSuccess}
                  onError={handlePayPalError}
                />
              </div>


            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
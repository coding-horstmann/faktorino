'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { EmailService, type OrderConfirmationData } from '@/lib/email-service';

interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  pricePerCredit: number;
  isPopular?: boolean;
}

interface PurchaseFormData {
  firstName: string;
  lastName: string;
  email: string;
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

const creditPackages: CreditPackage[] = [
  {
    id: 'package-500',
    credits: 500,
    price: 7.99,
    pricePerCredit: 0.016,
  },
  {
    id: 'package-1000',
    credits: 1000,
    price: 9.99,
    pricePerCredit: 0.010,
    isPopular: true,
  },
  {
    id: 'package-3000',
    credits: 3000,
    price: 19.99,
    pricePerCredit: 0.007,
  },
];

export function CreditPurchaseModal({ isOpen, onClose, onPurchaseComplete }: CreditPurchaseModalProps) {
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<string>('package-1000');
  const [formData, setFormData] = useState<PurchaseFormData>({
    firstName: '',
    lastName: '',
    email: '',
    street: '',
    postalCode: '',
    city: '',
    vatId: '',
  });
  const [errors, setErrors] = useState<Partial<PurchaseFormData>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Fehler zurücksetzen wenn Benutzer tippt
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
    if (!formData.email.trim()) {
      newErrors.email = 'E-Mail ist erforderlich';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse';
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

  const handlePurchase = async () => {
    if (!validateForm()) {
      toast({
        title: "Eingabefehler",
        description: "Bitte füllen Sie alle Pflichtfelder korrekt aus.",
        variant: "destructive",
      });
      return;
    }

    const selectedPkg = creditPackages.find(pkg => pkg.id === selectedPackage);
    if (!selectedPkg) return;

    setIsProcessing(true);

    try {
      // Bestell-ID generieren
      const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Bestelldaten für E-Mail vorbereiten
      const orderData: OrderConfirmationData = {
        orderId,
        customerEmail: formData.email,
        customerName: `${formData.firstName} ${formData.lastName}`,
        packageName: `${selectedPkg.credits} Credits`,
        credits: selectedPkg.credits,
        price: selectedPkg.price,
        orderDate: new Date().toISOString(),
        customerAddress: {
          street: formData.street,
          postalCode: formData.postalCode,
          city: formData.city,
        },
        vatId: formData.vatId || undefined,
      };

      // E-Mail-Bestätigung versenden
      const emailSent = await EmailService.sendOrderConfirmation(orderData);
      
      if (emailSent) {
        toast({
          title: "Bestellbestätigung gesendet",
          description: `Eine Bestellbestätigung wurde an ${formData.email} gesendet.`,
        });
      } else {
        toast({
          title: "E-Mail konnte nicht gesendet werden",
          description: "Ihre Bestellung wurde aufgenommen, aber die Bestätigungs-E-Mail konnte nicht versendet werden.",
          variant: "destructive"
        });
      }

      // TODO: Hier würde die echte PayPal-Integration kommen
      // Simulation der PayPal-Weiterleitung
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Weiterleitung zu PayPal",
        description: `Sie werden zu PayPal weitergeleitet für ${selectedPkg.credits} Credits (${selectedPkg.price}€).`,
      });

      // In einer echten Implementierung würde hier die PayPal-Checkout-URL aufgerufen
      if (onPurchaseComplete) {
        onPurchaseComplete();
      }
      onClose();
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Beim Erstellen der Zahlung ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedPkg = creditPackages.find(pkg => pkg.id === selectedPackage);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credits kaufen
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-gray-600">
            Wählen Sie die Anzahl Credits und geben Sie Ihre Daten ein
          </p>

          {/* Credit Pakete auswählen */}
          <div>
            <h3 className="font-semibold mb-4">Credits auswählen</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {creditPackages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedPackage === pkg.id
                      ? "ring-2 ring-blue-500 bg-blue-50"
                      : "hover:bg-gray-50"
                  )}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  <CardContent className="p-4 text-center">
                    {pkg.isPopular && (
                      <Badge className="mb-2" variant="default">
                        Beliebt
                      </Badge>
                    )}
                    <div className="text-lg font-bold">{pkg.credits} Credits</div>
                    <div className="text-2xl font-bold text-blue-600 my-2">
                      {pkg.price}€
                    </div>
                    <div className="text-sm text-gray-500">
                      {pkg.pricePerCredit.toFixed(3)}€ pro Credit
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Formular */}
          <div className="space-y-6">
            {/* Persönliche Daten Sektion */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Vorname *</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={cn(errors.firstName && "border-red-500")}
                    placeholder=""
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
                    placeholder=""
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email">E-Mail *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={cn(errors.email && "border-red-500")}
                  placeholder=""
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email}</p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Bestellübersicht */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-4">Bestellübersicht</h4>
              {selectedPkg && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-800">{selectedPkg.credits} Credits</span>
                    <span className="font-bold text-blue-900">{selectedPkg.price}€</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    Inkl. MwSt. • Sichere PayPal-Zahlung
                  </div>
                </div>
              )}
            </div>

            {/* PayPal Button */}
            <Button
              onClick={handlePurchase}
              disabled={isProcessing}
              className="w-full bg-[#0070ba] hover:bg-[#005ea6] text-white py-3 text-lg font-medium"
            >
              {isProcessing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Wird verarbeitet...
                </>
              ) : (
                                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a.636.636 0 0 1 .609-.74h.896c.524 0 .968.382 1.05.9l1.528 9.696c.082.518-.344.939-.867.939h-4.606a.641.641 0 0 1-.633-.74l1.023-6.475c.082-.518.558-.939 1.082-.939h1.518z"/>
                    </svg>
                    Jetzt mit PayPal bezahlen
                  </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

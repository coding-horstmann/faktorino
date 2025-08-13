'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { InvoiceGenerator } from '@/app/(components)/invoice-generator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Building, CheckCircle, AlertCircle, Image as ImageIcon, Mail, X, CreditCard } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { UserService } from '@/lib/user-service';
import type { UserInfo } from '@/lib/pdf-generator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';


export default function DashboardPage() {

  const { toast } = useToast();
  const { user, userExists, loading } = useAuth();
  const router = useRouter();
  const accordionTriggerRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Debug auth state and check email confirmation
  useEffect(() => {
    console.log('Dashboard: user state changed:', {
      hasUser: !!user,
      userEmail: user?.email,
      userId: user?.id,
      emailConfirmed: !!user?.email_confirmed_at,
      userExists
    });

    // Show email confirmation banner if user is not confirmed
    if (user && !user.email_confirmed_at) {
      setShowEmailBanner(true);
    }

    // Hinweis entfernt: Kein automatischer Redirect bei kurzzeitig fehlendem Profil
  }, [user, userExists, loading, router, toast]);
  
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '',
    address: '',
    city: '',
    taxNumber: '',
    vatId: '',
    taxStatus: 'regular',
    logo: null,
  });

  const [isUserInfoComplete, setIsUserInfoComplete] = useState(false);
  const [showMissingInfoAlert, setShowMissingInfoAlert] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof UserInfo, boolean>>>({});
  const [isTaxIdError, setIsTaxIdError] = useState(false);
  const [showEmailBanner, setShowEmailBanner] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  // Default so Banner erscheint sofort bis echte Daten geladen sind
  const [billingInfo, setBillingInfo] = useState<{ status: string | null, trial_end: string | null, subscription_id?: string | null } | null>({ status: null, trial_end: null, subscription_id: null });
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;

      try {
        const profile = await UserService.getUserProfile(user.id);
        if (profile) {
          const mappedUserInfo: UserInfo = {
            name: profile.name,
            address: profile.address,
            city: profile.city,
            taxNumber: profile.tax_number || '',
            vatId: profile.vat_id || '',
            taxStatus: profile.tax_status,
            logo: profile.logo_url,
          };
          setUserInfo(mappedUserInfo);
          checkUserInfo(mappedUserInfo, false);
        } else {
          setAccordionValue("item-1"); // Open if no data is saved
        }
        // Load billing info
        try {
          const { data } = await supabase
            .from('users')
            .select('subscription_status, trial_end, stripe_subscription_id')
            .eq('id', user.id)
            .single();
          if (data) setBillingInfo({ status: (data as any).subscription_status || null, trial_end: (data as any).trial_end || null, subscription_id: (data as any).stripe_subscription_id || null });
        } catch (e) {
          // keep default which shows subscribe banner for non-abos
        }
      } catch (error) {
        console.error("Could not load user profile from Supabase", error);
        setAccordionValue("item-1");
      }
    };

    loadUserProfile();
  }, [user]);

  const handleUserInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInfo({ ...userInfo, [e.target.name]: e.target.value });
    if (validationErrors[e.target.name as keyof UserInfo]) {
        setValidationErrors({ ...validationErrors, [e.target.name]: false });
    }
    if(isTaxIdError && (e.target.name === 'taxNumber' || e.target.name === 'vatId')) {
        setIsTaxIdError(false);
    }
  };
  
  const handleTaxStatusChange = (value: 'regular' | 'small_business') => {
    setUserInfo({ ...userInfo, taxStatus: value });
  };
  
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB Limit
        toast({
            variant: "destructive",
            title: "Datei zu groß",
            description: "Das Logo darf maximal 2MB groß sein.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserInfo({ ...userInfo, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const saveAndCheckUserInfo = async () => {
    if (!user) return;

    const isComplete = checkUserInfo(userInfo, true);
    if(isComplete) {
      try {
        await UserService.updateUserProfile(user.id, {
          name: userInfo.name,
          address: userInfo.address,
          city: userInfo.city,
          tax_number: userInfo.taxNumber || null,
          vat_id: userInfo.vatId || null,
          tax_status: userInfo.taxStatus,
          logo_url: userInfo.logo,
        });

        toast({
            title: "Gespeichert",
            description: "Ihre Firmendaten wurden erfolgreich übernommen.",
        });
      } catch (error) {
        console.error('Error saving user profile:', error);
        toast({
            variant: "destructive",
            title: "Fehler beim Speichern",
            description: "Ihre Daten konnten nicht gespeichert werden.",
        });
      }
    }
  }

  const checkUserInfo = useCallback((info: UserInfo, showDialog: boolean) => {
    const errors: Partial<Record<keyof UserInfo, boolean>> = {};
    let taxError = false;
    if (!info.name) errors.name = true;
    if (!info.address) errors.address = true;
    if (!info.city) errors.city = true;
    if (!info.taxNumber && !info.vatId) {
        taxError = true;
    }
    setValidationErrors(errors);
    setIsTaxIdError(taxError);

    const isComplete = Object.keys(errors).length === 0 && !taxError;
    setIsUserInfoComplete(isComplete);
    
    if(!isComplete) {
        if(showDialog) {
            setShowMissingInfoAlert(true);
            openAccordionAndFocus();
        }
    }
    return isComplete;
  }, [toast]);
  
  const handleMissingInfo = useCallback(() => {
    return checkUserInfo(userInfo, true);
  }, [userInfo, checkUserInfo]);

  const openAccordionAndFocus = () => {
    setAccordionValue("item-1");
    setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  const handleResendConfirmation = async () => {
    if (!user?.email) return;

    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Die Bestätigungs-E-Mail konnte nicht erneut gesendet werden.",
        });
      } else {
        toast({
          title: "E-Mail gesendet",
          description: "Eine neue Bestätigungs-E-Mail wurde an Ihre E-Mail-Adresse gesendet.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
      });
    } finally {
      setResendLoading(false);
    }
  };

  const startCheckout = async () => {
    try {
      setBillingLoading(true);
      const res = await fetch('/api/stripe/checkout', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url as string;
        return;
      }
      throw new Error(data?.error || 'Checkout fehlgeschlagen');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Fehler', description: e instanceof Error ? e.message : 'Checkout fehlgeschlagen' });
    } finally {
      setBillingLoading(false);
    }
  };

  // Compute trial state and remaining days
  const trialInfo = (() => {
    if (!billingInfo?.trial_end) return { trialActive: false, remainingDays: 0 } as const;
    const end = new Date(billingInfo.trial_end);
    const now = Date.now();
    const trialActive = end.getTime() > now;
    const remainingDays = trialActive ? Math.ceil((end.getTime() - now) / (1000 * 60 * 60 * 24)) : 0;
    return { trialActive, remainingDays } as const;
  })();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      router.replace('/login');
    }
  }, [user, router]);

  return (
    <div className="container mx-auto w-full max-w-6xl space-y-8">

        {showEmailBanner && user && !user.email_confirmed_at && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Mail className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="flex items-center justify-between w-full">
              <div className="flex-1">
                <span className="text-yellow-800 font-medium">E-Mail-Bestätigung ausstehend:</span>
                <span className="text-yellow-700 ml-2">
                  Bitte bestätigen Sie Ihre E-Mail-Adresse ({user.email}), um alle Funktionen zu nutzen.
                </span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  onClick={handleResendConfirmation}
                  disabled={resendLoading}
                  className="h-9 px-3 border border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                >
                  {resendLoading ? "Wird gesendet..." : "E-Mail erneut senden"}
                </Button>
                <Button
                  onClick={() => setShowEmailBanner(false)}
                  className="h-9 px-3 text-yellow-600 hover:bg-yellow-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Trial banner (nur wenn kein aktives Abo und nicht eingeloggt) */}
        {user && billingInfo && billingInfo.status !== 'active' && !billingInfo.subscription_id && (billingInfo.status === 'trialing' || trialInfo.trialActive) && (
          <Alert className="border-blue-200 bg-blue-50">
            <CreditCard className="h-4 w-4 text-blue-600" />
            <AlertDescription className="flex items-center justify-between w-full">
              <div className="flex-1">
                <span className="text-blue-800 font-medium">Kostenloser Test aktiv</span>
                <span className="text-blue-700 ml-2">
                  Noch {trialInfo.remainingDays} Tag{trialInfo.remainingDays === 1 ? '' : 'e'} verbleibend. Sichern Sie sich nahtlosen Zugang, indem Sie jetzt Ihr Abo starten.
                </span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  onClick={startCheckout}
                  disabled={billingLoading}
                  className="h-9 px-3 border border-blue-300 text-white bg-blue-600 hover:bg-blue-700"
                >
                  Jetzt abonnieren
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Billing banner (no access) nur ohne aktives Abo */}
        {user && billingInfo && (!billingInfo.status || (billingInfo.status !== 'active' && billingInfo.status !== 'trialing')) && (
          <Alert className="border-blue-200 bg-blue-50">
            <CreditCard className="h-4 w-4 text-blue-600" />
            <AlertDescription className="flex items-center justify-between w-full">
              <div className="flex-1">
                <span className="text-blue-800 font-medium">Abo erforderlich:</span>
                <span className="text-blue-700 ml-2">
                  Starten Sie jetzt Ihr Abo für 4,99 € / Monat, um alle Funktionen zu nutzen.
                </span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  onClick={startCheckout}
                  disabled={billingLoading}
                  className="h-9 px-3 border border-blue-300 text-white bg-blue-600 hover:bg-blue-700"
                >
                  Jetzt abonnieren
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <Accordion type="single" collapsible className="w-full" value={accordionValue} onValueChange={setAccordionValue}>
          <AccordionItem value="item-1">
            <AccordionTrigger ref={accordionTriggerRef}>
                 <div className="flex items-center gap-2 text-lg">
                    {isUserInfoComplete ? <CheckCircle className="text-green-500"/> : <AlertCircle className="text-destructive"/>}
                    Ihre Firmendaten für Rechnungen
                </div>
            </AccordionTrigger>
            <AccordionContent>
              <Card ref={formRef}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building className="text-primary"/>
                        Rechnungssteller-Informationen
                    </CardTitle>
                    <CardDescription>
                        Diese Daten erscheinen auf jeder generierten Rechnung als Absender. Bitte füllen Sie alle mit * markierten Felder aus.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="name">Ihr Name / Firmenname *</Label>
                        <Input id="name" name="name" value={userInfo.name} onChange={handleUserInfoChange} placeholder="Max Mustermann" className={cn({'border-destructive': validationErrors.name})}/>
                     </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Ihre Straße & Hausnummer *</Label>
                        <Input id="address" name="address" value={userInfo.address} onChange={handleUserInfoChange} placeholder="Musterstraße 123" className={cn({'border-destructive': validationErrors.address})}/>
                     </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">PLZ & Stadt *</Label>
                        <Input id="city" name="city" value={userInfo.city} onChange={handleUserInfoChange} placeholder="12345 Musterstadt" className={cn({'border-destructive': validationErrors.city})}/>
                     </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxNumber">Steuernummer</Label>
                        <Input id="taxNumber" name="taxNumber" value={userInfo.taxNumber} onChange={handleUserInfoChange} placeholder="123/456/7890" className={cn({'border-yellow-500': isTaxIdError})}/>
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="vatId">Umsatzsteuer-IdNr.</Label>
                        <Input id="vatId" name="vatId" value={userInfo.vatId} onChange={handleUserInfoChange} placeholder="DE123456789" className={cn({'border-yellow-500': isTaxIdError})}/>
                        <p className={cn("text-xs text-muted-foreground", {'text-yellow-600 font-semibold': isTaxIdError})}>Mindestens eines der beiden Felder (Steuernummer oder USt-IdNr.) muss ausgefüllt werden.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Besteuerungsart *</Label>
                        <RadioGroup defaultValue="regular" onValueChange={handleTaxStatusChange} value={userInfo.taxStatus}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="regular" id="r1" />
                            <Label htmlFor="r1">Umsatzsteuerpflichtig</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="small_business" id="r2" />
                            <Label htmlFor="r2">Kleinunternehmer (§ 19 UStG)</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="logo">Ihr Logo (max. 2MB)</Label>
                        <div className="flex items-center gap-4">
                           {userInfo.logo && <img src={userInfo.logo} alt="Logo Preview" className="h-16 w-16 object-contain border p-1 rounded-md" />}
                          <Input id="logo" name="logo" type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} className="max-w-xs" />
                        </div>
                      </div>
                     <Button onClick={saveAndCheckUserInfo}>
                        Speichern
                     </Button>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <InvoiceGenerator userInfo={userInfo} isUserInfoComplete={isUserInfoComplete} onMissingInfo={handleMissingInfo} onUserInfoSave={saveAndCheckUserInfo} />

        <AlertDialog open={showMissingInfoAlert} onOpenChange={setShowMissingInfoAlert}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Fehlende Angaben</AlertDialogTitle>
                    <AlertDialogDescription>
                        Bitte füllen Sie alle mit * markierten Pflichtfelder im Bereich "Ihre Firmendaten" aus und speichern Sie diese, um Rechnungen erstellen zu können. Die fehlenden Felder sind markiert.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => { setShowMissingInfoAlert(false); }}>Verstanden</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}

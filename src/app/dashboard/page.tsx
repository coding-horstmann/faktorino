
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { InvoiceGenerator } from '@/app/(components)/invoice-generator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Building, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { UserInfo } from '@/lib/pdf-generator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';


export default function DashboardPage() {
  
  const { toast } = useToast();
  const accordionTriggerRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  
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

  useEffect(() => {
    try {
        const savedUserInfo = localStorage.getItem('userInfo');
        if (savedUserInfo) {
            const parsedInfo = JSON.parse(savedUserInfo);
            setUserInfo(parsedInfo);
            checkUserInfo(parsedInfo, false);
        } else {
             setAccordionValue("item-1"); // Open if no data is saved
        }
    } catch (error) {
        console.error("Could not load user info from localStorage", error);
    }
  }, []);

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
  
  const saveAndCheckUserInfo = () => {
    checkUserInfo(userInfo, true);
  }

  const checkUserInfo = useCallback((info: UserInfo, showToast: boolean) => {
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
    
    if(isComplete) {
        try {
            localStorage.setItem('userInfo', JSON.stringify(info));
            if(showToast) {
                toast({
                    title: "Gespeichert",
                    description: "Ihre Firmendaten wurden erfolgreich übernommen.",
                });
            }
            setAccordionValue(""); // close accordion on successful save
        } catch (error) {
             console.error("Could not save user info to localStorage", error);
             if(showToast) {
                 toast({
                    variant: "destructive",
                    title: "Fehler beim Speichern",
                    description: "Ihre Daten konnten nicht lokal gespeichert werden.",
                });
             }
        }
    } else {
        if(showToast) {
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

  return (
    <div className="container mx-auto w-full max-w-6xl space-y-8">
        
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

        <InvoiceGenerator userInfo={userInfo} isUserInfoComplete={isUserInfoComplete} onMissingInfo={handleMissingInfo} />

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

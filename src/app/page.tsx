
'use client';

import { useState, useEffect, useCallback } from 'react';
import { InvoiceGenerator } from '@/app/(components)/invoice-generator';
import { EtsyFeeParser } from '@/app/(components)/etsy-fee-parser';
import { PayoutValidator, ValidationResultDisplay } from '@/app/(components)/payout-validator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FileText, FileSignature, Upload, Building, CheckCircle, AlertCircle } from 'lucide-react';
import type { UserInfo } from '@/lib/pdf-generator';
import type { BankTransaction } from '@/app/actions';

export default function Home() {
  
  const [validationResult, setValidationResult] = useState({
    grossInvoices: null as number | null,
    totalFees: null as number | null,
    payoutAmount: null as number | null,
    expectedPayout: null as number | null,
    difference: null as number | null,
  });

  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);

  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '',
    address: '',
    city: '',
    taxInfo: '',
    taxStatus: 'regular',
  });
  const [isUserInfoComplete, setIsUserInfoComplete] = useState(false);

  const handleUserInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInfo({ ...userInfo, [e.target.name]: e.target.value });
  };
  
  const handleTaxStatusChange = (value: 'regular' | 'small_business') => {
    setUserInfo({ ...userInfo, taxStatus: value });
  };

  const checkUserInfo = () => {
    if(userInfo.name && userInfo.address && userInfo.city && userInfo.taxInfo) {
      setIsUserInfoComplete(true);
    } else {
        alert("Bitte füllen Sie alle Pflichtangaben für die Rechnungsstellung aus.");
    }
  }

  const handleInvoicesGenerated = useCallback((gross: number) => {
    setValidationResult(prev => {
        if (prev.grossInvoices === gross) return prev;
        const newGross = gross;
        const newExpected = (newGross !== null && prev.totalFees !== null) ? newGross + prev.totalFees : null;
        const newDifference = (prev.payoutAmount !== null && newExpected !== null) ? prev.payoutAmount - newExpected : null;
        return {
          ...prev, 
          grossInvoices: newGross,
          expectedPayout: newExpected,
          difference: newDifference,
        };
    });
  }, []);
  
  const handleFeesParsed = useCallback((fees: number) => {
    setValidationResult(prev => {
        const negativeFees = -fees;
        if (prev.totalFees === negativeFees) return prev;
        const newExpected = (prev.grossInvoices !== null && negativeFees !== null) ? prev.grossInvoices + negativeFees : null;
        const newDifference = (prev.payoutAmount !== null && newExpected !== null) ? prev.payoutAmount - newExpected : null;
        return {
          ...prev, 
          totalFees: negativeFees,
          expectedPayout: newExpected,
          difference: newDifference,
        };
    });
  }, []);
  
  const handlePayoutValidated = useCallback((payout: number | null, result: any, transactions: BankTransaction[]) => {
     setValidationResult(prev => {
         if (JSON.stringify(prev) === JSON.stringify(result)) return prev;
         return result;
     });
     setBankTransactions(transactions);
  }, []);

  const isStep1Complete = validationResult.grossInvoices !== null;
  const isStep2Complete = validationResult.totalFees !== null;
  const isStep3Complete = validationResult.payoutAmount !== null;

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full max-w-4xl space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold font-headline text-primary">EtsyBuchhalter</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Ihr smartes Tool für die automatisierte Etsy-Buchhaltung.
          </p>
        </header>
        
        <Accordion type="single" collapsible className="w-full" defaultValue={isUserInfoComplete ? undefined : "item-1"}>
          <AccordionItem value="item-1">
            <AccordionTrigger>
                 <div className="flex items-center gap-2 text-lg">
                    {isUserInfoComplete ? <CheckCircle className="text-green-500"/> : <AlertCircle className="text-destructive"/>}
                    Pflichtangaben für Rechnungen
                </div>
            </AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building className="text-primary"/>
                        Ihre Firmendaten
                    </CardTitle>
                    <CardDescription>
                        Diese Daten erscheinen auf jeder generierten Rechnung als Absender. Bitte füllen Sie alle Felder aus.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="name">Ihr Name / Firmenname</Label>
                        <Input id="name" name="name" value={userInfo.name} onChange={handleUserInfoChange} placeholder="Max Mustermann"/>
                     </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Ihre Straße & Hausnummer</Label>
                        <Input id="address" name="address" value={userInfo.address} onChange={handleUserInfoChange} placeholder="Musterstraße 123"/>
                     </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">PLZ & Stadt</Label>
                        <Input id="city" name="city" value={userInfo.city} onChange={handleUserInfoChange} placeholder="12345 Musterstadt"/>
                     </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxInfo">Steuernummer oder USt-IdNr.</Label>
                        <Input id="taxInfo" name="taxInfo" value={userInfo.taxInfo} onChange={handleUserInfoChange} placeholder="DE123456789"/>
                     </div>
                      <div className="space-y-2">
                        <Label>Besteuerungsart</Label>
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
                     <Button onClick={checkUserInfo} disabled={!userInfo.name || !userInfo.address || !userInfo.city || !userInfo.taxInfo}>
                        Angaben speichern & übernehmen
                     </Button>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Tabs defaultValue="step1" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="step1">
                <div className="flex items-center gap-2">
                    {isStep1Complete ? <CheckCircle className="text-green-500"/> : <FileText />}
                    Etsy-Rechnungen erstellen
                </div>
            </TabsTrigger>
            <TabsTrigger value="step2">
                <div className="flex items-center gap-2">
                    {isStep2Complete ? <CheckCircle className="text-green-500"/> : <FileSignature />}
                    Etsy-Gebühren
                </div>
            </TabsTrigger>
            <TabsTrigger value="step3">
                <div className="flex items-center gap-2">
                     {isStep3Complete ? <CheckCircle className="text-green-500"/> : <Upload/>}
                    Kontoauszug hochladen
                </div>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="step1" className="mt-6">
            <InvoiceGenerator onInvoicesGenerated={handleInvoicesGenerated} userInfo={userInfo} />
          </TabsContent>
          <TabsContent value="step2" className="mt-6">
            <EtsyFeeParser onFeesParsed={handleFeesParsed} />
          </TabsContent>
          <TabsContent value="step3" className="mt-6">
            <PayoutValidator 
              grossInvoices={validationResult.grossInvoices} 
              totalFees={validationResult.totalFees} 
              onPayoutValidated={handlePayoutValidated}
            />
          </TabsContent>
        </Tabs>
        
        <ValidationResultDisplay result={validationResult} />


        <footer className="text-center mt-8 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} EtsyBuchhalter. Alle Rechte vorbehalten.</p>
        </footer>
      </div>
    </main>
  );
}

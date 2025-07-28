
'use client';

import { useState } from 'react';
import { InvoiceGenerator } from '@/app/(components)/invoice-generator';
import { EtsyFeeParser } from '@/app/(components)/etsy-fee-parser';
import { PayoutValidator } from '@/app/(components)/payout-validator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, FileSignature, Scale, CheckCircle, Circle } from 'lucide-react';


export default function Home() {
  const [grossInvoices, setGrossInvoices] = useState<number | null>(null);
  const [totalFees, setTotalFees] = useState<number | null>(null);

  const handleInvoicesGenerated = (gross: number) => {
    setGrossInvoices(gross);
  };
  
  const handleFeesParsed = (fees: number) => {
    setTotalFees(fees);
  };

  const isStep1Complete = grossInvoices !== null;
  const isStep2Complete = totalFees !== null;

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full max-w-4xl space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold font-headline text-primary">EtsyBuchhalter</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Ihr smartes Tool für die automatisierte Etsy-Buchhaltung.
          </p>
        </header>
        
        <Tabs defaultValue="step1" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="step1">
                <div className="flex items-center gap-2">
                    {isStep1Complete ? <CheckCircle className="text-green-500"/> : <FileText />}
                    Schritt 1: Rechnungen
                </div>
            </TabsTrigger>
            <TabsTrigger value="step2" disabled={!isStep1Complete}>
                <div className="flex items-center gap-2">
                    {isStep2Complete ? <CheckCircle className="text-green-500"/> : <FileSignature />}
                    Schritt 2: Gebühren
                </div>
            </TabsTrigger>
            <TabsTrigger value="step3">
                <div className="flex items-center gap-2">
                     <Scale/>
                    Schritt 3: Prüfung
                </div>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="step1" className="mt-6">
            <InvoiceGenerator onInvoicesGenerated={handleInvoicesGenerated} />
          </TabsContent>
          <TabsContent value="step2" className="mt-6">
            <EtsyFeeParser onFeesParsed={handleFeesParsed} />
          </TabsContent>
          <TabsContent value="step3" className="mt-6">
            <PayoutValidator grossInvoices={grossInvoices} totalFees={totalFees} />
          </TabsContent>
        </Tabs>

        <footer className="text-center mt-8 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} EtsyBuchhalter. Alle Rechte vorbehalten.</p>
        </footer>
      </div>
    </main>
  );
}

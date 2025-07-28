
import { InvoiceGenerator } from '@/app/(components)/invoice-generator';
import { EtsyFeeParser } from '@/app/(components)/etsy-fee-parser';
import { PayoutValidator } from '@/app/(components)/payout-validator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, FileSignature, Scale } from 'lucide-react';


export default function Home() {
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
                <FileText className="mr-2"/>
                Schritt 1: Rechnungen
            </TabsTrigger>
            <TabsTrigger value="step2">
                <FileSignature className="mr-2"/>
                Schritt 2: Gebühren
            </TabsTrigger>
            <TabsTrigger value="step3">
                <Scale className="mr-2"/>
                Schritt 3: Prüfung
            </TabsTrigger>
          </TabsList>
          <TabsContent value="step1" className="mt-6">
            <InvoiceGenerator />
          </TabsContent>
          <TabsContent value="step2" className="mt-6">
            <EtsyFeeParser />
          </TabsContent>
          <TabsContent value="step3" className="mt-6">
            <PayoutValidator />
          </TabsContent>
        </Tabs>

        <footer className="text-center mt-8 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} EtsyBuchhalter. Alle Rechte vorbehalten.</p>
        </footer>
      </div>
    </main>
  );
}

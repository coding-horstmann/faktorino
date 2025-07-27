
import { InvoiceGenerator } from '@/app/(components)/invoice-generator';
import { EtsyFeeParser } from '@/app/(components)/etsy-fee-parser';
import { PayoutValidator } from '@/app/(components)/payout-validator';


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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
                <InvoiceGenerator />
            </div>
            <div className="space-y-8">
                <EtsyFeeParser />
                <PayoutValidator />
            </div>
        </div>
        <footer className="text-center mt-8 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} EtsyBuchhalter. Alle Rechte vorbehalten.</p>
        </footer>
      </div>
    </main>
  );
}

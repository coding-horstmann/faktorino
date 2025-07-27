import { ValidationTool } from '@/app/(components)/validation-tool';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full max-w-2xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold font-headline text-primary">EtsyBuchhalter</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Ihr smartes Tool für die automatisierte Etsy-Buchhaltung.
          </p>
        </header>
        <ValidationTool />
        <footer className="text-center mt-8 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} EtsyBuchhalter. Alle Rechte vorbehalten.</p>
        </footer>
      </div>
    </main>
  );
}

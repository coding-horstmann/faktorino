
'use client';

import Link from 'next/link';
import { BookCopy } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="border-t py-6 md:py-8">
      <div className="container grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex flex-col gap-2">
            <Link href="/" className="flex items-center space-x-2 mb-2">
                <BookCopy className="h-6 w-6 text-primary" />
                <span className="inline-block font-bold">EtsyBuchhalter</span>
            </Link>
            <p className="text-sm text-muted-foreground">
                Ihr smartes Tool für die automatisierte Etsy-Buchhaltung.
            </p>
            <a href="mailto:kontakt@etsybuchhalter.de" className="text-sm hover:underline">
                kontakt@etsybuchhalter.de
            </a>
        </div>
        
        <div className="flex flex-col gap-2 text-sm">
            <h4 className="font-semibold">Navigation</h4>
            <Link href="/register" className="text-muted-foreground hover:underline">Registrieren</Link>
            <Link href="/login" className="text-muted-foreground hover:underline">Anmelden</Link>
            <Link href="/kontakt" className="text-muted-foreground hover:underline">Kontakt</Link>
        </div>

        <div className="flex flex-col gap-2 text-sm">
            <h4 className="font-semibold">Rechtliches</h4>
            <Link href="/impressum" className="text-muted-foreground hover:underline">Impressum</Link>
            <Link href="/datenschutz" className="text-muted-foreground hover:underline">Datenschutzerklärung</Link>
            <Link href="/agb" className="text-muted-foreground hover:underline">AGB</Link>
        </div>

      </div>
       <div className="container mt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} EtsyBuchhalter. Alle Rechte vorbehalten.
        </div>
    </footer>
  );
}

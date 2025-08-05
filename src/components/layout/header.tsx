
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookCopy, UserCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function SiteHeader() {
  const isLoggedIn = true;

  return (
    <header className="bg-background/95 backdrop-blur-sm sticky top-0 z-40 w-full border-b">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center space-x-2 mr-auto">
            <BookCopy className="h-6 w-6 text-primary" />
            <span className="inline-block font-bold">EtsyBuchhalter</span>
        </Link>
        
        <nav className="flex items-center space-x-2">
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full">
                    <UserCircle className="h-5 w-5" />
                    <span className="sr-only">Nutzermenü öffnen</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Mein Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                   <DropdownMenuItem asChild>
                     <Link href="/account-settings">Kontoeinstellungen</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                     {/* Dieser Link würde später direkt zur Stripe Billing Seite führen */}
                     <a href="#" target="_blank">Abo & Rechnungen</a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Abmelden</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Anmelden</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">14 Tage kostenlos testen</Link>
                </Button>
              </>
            )}
          </nav>
      </div>
    </header>
  );
}

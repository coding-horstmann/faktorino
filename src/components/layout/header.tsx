'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookCopy, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function SiteHeader() {
  const { user, signOut } = useAuth();

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await signOut();
  };

  return (
    <header className="bg-background/95 backdrop-blur-sm sticky top-0 z-40 w-full border-b">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center space-x-2 mr-auto">
            <BookCopy className="h-6 w-6 text-primary" />
            <span className="inline-block font-bold">EtsyBuchhalter</span>
        </Link>
        
        <nav className="flex items-center space-x-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full bg-blue-600 text-white hover:bg-blue-700">
                    <UserCircle className="h-5 w-5" />
                    <span className="sr-only">Nutzermenü öffnen</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Mein Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Rechnungen erstellen</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account-settings">Abo & Einstellungen</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>Abmelden</DropdownMenuItem>
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

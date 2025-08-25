'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BookCopy, UserCircle, FileText, CreditCard, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await signOut();
    setIsMobileMenuOpen(false);
  };

  // Generiere Initialen aus dem Benutzernamen oder E-Mail
  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(' ');
      return names.map(name => name[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'DU';
  };

  const MobileMenu = () => (
    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="text-left">Menü</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {user ? (
            <>
              <div className="p-4 border-b">
                <h3 className="text-base font-semibold text-gray-900">Ihr Account</h3>
                <p className="text-sm text-gray-600 mt-1">{user.email}</p>
              </div>
              <div className="space-y-2">
                <Link 
                  href="/dashboard" 
                  className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span>Rechnungen erstellen</span>
                </Link>
                <Link 
                  href="/account-settings" 
                  className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <CreditCard className="h-4 w-4 text-gray-600" />
                  <span>Credits & Einstellungen</span>
                </Link>
                <div className="border-t pt-2 mt-4">
                  <button 
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors w-full text-left"
                  >
                    <LogOut className="h-4 w-4 text-gray-600" />
                    <span>Abmelden</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <Link 
                href="/login" 
                className="flex items-center justify-center w-full px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Anmelden
              </Link>
              <Link 
                href="/register" 
                className="flex items-center justify-center w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Jetzt kostenlos testen
              </Link>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <header className="bg-background/95 backdrop-blur-sm sticky top-0 z-40 w-full border-b">
      <div className="container flex h-16 items-center">
        <Link prefetch href="/" className="flex items-center space-x-2 mr-auto">
            <img 
              src="/images/logo.svg" 
              alt="faktorino Logo" 
              className="h-12 w-auto"
            />
            <span className="inline-block font-bold uppercase text-xl text-black">FAKTORINO</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 bg-purple-600 text-white hover:bg-purple-700 p-0">
                    <span className="text-sm font-medium">{getInitials()}</span>
                    <span className="sr-only">Nutzermenü öffnen</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-0">
                  <div className="p-4 border-b">
                    <DropdownMenuLabel className="text-base font-semibold text-gray-900">
                      Ihr Account
                    </DropdownMenuLabel>
                    <p className="text-sm text-gray-600 mt-1">
                      {user.email}
                    </p>
                  </div>
                  <div className="p-2">
                    <DropdownMenuItem asChild className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                      <Link prefetch href="/dashboard" className="flex items-center gap-3 w-full">
                        <FileText className="h-4 w-4 text-gray-600" />
                        <span>Rechnungen erstellen</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                      <Link prefetch href="/account-settings" className="flex items-center gap-3 w-full">
                        <CreditCard className="h-4 w-4 text-gray-600" />
                        <span>Credits & Einstellungen</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuItem 
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 text-gray-600" />
                      <span>Abmelden</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link prefetch href="/login">Anmelden</Link>
                </Button>
                <Button asChild>
                  <Link prefetch href="/register">Jetzt kostenlos testen</Link>
                </Button>
              </>
            )}
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(true)}
            className="h-10 w-10"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menü öffnen</span>
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu />
    </header>
  );
}

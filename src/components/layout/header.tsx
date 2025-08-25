'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BookCopy, UserCircle, FileText, CreditCard, LogOut } from 'lucide-react';
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
  const router = useRouter();

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await signOut();
    // router.push('/') entfernt - wird in AuthContext mit window.location.replace gehandhabt
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

  return (
    <header className="bg-background/95 backdrop-blur-sm sticky top-0 z-40 w-full border-b">
      <div className="container flex h-16 items-center">
        <Link prefetch href="/" className="flex items-center space-x-2 mr-auto">
            <img 
              src="/images/logo.svg" 
              alt="EtsyBuchhalter Logo" 
              className="h-12 w-auto"
            />
            <span className="inline-block font-bold uppercase text-xl text-black">FAKTORINO</span>
        </Link>
        
        <nav className="flex items-center space-x-2">
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
                <Button asChild variant="ghost">
                  <Link prefetch href="/login">Anmelden</Link>
                </Button>
                <Button asChild>
                  <Link prefetch href="/register">Jetzt kostenlos testen</Link>
                </Button>
              </>
            )}
          </nav>
      </div>
    </header>
  );
}

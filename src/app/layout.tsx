import type {Metadata} from 'next';
import { Toaster } from "@/components/ui/toaster";
import './globals.css';
import { SiteHeader } from '@/components/layout/header';
import { SiteFooter } from '@/components/layout/footer';
import { AuthProvider } from '@/contexts/AuthContext';
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })


export const metadata: Metadata = {
  title: 'EtsyBuchhalter',
  description: 'Ihr smartes Tool für die automatisierte Etsy-Buchhaltung.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={inter.variable}>
      <head/>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <AuthProvider>
          <SiteHeader />
          <main className="flex-grow flex justify-center items-start p-4 sm:p-8 md:p-12">
              {children}
          </main>
          <SiteFooter />
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}

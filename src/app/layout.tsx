import type {Metadata} from 'next';
import { Toaster } from "@/components/ui/toaster";
import './globals.css';
import { SiteHeader } from '@/components/layout/header';
import { SiteFooter } from '@/components/layout/footer';
import { AuthProvider } from '@/contexts/AuthContext';
import { PayPalProvider } from '@/components/paypal/PayPalProvider';
import ReCaptchaProvider from '@/components/recaptcha/ReCaptchaProvider';
import { CookieProvider, CookieBanner, CookieSettings, CookieManager } from '@/components/cookie';
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })


export const metadata: Metadata = {
  title: 'Etsy Rechnungen automatisch erstellen | faktorino Rechnungstool',
  description: 'Mit faktorino erstellen Sie Etsy Rechnungen in wenigen Sekunden. CSV hochladen, Daten eingeben und fertige Rechnungen als PDF herunterladen – schnell, einfach und effizient.',
  metadataBase: new URL('https://faktorino.de'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    title: 'Etsy Rechnungen automatisch erstellen | faktorino Rechnungstool',
    description: 'Mit faktorino erstellen Sie Etsy Rechnungen in wenigen Sekunden. CSV hochladen, Daten eingeben und fertige Rechnungen als PDF herunterladen – schnell, einfach und effizient.',
    url: 'https://faktorino.de',
    siteName: 'faktorino',
    type: 'website',
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Etsy Rechnungen automatisch erstellen | faktorino Rechnungstool',
    description: 'Mit faktorino erstellen Sie Etsy Rechnungen in wenigen Sekunden. CSV hochladen, Daten eingeben und fertige Rechnungen als PDF herunterladen – schnell, einfach und effizient.',
  },
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
          <PayPalProvider>
            <ReCaptchaProvider>
              <CookieProvider>
                <SiteHeader />
                <main className="flex-grow flex justify-center items-start p-4 sm:p-8 md:p-12">
                    {children}
                </main>
                <SiteFooter />
                <CookieBanner />
                <CookieSettings />
                <CookieManager />
              </CookieProvider>
            </ReCaptchaProvider>
          </PayPalProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}

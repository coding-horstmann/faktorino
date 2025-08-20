'use client';

import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { ReactNode } from 'react';

interface PayPalProviderProps {
  children: ReactNode;
}

export function PayPalProvider({ children }: PayPalProviderProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  console.log('PayPalProvider - Client ID:', clientId ? `SET (${clientId.substring(0, 8)}...)` : 'MISSING');
  console.log('PayPalProvider - Environment:', process.env.NODE_ENV);
  console.log('PayPalProvider - PayPal Environment:', process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT || 'auto-detected');

  if (!clientId) {
    console.warn('PayPal Client ID not configured, falling back to children only');
    return <>{children}</>;
  }

  // Bestimme die PayPal-Umgebung basierend auf der NEXT_PUBLIC_PAYPAL_ENVIRONMENT-Variable
  const getPayPalEnvironment = () => {
    // Neue Umgebungsvariable hat Vorrang
    if (process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === 'live') {
      return 'production';
    }
    if (process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === 'sandbox') {
      return 'sandbox';
    }
    
    // Fallback auf Client ID-basierte Erkennung
    const isLiveEnvironment = clientId.startsWith('AV') || clientId.startsWith('AR') || clientId.startsWith('AS');
    return isLiveEnvironment ? 'production' : 'sandbox';
  };

  const paypalEnvironment = getPayPalEnvironment();
  
  console.log('PayPalProvider - Final PayPal Environment:', paypalEnvironment);

  const initialOptions: any = {
    clientId: clientId,
    currency: 'EUR',
    intent: 'capture',
    components: 'buttons',
    env: paypalEnvironment, // Wichtig: Setze die PayPal-Umgebung
    'data-sdk-integration-source': 'react-paypal-js'
  };

  // Debug-Modus nur für Sandbox
  if (paypalEnvironment === 'sandbox') {
    initialOptions.debug = true;
  }

  console.log('PayPalProvider - Final Options:', {
    clientId: clientId.substring(0, 8) + '...',
    env: paypalEnvironment,
    debug: paypalEnvironment === 'sandbox'
  });

  return (
    <PayPalScriptProvider options={initialOptions}>
      {children}
    </PayPalScriptProvider>
  );
}

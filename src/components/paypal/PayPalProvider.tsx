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

  if (!clientId) {
    console.warn('PayPal Client ID not configured, falling back to children only');
    return <>{children}</>;
  }

  // WICHTIG: Keine explizite env-Option setzen.
  // PayPal entscheidet die Umgebung (sandbox/live) anhand der Client ID.
  const initialOptions: any = {
    clientId: clientId,
    currency: 'EUR',
    intent: 'capture',
    components: 'buttons',
    'data-sdk-integration-source': 'react-paypal-js'
  };

  // Optionaler Debug-Modus nur in Development
  if (process.env.NODE_ENV !== 'production') {
    initialOptions.debug = true;
  }

  console.log('PayPalProvider - Final Options:', {
    clientId: clientId.substring(0, 8) + '...',
    debug: process.env.NODE_ENV !== 'production'
  });

  return (
    <PayPalScriptProvider options={initialOptions}>
      {children}
    </PayPalScriptProvider>
  );
}

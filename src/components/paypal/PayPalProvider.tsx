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

  // Bestimme automatisch die richtige Umgebung basierend auf der Client ID
  // Sandbox Client IDs beginnen meist mit "AQ", "AB", "Ae" usw.
  // Live Client IDs beginnen meist mit "AV", "AR", "AS" usw.
  const isLiveEnvironment = clientId.startsWith('AV') || clientId.startsWith('AR') || clientId.startsWith('AS');
  
  console.log('PayPalProvider - Detected environment:', isLiveEnvironment ? 'live' : 'sandbox');

  const initialOptions = {
    clientId: clientId,
    currency: 'EUR',
    intent: 'capture',
    components: 'buttons',
    // Setze die richtige Umgebung
    'data-sdk-integration-source': 'react-paypal-js'
  };

  // Für Live-Umgebung explizit setzen
  if (isLiveEnvironment) {
    initialOptions.debug = false;
  }

  return (
    <PayPalScriptProvider options={initialOptions}>
      {children}
    </PayPalScriptProvider>
  );
}

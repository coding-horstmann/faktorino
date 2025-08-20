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

  const initialOptions = {
    'clientId': clientId,
    'currency': 'EUR',
    'intent': 'capture',
    'locale': 'de_DE',
    'components': 'buttons,funding-eligibility',
    'enable-funding': 'venmo,paylater,card',
    'disable-funding': '',
  };

  return (
    <PayPalScriptProvider options={initialOptions}>
      {children}
    </PayPalScriptProvider>
  );
}

'use client';

import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { ReactNode } from 'react';

interface PayPalProviderProps {
  children: ReactNode;
}

export function PayPalProvider({ children }: PayPalProviderProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!clientId) {
    console.error('PayPal Client ID not configured');
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

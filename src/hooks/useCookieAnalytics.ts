'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalytics } from '@/components/cookie';

// Hook für automatisches Page-View Tracking
export function useCookieAnalytics() {
  const { trackPageView } = useAnalytics();
  const router = useRouter();

  useEffect(() => {
    // Page View beim ersten Laden tracken
    trackPageView(window.location.pathname);

    // Page View bei Navigation tracken
    const handleRouteChange = (url: string) => {
      trackPageView(url);
    };

    // Next.js Router Events (falls verfügbar)
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        trackPageView(window.location.pathname);
      });
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', () => {
          trackPageView(window.location.pathname);
        });
      }
    };
  }, [trackPageView]);

  return { trackPageView };
}

// Utility-Funktionen für spezifische Events
export function useCookieEventTracking() {
  const { trackEvent } = useAnalytics();

  const trackRegistration = () => {
    trackEvent('registration', 'user_engagement');
  };

  const trackLogin = () => {
    trackEvent('login', 'user_engagement');
  };

  const trackInvoiceGeneration = (count: number) => {
    trackEvent('invoice_generated', 'business', 'invoice_count', count);
  };

  const trackCreditPurchase = (amount: number) => {
    trackEvent('credit_purchase', 'ecommerce', 'purchase_amount', amount);
  };

  const trackFeatureUsage = (feature: string) => {
    trackEvent('feature_used', 'user_engagement', feature);
  };

  return {
    trackRegistration,
    trackLogin,
    trackInvoiceGeneration,
    trackCreditPurchase,
    trackFeatureUsage,
  };
}

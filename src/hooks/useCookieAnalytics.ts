'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalytics } from '@/components/cookie';
import { useCookies } from '@/contexts/CookieContext';

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

  const trackEmailConfirmation = () => {
    trackEvent('email_confirmed', 'user_engagement');
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
    trackEmailConfirmation,
    trackInvoiceGeneration,
    trackCreditPurchase,
    trackFeatureUsage,
  };
}

// Spezielle Hook für Google Ads Conversion-Tracking
export function useGoogleAdsConversion() {
  const { preferences, hasConsented } = useCookies();

  const trackGoogleAdsConversion = (conversionName: string, value?: number, currency: string = 'EUR') => {
    if (hasConsented && preferences.marketing && typeof window !== 'undefined' && window.gtag) {
      const conversionData: any = {
        send_to: `${process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}/AW-17515355179/${conversionName}`
      };
      
      if (value) {
        conversionData.value = value;
        conversionData.currency = currency;
      }
      
      window.gtag('event', 'conversion', conversionData);
    }
  };

  return { trackGoogleAdsConversion };
}

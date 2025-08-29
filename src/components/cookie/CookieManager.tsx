'use client';

import { useEffect } from 'react';
import { useCookies } from '@/contexts/CookieContext';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export function CookieManager() {
  const { preferences, hasConsented } = useCookies();

  // Google Analytics laden (nur wenn Analytics aktiviert ist)
  useEffect(() => {
    if (hasConsented && preferences.analytics) {
      loadGoogleAnalytics();
    }
  }, [hasConsented, preferences.analytics]);

  // Google Ads laden (nur wenn Marketing aktiviert ist)
  useEffect(() => {
    if (hasConsented && preferences.marketing) {
      loadGoogleAds();
    }
  }, [hasConsented, preferences.marketing]);

  return null; // Diese Komponente rendert nichts
}

function loadGoogleAnalytics() {
  // Google Analytics Script laden
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`;
  document.head.appendChild(script);

  // Google Analytics initialisieren
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
    anonymize_ip: true,
    cookie_flags: 'SameSite=None;Secure'
  });
}

function loadGoogleAds() {
  // Google Ads Script laden (falls benötigt)
  if (process.env.NEXT_PUBLIC_GOOGLE_ADS_ID) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}`;
    document.head.appendChild(script);

    window.gtag('config', process.env.NEXT_PUBLIC_GOOGLE_ADS_ID, {
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure'
    });
  }
}

// Hook für Analytics-Events
export function useAnalytics() {
  const { preferences, hasConsented } = useCookies();

  const trackEvent = (action: string, category: string, label?: string, value?: number) => {
    console.log('📊 Analytics trackEvent called:', {
      action,
      category,
      label,
      value,
      hasConsented,
      analyticsEnabled: preferences.analytics,
      gtagAvailable: !!window.gtag,
      timestamp: new Date().toISOString()
    });
    
    if (hasConsented && preferences.analytics && window.gtag) {
      console.log('📊 Sending event to Google Analytics:', action);
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value
      });
      console.log('📊 Event sent successfully');
    } else {
      console.warn('📊 Event NOT sent - missing requirements:', {
        hasConsented,
        analyticsEnabled: preferences.analytics,
        gtagAvailable: !!window.gtag
      });
    }
  };

  const trackPageView = (url: string) => {
    if (hasConsented && preferences.analytics && window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
        page_path: url
      });
    }
  };

  return { trackEvent, trackPageView };
}

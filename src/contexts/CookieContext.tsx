'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  email: boolean;
}

interface CookieContextType {
  preferences: CookiePreferences;
  updatePreferences: (newPreferences: Partial<CookiePreferences>) => void;
  hasConsented: boolean;
  showBanner: boolean;
  setShowBanner: (show: boolean) => void;
  openSettings: () => void;
  closeSettings: () => void;
  isSettingsOpen: boolean;
}

const defaultPreferences: CookiePreferences = {
  necessary: true, // Immer aktiv
  analytics: false,
  marketing: false,
  email: false,
};

const CookieContext = createContext<CookieContextType | undefined>(undefined);

export function CookieProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);
  const [hasConsented, setHasConsented] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Beim ersten Laden prüfen, ob bereits Einverständnis gegeben wurde
  useEffect(() => {
    const savedPreferences = localStorage.getItem('cookie-preferences');
    const consentGiven = localStorage.getItem('cookie-consent-given');
    
    if (savedPreferences) {
      const parsed = JSON.parse(savedPreferences);
      setPreferences(parsed);
      setHasConsented(true);
    } else {
      // Banner anzeigen, wenn noch keine Einverständnis gegeben wurde
      setShowBanner(true);
    }
  }, []);

  const updatePreferences = (newPreferences: Partial<CookiePreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    localStorage.setItem('cookie-preferences', JSON.stringify(updated));
    localStorage.setItem('cookie-consent-given', 'true');
    setHasConsented(true);
    setShowBanner(false);
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  return (
    <CookieContext.Provider
      value={{
        preferences,
        updatePreferences,
        hasConsented,
        showBanner,
        setShowBanner,
        openSettings,
        closeSettings,
        isSettingsOpen,
      }}
    >
      {children}
    </CookieContext.Provider>
  );
}

export function useCookies() {
  const context = useContext(CookieContext);
  if (context === undefined) {
    throw new Error('useCookies must be used within a CookieProvider');
  }
  return context;
}

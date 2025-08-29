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
    // Robustere localStorage-Überprüfung
    const loadCookiePreferences = () => {
      try {
        const savedPreferences = localStorage.getItem('cookie-preferences');
        const consentGiven = localStorage.getItem('cookie-consent-given');
        
        console.log('🍪 Loading cookie preferences:', { savedPreferences, consentGiven }); // Debug
        
        if (savedPreferences && consentGiven === 'true') {
          const parsed = JSON.parse(savedPreferences);
          console.log('🍪 Parsed preferences:', parsed); // Debug
          setPreferences(parsed);
          setHasConsented(true);
          setShowBanner(false);
        } else {
          console.log('🍪 No saved preferences found, showing banner'); // Debug
          // Banner anzeigen, wenn noch keine Einverständnis gegeben wurde
          setShowBanner(true);
        }
      } catch (error) {
        console.error('🍪 Error loading cookie preferences:', error);
        // Bei Fehlern Banner anzeigen
        setShowBanner(true);
      }
    };

    // Kleiner Delay um sicherzustellen dass localStorage verfügbar ist
    if (typeof window !== 'undefined') {
      setTimeout(loadCookiePreferences, 100);
    }
  }, []);

  const updatePreferences = (newPreferences: Partial<CookiePreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    console.log('🍪 Updating preferences:', updated); // Debug
    
    setPreferences(updated);
    
    try {
      localStorage.setItem('cookie-preferences', JSON.stringify(updated));
      localStorage.setItem('cookie-consent-given', 'true');
      setHasConsented(true);
      setShowBanner(false);
      console.log('🍪 Preferences saved successfully'); // Debug
    } catch (error) {
      console.error('🍪 Error saving cookie preferences:', error);
    }
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

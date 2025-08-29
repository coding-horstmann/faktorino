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

// Helper-Funktion um localStorage synchron zu laden
const getInitialCookieState = () => {
  if (typeof window === 'undefined') {
    return {
      preferences: defaultPreferences,
      hasConsented: false,
      showBanner: false
    };
  }
  
  try {
    const savedPreferences = localStorage.getItem('cookie-preferences');
    const consentGiven = localStorage.getItem('cookie-consent-given');
    
    if (savedPreferences && consentGiven === 'true') {
      const parsed = JSON.parse(savedPreferences);
      console.log('🍪 Initial state: preferences loaded from localStorage:', parsed);
      return {
        preferences: parsed,
        hasConsented: true,
        showBanner: false
      };
    }
  } catch (error) {
    console.error('🍪 Error loading initial cookie state:', error);
  }
  
  console.log('🍪 Initial state: no saved preferences, showing banner');
  return {
    preferences: defaultPreferences,
    hasConsented: false,
    showBanner: true
  };
};

export function CookieProvider({ children }: { children: React.ReactNode }) {
  const initialState = getInitialCookieState();
  
  const [preferences, setPreferences] = useState<CookiePreferences>(initialState.preferences);
  const [hasConsented, setHasConsented] = useState(initialState.hasConsented);
  const [showBanner, setShowBanner] = useState(initialState.showBanner);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  console.log('🍪 CookieProvider initialized with:', {
    preferences,
    hasConsented,
    showBanner,
    isSettingsOpen,
    initialState
  });

  // Debug: State-Überwachung
  useEffect(() => {
    console.log('🍪 State updated:', {
      preferences,
      hasConsented,
      showBanner,
      timestamp: new Date().toISOString()
    });
  }, [preferences, hasConsented, showBanner]);
  
  // localStorage-Synchronisation bei State-Änderungen
  useEffect(() => {
    if (hasConsented && typeof window !== 'undefined') {
      try {
        localStorage.setItem('cookie-preferences', JSON.stringify(preferences));
        localStorage.setItem('cookie-consent-given', 'true');
        console.log('🍪 State persisted to localStorage');
      } catch (error) {
        console.error('🍪 Error persisting state:', error);
      }
    }
  }, [preferences, hasConsented]);

  const updatePreferences = (newPreferences: Partial<CookiePreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    console.log('🍪 === UPDATING PREFERENCES ===');
    console.log('🍪 Old:', preferences);
    console.log('🍪 New:', newPreferences);
    console.log('🍪 Updated:', updated);
    
    // State-Update - localStorage wird automatisch durch useEffect synchronisiert
    setPreferences(updated);
    setHasConsented(true);
    setShowBanner(false);
    
    console.log('🍪 Preferences state updated');
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

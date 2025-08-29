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
  
  console.log('🍪 CookieProvider initialized with:', {
    preferences,
    hasConsented,
    showBanner,
    isSettingsOpen
  });

  // Beim ersten Laden prüfen, ob bereits Einverständnis gegeben wurde
  useEffect(() => {
    // Robustere localStorage-Überprüfung
    const loadCookiePreferences = () => {
      try {
        console.log('🍪 === COOKIE DEBUG START ===');
        console.log('🍪 localStorage available:', typeof Storage !== 'undefined');
        console.log('🍪 window available:', typeof window !== 'undefined');
        
        // Alle localStorage-Einträge anzeigen
        const allLocalStorage = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            allLocalStorage[key] = localStorage.getItem(key);
          }
        }
        console.log('🍪 All localStorage entries:', allLocalStorage);
        
        const savedPreferences = localStorage.getItem('cookie-preferences');
        const consentGiven = localStorage.getItem('cookie-consent-given');
        
        console.log('🍪 Specific cookie data:', { 
          savedPreferences, 
          consentGiven,
          savedPreferencesType: typeof savedPreferences,
          consentGivenType: typeof consentGiven
        });
        
        if (savedPreferences && consentGiven === 'true') {
          const parsed = JSON.parse(savedPreferences);
          console.log('🍪 Successfully parsed preferences:', parsed);
          setPreferences(parsed);
          setHasConsented(true);
          setShowBanner(false);
          console.log('🍪 Cookie banner hidden, preferences loaded');
        } else {
          console.log('🍪 No valid saved preferences found, showing banner');
          console.log('🍪 Reason:', {
            hasSavedPreferences: !!savedPreferences,
            isConsentTrue: consentGiven === 'true'
          });
          // Banner anzeigen, wenn noch keine Einverständnis gegeben wurde
          setShowBanner(true);
        }
        console.log('🍪 === COOKIE DEBUG END ===');
      } catch (error) {
        console.error('🍪 Error loading cookie preferences:', error);
        // Bei Fehlern Banner anzeigen
        setShowBanner(true);
      }
    };

    // Kleiner Delay um sicherzustellen dass localStorage verfügbar ist
    if (typeof window !== 'undefined') {
      console.log('🍪 Scheduling cookie preferences load in 100ms');
      setTimeout(loadCookiePreferences, 100);
    } else {
      console.log('🍪 Window not available, skipping cookie load');
    }
  }, []);

  const updatePreferences = (newPreferences: Partial<CookiePreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    console.log('🍪 === SAVING PREFERENCES ===');
    console.log('🍪 Old preferences:', preferences);
    console.log('🍪 New preferences:', newPreferences);
    console.log('🍪 Updated preferences:', updated);
    
    setPreferences(updated);
    
    try {
      const serialized = JSON.stringify(updated);
      console.log('🍪 Serialized preferences:', serialized);
      
      localStorage.setItem('cookie-preferences', serialized);
      localStorage.setItem('cookie-consent-given', 'true');
      
      // Verify save
      const verify = localStorage.getItem('cookie-preferences');
      const verifyConsent = localStorage.getItem('cookie-consent-given');
      console.log('🍪 Verification - saved preferences:', verify);
      console.log('🍪 Verification - consent flag:', verifyConsent);
      
      setHasConsented(true);
      setShowBanner(false);
      console.log('🍪 Preferences saved and state updated successfully');
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

'use client';

import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useCallback } from 'react';

interface UseRecaptchaReturn {
  executeRecaptcha: (action: string) => Promise<string | null>;
  isLoaded: boolean;
}

export function useRecaptcha(): UseRecaptchaReturn {
  const { executeRecaptcha: execute } = useGoogleReCaptcha();

  const executeRecaptcha = useCallback(async (action: string): Promise<string | null> => {
    if (!execute) {
      console.warn('reCAPTCHA ist noch nicht geladen');
      return null;
    }

    try {
      const token = await execute(action);
      return token;
    } catch (error) {
      console.error('Fehler beim Ausführen von reCAPTCHA:', error);
      return null;
    }
  }, [execute]);

  return {
    executeRecaptcha,
    isLoaded: !!execute
  };
}

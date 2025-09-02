'use client';

import { Button } from '@/components/ui/button';
import { useGoogleAdsConversion } from '@/hooks/useCookieAnalytics';

export function EmailTestComponent() {
  const { trackGoogleAdsConversion } = useGoogleAdsConversion();

  const handleTestConversion = () => {
    // Google Ads Conversion testen
    trackGoogleAdsConversion('Registrierung');
    console.log('Google Ads Conversion Event gesendet!');
  };

  const handleTestConversionWithValue = () => {
    // Google Ads Conversion mit Wert testen
    trackGoogleAdsConversion('Kauf', 29.99, 'EUR');
    console.log('Google Ads Conversion Event mit Wert gesendet!');
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Google Ads Conversion Test</h3>
      <div className="space-y-2">
        <Button onClick={handleTestConversion} className="w-full">
          Test: Registrierung Conversion
        </Button>
        <Button onClick={handleTestConversionWithValue} className="w-full">
          Test: Kauf Conversion (29,99€)
        </Button>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        Öffne die Browser Console, um die Events zu sehen.
      </p>
    </div>
  );
}

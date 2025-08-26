'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCookies } from '@/contexts/CookieContext';
import { Cookie, Settings, X } from 'lucide-react';

export function CookieBanner() {
  const { showBanner, setShowBanner, updatePreferences, openSettings } = useCookies();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!showBanner) return null;

  const handleAcceptAll = () => {
    updatePreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      email: true,
    });
  };

  const handleAcceptNecessary = () => {
    updatePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      email: false,
    });
  };

  const handleOpenSettings = () => {
    openSettings();
    setShowBanner(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 shadow-lg">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Cookie-Einstellungen</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBanner(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Wir verwenden Cookies, um Ihre Erfahrung auf unserer Website zu verbessern und 
            Ihnen personalisierte Inhalte anzuzeigen.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isExpanded && (
            <div className="space-y-3 text-sm text-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Notwendige Cookies</h4>
                  <p>Für die Grundfunktionen der Website erforderlich (Login, Zahlungen, Spam-Schutz)</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Analyse-Cookies</h4>
                  <p>Helfen uns zu verstehen, wie Besucher mit der Website interagieren</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Marketing-Cookies</h4>
                  <p>Verwendet für personalisierte Werbung und Marketing-Kampagnen</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">E-Mail-Cookies</h4>
                  <p>Für E-Mail-Benachrichtigungen und Bestätigungen</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleAcceptAll} className="flex-1">
              Alle akzeptieren
            </Button>
            <Button onClick={handleAcceptNecessary} variant="outline" className="flex-1">
              Nur notwendige
            </Button>
            <Button 
              onClick={handleOpenSettings} 
              variant="outline" 
              className="flex-1"
            >
              <Settings className="h-4 w-4 mr-2" />
              Einstellungen
            </Button>
          </div>
          
          {!isExpanded && (
            <Button
              variant="link"
              onClick={() => setIsExpanded(true)}
              className="p-0 h-auto text-sm text-gray-500"
            >
              Mehr erfahren
            </Button>
          )}
          
          <div className="text-xs text-gray-500">
            Durch die Nutzung unserer Website stimmen Sie der Verwendung von Cookies zu. 
            Sie können Ihre Einstellungen jederzeit in den{' '}
            <button
              onClick={handleOpenSettings}
              className="text-blue-600 hover:underline"
            >
              Cookie-Einstellungen
            </button>{' '}
            ändern.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

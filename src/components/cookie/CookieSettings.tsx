'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCookies } from '@/contexts/CookieContext';
import { Cookie, BarChart3, Mail, Megaphone, Shield } from 'lucide-react';

export function CookieSettings() {
  const { isSettingsOpen, closeSettings, preferences, updatePreferences } = useCookies();
  const [tempPreferences, setTempPreferences] = useState(preferences);

  const handleSave = () => {
    updatePreferences(tempPreferences);
    closeSettings();
  };

  const handleCancel = () => {
    setTempPreferences(preferences);
    closeSettings();
  };

  const handleAcceptAll = () => {
    setTempPreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      email: true,
    });
  };

  const handleRejectAll = () => {
    setTempPreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      email: false,
    });
  };

  return (
    <Dialog open={isSettingsOpen} onOpenChange={closeSettings}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cookie className="h-5 w-5" />
            Cookie-Einstellungen
          </DialogTitle>
          <DialogDescription>
            Hier können Sie Ihre Cookie-Einstellungen anpassen. Notwendige Cookies sind immer aktiv, 
            da sie für die Grundfunktionen der Website erforderlich sind.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Notwendige Cookies */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <CardTitle className="text-base">Notwendige Cookies</CardTitle>
                </div>
                <Switch checked={true} disabled />
              </div>
              <CardDescription>
                Diese Cookies sind für die Grundfunktionen der Website erforderlich und können nicht deaktiviert werden.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Supabase Session</span>
                  <span className="text-green-600">Aktiv</span>
                </div>
                <div className="flex justify-between">
                  <span>reCAPTCHA</span>
                  <span className="text-green-600">Aktiv</span>
                </div>
                <div className="flex justify-between">
                  <span>PayPal Integration</span>
                  <span className="text-green-600">Aktiv</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Analyse Cookies */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-base">Analyse-Cookies</CardTitle>
                </div>
                <Switch
                  checked={tempPreferences.analytics}
                  onCheckedChange={(checked) =>
                    setTempPreferences(prev => ({ ...prev, analytics: checked }))
                  }
                />
              </div>
              <CardDescription>
                Diese Cookies helfen uns zu verstehen, wie Besucher mit der Website interagieren.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Google Analytics</span>
                  <span className={tempPreferences.analytics ? "text-green-600" : "text-gray-400"}>
                    {tempPreferences.analytics ? "Aktiv" : "Inaktiv"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Google Search Console</span>
                  <span className={tempPreferences.analytics ? "text-green-600" : "text-gray-400"}>
                    {tempPreferences.analytics ? "Aktiv" : "Inaktiv"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Marketing Cookies */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-purple-600" />
                  <CardTitle className="text-base">Marketing-Cookies</CardTitle>
                </div>
                <Switch
                  checked={tempPreferences.marketing}
                  onCheckedChange={(checked) =>
                    setTempPreferences(prev => ({ ...prev, marketing: checked }))
                  }
                />
              </div>
              <CardDescription>
                Diese Cookies werden für personalisierte Werbung und Marketing-Kampagnen verwendet.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Google Ads</span>
                  <span className={tempPreferences.marketing ? "text-green-600" : "text-gray-400"}>
                    {tempPreferences.marketing ? "Aktiv" : "Inaktiv"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* E-Mail Cookies */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-orange-600" />
                  <CardTitle className="text-base">E-Mail-Cookies</CardTitle>
                </div>
                <Switch
                  checked={tempPreferences.email}
                  onCheckedChange={(checked) =>
                    setTempPreferences(prev => ({ ...prev, email: checked }))
                  }
                />
              </div>
              <CardDescription>
                Diese Cookies werden für E-Mail-Benachrichtigungen und Bestätigungen verwendet.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Brevo (Sendinblue)</span>
                  <span className={tempPreferences.email ? "text-green-600" : "text-gray-400"}>
                    {tempPreferences.email ? "Aktiv" : "Inaktiv"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Aktions-Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleAcceptAll} variant="outline" className="flex-1">
              Alle akzeptieren
            </Button>
            <Button onClick={handleRejectAll} variant="outline" className="flex-1">
              Alle ablehnen
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleSave} className="flex-1">
              Einstellungen speichern
            </Button>
            <Button onClick={handleCancel} variant="outline" className="flex-1">
              Abbrechen
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Ihre Einstellungen werden lokal in Ihrem Browser gespeichert und können jederzeit geändert werden.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

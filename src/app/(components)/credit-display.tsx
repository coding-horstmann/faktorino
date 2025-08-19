'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CreditService, type UserCredits } from '@/lib/credit-service';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Zap } from 'lucide-react';

interface CreditDisplayProps {
  maxCredits?: number; // Für die Fortschrittsleiste (Standard: 100)
  showPurchaseButton?: boolean;
}

export function CreditDisplay({ maxCredits = 100, showPurchaseButton = true }: CreditDisplayProps) {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCreditData();
    }
  }, [user]);

  const loadCreditData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userCredits = await CreditService.getUserCredits(user.id);
      setCredits(userCredits);
    } catch (error) {
      console.error('Error loading credit data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Event-Listener für Credit-Updates und Polling als Fallback
  useEffect(() => {
    if (!user) return;
    
    // Custom Event Listener für sofortige Updates
    const handleCreditUpdate = () => {
      loadCreditData();
    };
    
    window.addEventListener('creditUpdated', handleCreditUpdate);
    
    // Polling als Fallback für Echtzeit-Updates alle 30 Sekunden
    const interval = setInterval(() => {
      loadCreditData();
    }, 30000);

    return () => {
      window.removeEventListener('creditUpdated', handleCreditUpdate);
      clearInterval(interval);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const currentCredits = credits?.credits || 0;
  const progressPercentage = Math.min((currentCredits / maxCredits) * 100, 100);

  return (
    <div className="bg-gradient-to-r from-blue-50 via-blue-100 to-blue-200 border-blue-300 rounded-lg p-6 border shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <Zap className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Verbleibende Rechnungen</h3>
          <p className="text-sm text-gray-600">Ihr aktuelles Credit-Guthaben für die Rechnungserstellung</p>
        </div>
      </div>

      {/* Hauptanzeige */}
      <div className="space-y-4">
        {/* Credit-Anzahl */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {currentCredits.toLocaleString('de-DE')} Credits verfügbar
          </div>
          <p className="text-sm text-gray-600 font-medium">
            Sie können noch {currentCredits.toLocaleString('de-DE')} Rechnungen erstellen
          </p>
        </div>

        {/* Fortschrittsleiste */}
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500 ease-out bg-blue-900"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Warnung bei niedrigen Credits */}
        {currentCredits < 10 && (
          <div className="mt-4 p-3 bg-white bg-opacity-70 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 text-orange-800">
              <CreditCard className="h-4 w-4" />
              <span className="font-medium text-sm">
                Niedrige Credits! Kaufen Sie jetzt nach, um weiterhin Rechnungen erstellen zu können.
              </span>
            </div>
          </div>
        )}

        {/* Credits kaufen Button - breit wie Rechnungen generieren Button */}
        {showPurchaseButton && (
          <Button 
            className="w-full bg-blue-950 hover:bg-blue-900 text-white"
            onClick={() => {
              // TODO: Hier kommt später der direkte Checkout
              alert('Direkter Checkout wird bald implementiert');
            }}
          >
            Credits kaufen
          </Button>
        )}
      </div>
    </div>
  );
}

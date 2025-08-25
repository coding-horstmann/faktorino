'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CreditService, type UserCredits } from '@/lib/credit-service';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Zap } from 'lucide-react';
import { CreditPurchaseModal } from './credit-purchase-modal';

interface CreditDisplayProps {
  showPurchaseButton?: boolean;
}

export function CreditDisplay({ showPurchaseButton = true }: CreditDisplayProps) {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadCreditData(true); // Nur beim ersten Laden das Ladezeichen zeigen
    }
  }, [user]);

  const loadCreditData = async (showLoader = false) => {
    if (!user) return;
    
    // Nur beim ersten Laden oder wenn explizit gewünscht das Ladezeichen anzeigen
    if (showLoader) {
      setLoading(true);
    }
    
    try {
      const userCredits = await CreditService.getUserCredits(user.id);
      setCredits(userCredits);
      
      // Nach dem ersten erfolgreichen Laden ist die Komponente initialisiert
      if (!isInitialized) {
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('Error loading credit data:', error);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  // Event-Listener für Credit-Updates und Polling als Fallback
  useEffect(() => {
    if (!user) return;
    
    // Custom Event Listener für sofortige Updates
    const handleCreditUpdate = () => {
      console.log('Credit update event received, reloading data...');
      loadCreditData(false); // Kein Ladezeichen bei Event-Updates
    };
    
    const handleCreditChange = (event: CustomEvent) => {
      console.log('Credit change event received:', event.detail);
      // Nur aktualisieren wenn es für den aktuellen User ist
      if (event.detail?.userId === user.id) {
        loadCreditData(false); // Kein Ladezeichen bei Event-Updates
      }
    };
    
    window.addEventListener('creditUpdated', handleCreditUpdate);
    window.addEventListener('creditChanged', handleCreditChange as EventListener);
    
    // Polling als Fallback für Echtzeit-Updates alle 10 Sekunden (statt 30)
    const interval = setInterval(() => {
      loadCreditData(false); // Kein Ladezeichen bei Polling-Updates
    }, 10000);

    return () => {
      window.removeEventListener('creditUpdated', handleCreditUpdate);
      window.removeEventListener('creditChanged', handleCreditChange as EventListener);
      clearInterval(interval);
    };
  }, [user]);

  // Nur beim allerersten Laden das Ladezeichen anzeigen
  if (loading && !isInitialized) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const currentCredits = credits?.credits || 0;

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
            {currentCredits.toLocaleString('de-DE')} Credits
          </div>
          <p className="text-sm text-gray-600 font-medium">
            Sie können noch {currentCredits.toLocaleString('de-DE')} Rechnungen erstellen
          </p>
        </div>



        {/* Warnung bei niedrigen Credits */}
        {currentCredits < 10 && (
                      <div className="mt-4 p-3 bg-white bg-opacity-70 rounded-lg border" style={{ borderColor: '#940703' }}>
              <div className="flex items-center gap-2" style={{ color: '#940703' }}>
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
            onClick={() => setShowPurchaseModal(true)}
          >
            Credits kaufen
          </Button>
        )}
      </div>
      
      {/* Credit Purchase Modal */}
      <CreditPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onPurchaseComplete={() => {
          loadCreditData(true);
          setShowPurchaseModal(false);
        }}
      />
    </div>
  );
}

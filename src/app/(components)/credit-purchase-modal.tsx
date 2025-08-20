'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard } from 'lucide-react';
import { CreditPurchase } from './credit-purchase';
import { useAuth } from '@/contexts/AuthContext';
import { CreditService } from '@/lib/credit-service';
import { useState, useEffect } from 'react';

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

export function CreditPurchaseModal({ isOpen, onClose, onPurchaseComplete }: CreditPurchaseModalProps) {
  const { user } = useAuth();
  const [userCredits, setUserCredits] = useState(0);

  useEffect(() => {
    if (user && isOpen) {
      loadUserCredits();
    }
  }, [user, isOpen]);

  const loadUserCredits = async () => {
    try {
      const credits = await CreditService.getUserCredits(user!.id);
      setUserCredits(credits?.credits || 0);
    } catch (error) {
      console.error('Error loading user credits:', error);
    }
  };

  const handlePurchaseComplete = () => {
    if (onPurchaseComplete) {
      onPurchaseComplete();
    }
    onClose();
  };

  console.log('CreditPurchaseModal - Rendering:', { isOpen, userCredits });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credits kaufen
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <CreditPurchase 
            onPurchaseComplete={handlePurchaseComplete}
            userCredits={userCredits}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

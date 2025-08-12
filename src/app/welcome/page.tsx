'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Mail, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { supabase } from '@/lib/supabase';
import { useToast } from "@/hooks/use-toast";

export default function WelcomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      setEmailConfirmed(!!user.email_confirmed_at);
    }
  }, [user, loading, router]);

  const handleResendConfirmation = async () => {
    if (!user?.email) return;

    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Die Bestätigungs-E-Mail konnte nicht erneut gesendet werden.",
        });
      } else {
        toast({
          title: "E-Mail gesendet",
          description: "Eine neue Bestätigungs-E-Mail wurde an Ihre E-Mail-Adresse gesendet.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleProceedToDashboard = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 py-8">
      <div className="text-center space-y-2">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        <h1 className="text-3xl font-bold">Willkommen bei NexTn!</h1>
        <p className="text-lg text-muted-foreground">
          Ihre Registrierung war erfolgreich.
        </p>
      </div>

      {!emailConfirmed ? (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <Mail className="h-5 w-5" />
              E-Mail-Bestätigung erforderlich
            </CardTitle>
            <CardDescription className="text-yellow-600">
              Um alle Funktionen nutzen zu können, bestätigen Sie bitte Ihre E-Mail-Adresse.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Wir haben eine Bestätigungs-E-Mail an <strong>{user.email}</strong> gesendet. 
                Klicken Sie auf den Link in der E-Mail, um Ihr Konto zu aktivieren.
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                className="flex-1"
              >
                {resendLoading ? "Wird gesendet..." : "E-Mail erneut senden"}
              </Button>
              <Button 
                onClick={handleProceedToDashboard}
                className="flex-1 flex items-center gap-2"
              >
                Trotzdem fortfahren
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              E-Mail bestätigt
            </CardTitle>
            <CardDescription className="text-green-600">
              Ihr Konto ist vollständig aktiviert.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleProceedToDashboard}
              className="w-full flex items-center gap-2"
            >
              Zum Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ihre 14-tägige kostenlose Testphase</CardTitle>
          <CardDescription>
            Das erwartet Sie in den nächsten 14 Tagen:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0"/>
            <p>Bis zu 10.000 Rechnungen pro Monat generieren.</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0"/>
            <p>Automatische Steuerberechnung für physische & digitale Produkte.</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0"/>
            <p>DSGVO-konforme Datenverarbeitung.</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0"/>
            <p>Vollständiger Zugang zu allen Premium-Features.</p>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>
          Haben Sie Fragen? Besuchen Sie unsere <Link href="/kontakt" className="underline hover:text-primary">Kontakt-Seite</Link>.
        </p>
        <p>
          Nach dem 14-tägigen Testzeitraum wird automatisch ein Abo für 4,99€/Monat eingerichtet. Sie können jederzeit kündigen.
        </p>
      </div>
    </div>
  );
}

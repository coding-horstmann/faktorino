'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from '@/lib/supabase';
import { useToast } from "@/hooks/use-toast";
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { executeAndVerifyRecaptcha } from '@/lib/recaptcha-service';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const { executeRecaptcha, isLoaded } = useRecaptcha();

  // Prefetch Dashboard für schnellere Navigation nach Login
  useEffect(() => {
    try {
      // @ts-ignore - prefetch ist im App Router verfügbar
      (router as any).prefetch?.('/dashboard')
    } catch {}
  }, [])

  // Check for error parameters in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const registered = urlParams.get('registered');
    const reason = urlParams.get('reason');
    
    if (errorParam === 'user_deleted') {
      setError('Ihr Benutzerkonto wurde gelöscht. Bitte kontaktieren Sie den Administrator.');
    }

    if (registered === '1') {
      toast({
        title: 'Bitte E-Mail bestätigen',
        description: 'Wir haben Ihnen eine Bestätigungs-E-Mail gesendet. Klicken Sie auf den Link, um Ihr Konto zu aktivieren.',
      });
    }

    if (reason === 'already_registered') {
      setError('Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // reCAPTCHA-Verifizierung vor dem Login
      const recaptchaResult = await executeAndVerifyRecaptcha(executeRecaptcha, 'login');
      
      if (!recaptchaResult.success) {
        setError('Sicherheitsüberprüfung fehlgeschlagen. Bitte versuchen Sie es erneut.');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Check if this is a new user (first time login)
      const isNewUser = data.user?.created_at && 
        new Date(data.user.created_at).getTime() > new Date().getTime() - (24 * 60 * 60 * 1000); // Within last 24 hours

      toast({
        title: isNewUser ? "Willkommen!" : "Willkommen zurück!",
        description: "Sie wurden erfolgreich angemeldet.",
      });

      router.push('/dashboard');
    } catch (err: any) {
      setError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Bitte geben Sie Ihre E-Mail-Adresse ein.');
      return;
    }

    setForgotPasswordLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://www.faktorino.de/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        toast({
          title: "E-Mail gesendet",
          description: "Eine E-Mail zum Zurücksetzen Ihres Passworts wurde gesendet.",
        });
      }
    } catch (err: any) {
      setError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Anmelden</h1>
        <p className="text-muted-foreground">Willkommen bei faktorino</p>
      </div>

      <Card>
        <CardHeader>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="ihre@email.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ihr Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !isLoaded}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Anmelden
            </Button>
          </form>

          <div className="text-center">
            <Button
              variant="link"
              onClick={handleForgotPassword}
              disabled={forgotPasswordLoading || !email}
              className="text-sm"
            >
              {forgotPasswordLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gesendet...
                </>
              ) : (
                "Passwort vergessen?"
              )}
            </Button>
          </div>

          
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Noch kein Konto?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Jetzt registrieren
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from '@/lib/supabase';
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      toast({
        title: "Willkommen zurück!",
        description: "Sie wurden erfolgreich angemeldet.",
      });

      router.push('/dashboard');
    } catch (err: any) {
      setError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } catch (err: any) {
      setError('Ein unerwarteter Fehler ist aufgetreten.');
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
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        setError(error.message);
        return;
      }

      toast({
        title: "E-Mail gesendet!",
        description: "Prüfen Sie Ihren Posteingang für den Passwort-Reset-Link.",
      });
    } catch (err: any) {
      setError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
        <Card>
            <CardHeader>
                <CardTitle>Anmelden</CardTitle>
                <CardDescription>
                    Melden Sie sich bei Ihrem EtsyBuchhalter-Konto an.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="email">E-Mail</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="ihre@email.de" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="password">Passwort</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Anmelden
                  </Button>
                  <div className="text-center space-y-2">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={handleForgotPassword}
                      disabled={forgotPasswordLoading}
                    >
                      {forgotPasswordLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Passwort vergessen?
                    </Button>
                    <Link href="/register" passHref>
                        <Button variant="link" size="sm">Noch kein Konto? Registrieren</Button>
                    </Link>
                  </div>
              </CardFooter>
            </form>
        </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { UserService } from '@/lib/user-service';
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    address: '',
    city: '',
    taxId: '',
    password: '',
    passwordConfirm: '',
  });
  const [termsAccepted, setTermsAccepted] = useState<boolean | 'indeterminate'>(false);
  const [privacyAccepted, setPrivacyAccepted] = useState<boolean | 'indeterminate'>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.email || !formData.name || !formData.address || !formData.city || !formData.password) {
      setError('Bitte füllen Sie alle Pflichtfelder aus.');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      setError('Die Passwörter stimmen nicht überein.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.');
      setLoading(false);
      return;
    }

    if (!termsAccepted || !privacyAccepted) {
      setError('Bitte stimmen Sie den AGB und der Datenschutzerklärung zu.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            address: formData.address,
            city: formData.city,
            tax_id: formData.taxId,
          },
          emailRedirectTo: `https://etsy-tool-ohne-stripe-k9u5.vercel.app/auth/callback`
        }
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        // Create user profile in our users table - but only if the user is confirmed
        // For email confirmation flow, this will be handled by the trigger
        if (data.user.email_confirmed_at) {
          try {
            await UserService.createUserProfile({
              id: data.user.id,
              email: formData.email,
              name: formData.name,
              address: formData.address,
              city: formData.city,
              tax_number: formData.taxId || null,
              tax_status: 'regular'
            });
          } catch (profileError) {
            console.error('Error creating user profile:', profileError);
          }
        }

        toast({
          title: "Registrierung erfolgreich!",
          description: "Bitte überprüfen Sie Ihre E-Mail, um Ihr Konto zu bestätigen.",
        });

        router.push('/welcome');
      }
    } catch (err: any) {
      setError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
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

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Jetzt registrieren</h1>
        <p className="text-muted-foreground">Starten Sie Ihren 14-tägigen kostenlosen Test</p>
      </div>

      <Card className="bg-secondary/50">
          <CardHeader>
              <CardTitle>Ihre Vorteile:</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0"/>
                <p>14 Tage kostenlos und unverbindlich testen.</p>
             </div>
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
          </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail-Adresse *</Label>
              <Input 
                id="email" 
                name="email"
                type="email" 
                placeholder="ihre@email.de" 
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name / Firmenname *</Label>
              <Input 
                id="name" 
                name="name"
                placeholder="Max Mustermann" 
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Straße & Hausnummer *</Label>
              <Input 
                id="address" 
                name="address"
                placeholder="Musterstraße 123" 
                value={formData.address}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">PLZ & Stadt *</Label>
              <Input 
                id="city" 
                name="city"
                placeholder="12345 Musterstadt" 
                value={formData.city}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">Umsatzsteuer-ID oder Steuer-ID</Label>
              <Input 
                id="taxId" 
                name="taxId"
                placeholder="DE123456789 oder 123/456/78901" 
                value={formData.taxId}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort *</Label>
              <Input 
                id="password" 
                name="password"
                type="password" 
                placeholder="Mindestens 8 Zeichen"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Passwort bestätigen *</Label>
              <Input 
                id="passwordConfirm" 
                name="passwordConfirm"
                type="password" 
                placeholder="Passwort wiederholen"
                value={formData.passwordConfirm}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-3 pt-2">
               <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="terms" 
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked)}
                    disabled={loading}
                  />
                  <Label htmlFor="terms" className="text-sm font-normal">
                      Ich stimme den <Link href="/agb" className="underline hover:text-primary">Allgemeinen Geschäftsbedingungen</Link> zu. *
                  </Label>
              </div>
               <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="privacy" 
                    checked={privacyAccepted}
                    onCheckedChange={(checked) => setPrivacyAccepted(checked)}
                    disabled={loading}
                  />
                  <Label htmlFor="privacy" className="text-sm font-normal">
                      Ich stimme der <Link href="/datenschutz" className="underline hover:text-primary">Datenschutzerklärung</Link> zu. *
                  </Label>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
           
            <div className="pt-4">
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                14 Tage kostenlos testen
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
             <div className="text-center text-xs text-muted-foreground p-2 border rounded-md">
                Zahlungsabwicklung über Stripe. Nach dem 14-tägigen Testzeitraum wird automatisch ein Abo für 4,99€/Monat eingerichtet. Sie können jederzeit kündigen.
            </div>
            <div className="text-center">
              <Link href="/login" passHref>
                  <Button variant="link" size="sm">Bereits ein Konto? Anmelden</Button>
              </Link>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}

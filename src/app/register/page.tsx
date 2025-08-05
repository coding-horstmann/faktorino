
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
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
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail-Adresse *</Label>
            <Input id="email" type="email" placeholder="ihre@email.de" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name / Firmenname *</Label>
            <Input id="name" placeholder="Max Mustermann" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse *</Label>
            <Input id="address" placeholder="Musterstraße 123, 12345 Musterstadt" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax-id">Umsatzsteuer-ID oder Steuer-ID</Label>
            <Input id="tax-id" placeholder="DE123456789 oder 123/456/78901" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passwort *</Label>
            <Input id="password" type="password" placeholder="Mindestens 8 Zeichen"/>
          </div>
           <div className="space-y-2">
            <Label htmlFor="password-confirm">Passwort bestätigen *</Label>
            <Input id="password-confirm" type="password" placeholder="Passwort wiederholen"/>
          </div>
          
          <div className="space-y-3 pt-2">
             <div className="flex items-center space-x-2">
                <Checkbox id="terms" />
                <Label htmlFor="terms" className="text-sm font-normal">
                    Ich stimme den <Link href="/agb" className="underline hover:text-primary">Allgemeinen Geschäftsbedingungen</Link> zu. *
                </Label>
            </div>
             <div className="flex items-center space-x-2">
                <Checkbox id="privacy" />
                <Label htmlFor="privacy" className="text-sm font-normal">
                    Ich stimme der <Link href="/datenschutz" className="underline hover:text-primary">Datenschutzerklärung</Link> zu. *
                </Label>
            </div>
          </div>
         
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
             <div className="text-center text-xs text-muted-foreground p-2 border rounded-md">
                Zahlungsabwicklung über Stripe. Nach dem 14-tägigen Testzeitraum wird automatisch ein Abo für 4,99€/Monat eingerichtet. Sie können jederzeit kündigen.
            </div>
          <Button className="w-full" size="lg">14 Tage kostenlos testen</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

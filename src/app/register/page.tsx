
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md">
        <Card>
            <CardHeader>
                <CardTitle>Registrieren</CardTitle>
                <CardDescription>
                    Starten Sie Ihren 14-tägigen kostenlosen Testzeitraum.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Button variant="outline" className="w-full">
                    {/* Hier Google Icon einfügen */}
                    Mit Google registrieren
                </Button>
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            Oder registriere dich mit deiner E-Mail
                        </span>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input id="email" type="email" placeholder="ihre@email.de" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="password">Passwort</Label>
                    <Input id="password" type="password" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="name">Name / Firmenname</Label>
                    <Input id="name" placeholder="Max Mustermann" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="address">Anschrift</Label>
                    <Input id="address" placeholder="Musterstraße 123, 12345 Musterstadt" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="tax-id">Umsatzsteuer-ID oder Steuer-ID</Label>
                    <Input id="tax-id" placeholder="DE123456789" />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="terms" />
                    <Label htmlFor="terms" className="text-sm font-normal">
                        Ich stimme den <Link href="/agb" className="underline">AGB</Link> und der <Link href="/datenschutz" className="underline">Datenschutzerklärung</Link> zu.
                    </Label>
                </div>
                 <div className="text-sm text-muted-foreground pt-2">
                    Sie können pro Monat bis zu 10.000 Rechnungen generieren. Nach 14 Tagen wird Ihr Abo für 4,99€/Monat aktiviert.
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                <Button className="w-full">Kostenlos testen</Button>
            </CardFooter>
        </Card>
    </div>
  );
}

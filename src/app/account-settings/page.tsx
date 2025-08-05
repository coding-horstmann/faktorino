
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function AccountSettingsPage() {
    const { toast } = useToast();
    // Dummy state for demonstration
    const [formData, setFormData] = useState({
        email: 'nutzer@email.de',
        name: 'Max Mustermann',
        address: 'Musterstraße 123, 12345 Musterstadt',
        taxId: '123/456/78901',
        vatId: 'DE123456789',
        password: '',
        passwordConfirm: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.id]: e.target.value
        });
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Hier würde die Logik zum Speichern der Daten stehen (z.B. API-Aufruf an Supabase)
        
        if (formData.password && formData.password !== formData.passwordConfirm) {
            toast({
                variant: "destructive",
                title: "Fehler",
                description: "Die Passwörter stimmen nicht überein.",
            });
            return;
        }

        toast({
            title: "Gespeichert",
            description: "Ihre Kontoinformationen wurden erfolgreich aktualisiert.",
        });
    }


  return (
    <div className="container mx-auto w-full max-w-xl">
        <Card>
            <CardHeader>
                <CardTitle>Kontoeinstellungen</CardTitle>
                <CardDescription>
                    Hier können Sie Ihre persönlichen Daten und Ihr Passwort ändern.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">E-Mail-Adresse *</Label>
                        <Input id="email" type="email" value={formData.email} onChange={handleChange} placeholder="ihre@email.de" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="name">Name / Firmenname *</Label>
                        <Input id="name" value={formData.name} onChange={handleChange} placeholder="Max Mustermann" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="address">Adresse *</Label>
                        <Input id="address" value={formData.address} onChange={handleChange} placeholder="Musterstraße 123, 12345 Musterstadt" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="taxId">Steuernummer</Label>
                        <Input id="taxId" value={formData.taxId} onChange={handleChange} placeholder="123/456/78901" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="vatId">Umsatzsteuer-ID</Label>
                        <Input id="vatId" value={formData.vatId} onChange={handleChange} placeholder="DE123456789" />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                        <Label htmlFor="password">Neues Passwort</Label>
                        <Input id="password" type="password" value={formData.password} onChange={handleChange} placeholder="Mindestens 8 Zeichen"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="passwordConfirm">Neues Passwort bestätigen</Label>
                        <Input id="passwordConfirm" type="password" value={formData.passwordConfirm} onChange={handleChange} placeholder="Passwort wiederholen"/>
                    </div>
                    <Button type="submit" className="w-full">Änderungen speichern</Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}

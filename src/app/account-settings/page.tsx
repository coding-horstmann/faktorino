'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { UserService } from '@/lib/user-service';
import { supabase } from '@/lib/supabase';

export default function AccountSettingsPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [error, setError] = useState('');
    
    const [formData, setFormData] = useState({
        email: '',
        newEmail: '',
        name: '',
        address: '',
        city: '',
        taxNumber: '',
        vatId: '',
        taxStatus: 'regular' as 'regular' | 'small_business'
    });

    useEffect(() => {
        const loadUserData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const profile = await UserService.getUserProfile(user.id);
                if (profile) {
                    setFormData(prev => ({
                        ...prev,
                        email: user.email || '',
                        newEmail: user.email || '',
                        name: profile.name,
                        address: profile.address,
                        city: profile.city,
                        taxNumber: profile.tax_number || '',
                        vatId: profile.vat_id || '',
                        taxStatus: profile.tax_status
                    }));
                } else {
                    // Create profile if it doesn't exist
                    await UserService.createUserProfile({
                        id: user.id,
                        email: user.email || '',
                        name: '',
                        address: '',
                        city: '',
                        tax_status: 'regular'
                    });
                    setFormData(prev => ({
                        ...prev,
                        email: user.email || '',
                        newEmail: user.email || ''
                    }));
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                setError('Benutzerdaten konnten nicht geladen werden.');
            } finally {
                setLoading(false);
            }
        };

        loadUserData();
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleTaxStatusChange = (value: 'regular' | 'small_business') => {
        setFormData(prev => ({
            ...prev,
            taxStatus: value
        }));
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        setError('');

        try {
            // Update user profile
            const updatedProfile = await UserService.updateUserProfile(user.id, {
                name: formData.name,
                address: formData.address,
                city: formData.city,
                tax_number: formData.taxNumber || null,
                vat_id: formData.vatId || null,
                tax_status: formData.taxStatus
            });

            // Email change is handled separately

            if (updatedProfile) {
                toast({
                    title: "Gespeichert",
                    description: "Ihre Kontoinformationen wurden erfolgreich aktualisiert.",
                });
            } else {
                setError('Profil konnte nicht gespeichert werden.');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            setError('Ein Fehler beim Speichern ist aufgetreten.');
        } finally {
            setSaving(false);
        }
    };

    const handleChangeEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!formData.newEmail) {
            setError('Bitte geben Sie eine neue E-Mail-Adresse ein.');
            return;
        }

        if (formData.newEmail === formData.email) {
            setError('Die neue E-Mail-Adresse ist identisch mit der aktuellen.');
            return;
        }

        setChangingPassword(true); // Reuse loading state
        setError('');

        try {
            const { error } = await supabase.auth.updateUser({
                email: formData.newEmail
            });

            if (error) {
                setError(error.message);
                return;
            }

            toast({
                title: "E-Mail-Änderung beantragt",
                description: "Eine Bestätigungs-E-Mail wurde an Ihre neue E-Mail-Adresse gesendet.",
            });

            // Reset new email field
            setFormData(prev => ({
                ...prev,
                newEmail: formData.email
            }));
        } catch (error) {
            console.error('Error changing email:', error);
            setError('Ein Fehler beim Ändern der E-Mail ist aufgetreten.');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleRequestPasswordReset = async () => {
        if (!user?.email) return;

        setChangingPassword(true);
        setError('');

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
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
        } catch (error) {
            console.error('Error requesting password reset:', error);
            setError('Ein Fehler beim Anfordern des Passwort-Resets ist aufgetreten.');
        } finally {
            setChangingPassword(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto w-full max-w-xl flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto w-full max-w-xl space-y-6">
            {/* Profile Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Profil-Informationen</CardTitle>
                    <CardDescription>
                        Hier können Sie Ihre persönlichen Daten und Unternehmensinformationen ändern.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Aktuelle E-Mail-Adresse</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                placeholder="ihre@email.de"
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Name / Firmenname *</Label>
                            <Input 
                                id="name" 
                                name="name"
                                value={formData.name} 
                                onChange={handleInputChange} 
                                placeholder="Max Mustermann"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Straße & Hausnummer *</Label>
                            <Input 
                                id="address" 
                                name="address"
                                value={formData.address} 
                                onChange={handleInputChange} 
                                placeholder="Musterstraße 123"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="city">PLZ & Stadt *</Label>
                            <Input 
                                id="city" 
                                name="city"
                                value={formData.city} 
                                onChange={handleInputChange} 
                                placeholder="12345 Musterstadt"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="taxNumber">Steuernummer</Label>
                            <Input 
                                id="taxNumber" 
                                name="taxNumber"
                                value={formData.taxNumber} 
                                onChange={handleInputChange} 
                                placeholder="123/456/78901"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vatId">Umsatzsteuer-ID</Label>
                            <Input 
                                id="vatId" 
                                name="vatId"
                                value={formData.vatId} 
                                onChange={handleInputChange} 
                                placeholder="DE123456789"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Besteuerungsart *</Label>
                            <RadioGroup 
                                value={formData.taxStatus} 
                                onValueChange={handleTaxStatusChange}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="regular" id="regular" />
                                    <Label htmlFor="regular">Umsatzsteuerpflichtig</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="small_business" id="small_business" />
                                    <Label htmlFor="small_business">Kleinunternehmer (§ 19 UStG)</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        
                        <Button type="submit" className="w-full" disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Profil speichern
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Email Change */}
            <Card>
                <CardHeader>
                    <CardTitle>E-Mail-Adresse ändern</CardTitle>
                    <CardDescription>
                        Ändern Sie hier Ihre Anmelde-E-Mail-Adresse. Sie erhalten eine Bestätigungs-E-Mail.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleChangeEmail} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newEmail">Neue E-Mail-Adresse *</Label>
                            <Input
                                id="newEmail"
                                name="newEmail"
                                type="email"
                                value={formData.newEmail}
                                onChange={handleInputChange}
                                placeholder="neue@email.de"
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={changingPassword}>
                            {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            E-Mail-Adresse ändern
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Password Reset */}
            <Card>
                <CardHeader>
                    <CardTitle>Passwort zurücksetzen</CardTitle>
                    <CardDescription>
                        Fordern Sie eine "Passwort vergessen" E-Mail an, um Ihr Passwort zu ändern.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={handleRequestPasswordReset}
                        className="w-full"
                        disabled={changingPassword}
                        variant="outline"
                    >
                        {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Passwort vergessen E-Mail anfordern
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

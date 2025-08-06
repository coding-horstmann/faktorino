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
        name: '',
        address: '',
        city: '',
        taxNumber: '',
        vatId: '',
        taxStatus: 'regular' as 'regular' | 'small_business',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
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
                        email: user.email || ''
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

            // Update email if changed
            if (formData.email !== user.email) {
                const { error: emailError } = await supabase.auth.updateUser({
                    email: formData.email
                });

                if (emailError) {
                    setError(`Profil gespeichert, aber E-Mail konnte nicht geändert werden: ${emailError.message}`);
                } else {
                    toast({
                        title: "Bestätigung erforderlich",
                        description: "Eine Bestätigungs-E-Mail wurde an Ihre neue E-Mail-Adresse gesendet.",
                    });
                }
            }

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

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.newPassword || !formData.confirmPassword) {
            setError('Bitte füllen Sie alle Passwort-Felder aus.');
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Die neuen Passwörter stimmen nicht überein.');
            return;
        }

        if (formData.newPassword.length < 8) {
            setError('Das neue Passwort muss mindestens 8 Zeichen lang sein.');
            return;
        }

        setChangingPassword(true);
        setError('');

        try {
            const { error } = await supabase.auth.updateUser({
                password: formData.newPassword
            });

            if (error) {
                setError(error.message);
                return;
            }

            toast({
                title: "Passwort geändert",
                description: "Ihr Passwort wurde erfolgreich aktualisiert.",
            });

            // Clear password fields
            setFormData(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }));
        } catch (error) {
            console.error('Error changing password:', error);
            setError('Ein Fehler beim Ändern des Passworts ist aufgetreten.');
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
                            <Label htmlFor="email">E-Mail-Adresse *</Label>
                            <Input 
                                id="email" 
                                name="email"
                                type="email" 
                                value={formData.email} 
                                onChange={handleInputChange} 
                                placeholder="ihre@email.de"
                                required
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

            {/* Password Change */}
            <Card>
                <CardHeader>
                    <CardTitle>Passwort ändern</CardTitle>
                    <CardDescription>
                        Ändern Sie hier Ihr Anmelde-Passwort.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">Neues Passwort *</Label>
                            <Input 
                                id="newPassword" 
                                name="newPassword"
                                type="password" 
                                value={formData.newPassword} 
                                onChange={handleInputChange} 
                                placeholder="Mindestens 8 Zeichen"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Neues Passwort bestätigen *</Label>
                            <Input 
                                id="confirmPassword" 
                                name="confirmPassword"
                                type="password" 
                                value={formData.confirmPassword} 
                                onChange={handleInputChange} 
                                placeholder="Passwort wiederholen"
                            />
                        </div>
                        
                        <Button type="submit" className="w-full" disabled={changingPassword}>
                            {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Passwort ändern
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

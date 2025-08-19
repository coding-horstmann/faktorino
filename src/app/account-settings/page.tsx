'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

function AccountSettingsContent() {
    const { toast } = useToast();
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [changingPassword, setChangingPassword] = useState(false);
    const [error, setError] = useState('');

    
    const [formData, setFormData] = useState({
        email: '',
        newEmail: ''
    });

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        setFormData(prev => ({
            ...prev,
            email: user.email || '',
            newEmail: user.email || ''
        }));
        setLoading(false);
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    // Profilverwaltung der Unternehmensdaten entfällt hier bewusst

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
                email: formData.newEmail,
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
            {/* E-Mail ändern */}
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
                            <Label htmlFor="email">Aktuelle E-Mail-Adresse</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                disabled
                                className="bg-muted"
                            />
                        </div>
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

            {/* Passwort zurücksetzen */}
            <Card>
                <CardHeader>
                    <CardTitle>Passwort zurücksetzen</CardTitle>
                    <CardDescription>
                        Fordern Sie eine "Passwort zurücksetzen" E-Mail an, um Ihr Passwort zu ändern.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={handleRequestPasswordReset}
                        className="w-full"
                        disabled={changingPassword}
                    >
                        {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Passwort zurücksetzen
                    </Button>
                </CardContent>
            </Card>


        </div>
    );
}

export default function AccountSettingsPage() {
    return (
        <Suspense fallback={
            <div className="container mx-auto w-full max-w-xl flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        }>
            <AccountSettingsContent />
        </Suspense>
    );
}

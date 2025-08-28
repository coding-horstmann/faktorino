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
import { CreditDisplay } from '@/app/(components)/credit-display';

function AccountSettingsContent() {
    const { toast } = useToast();
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [changingPassword, setChangingPassword] = useState(false);
    const [emailChangeRequested, setEmailChangeRequested] = useState(false);
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
            }, {
                emailRedirectTo: `${window.location.origin}/auth/callback?flow=email_change`
            });

            if (error) {
                setError(error.message);
                return;
            }

            toast({
                title: "E-Mail-Änderung beantragt",
                description: "Bitte bestätige den Link in der neuen E-Mail-Adresse und danach den Link in deiner alten E-Mail-Adresse.",
            });

            setEmailChangeRequested(true);

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





    if (loading) {
        return (
            <div className="container mx-auto w-full max-w-xl flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto w-full max-w-xl space-y-6">
            {/* Credit-Anzeige */}
            <CreditDisplay showPurchaseButton={true} />
            
            {/* E-Mail ändern */}
            <Card>
                <CardHeader>
                    <CardTitle>E-Mail-Adresse ändern</CardTitle>
                    <CardDescription>
                        Ändern Sie hier Ihre Anmelde-E-Mail-Adresse.
                        Bei sicherer E-Mail-Änderung erhalten Sie zwei E-Mails:
                        zuerst an die neue Adresse, danach an die alte. Bis zur zweiten Bestätigung bleibt die alte Adresse für den Login aktiv.
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
                    {emailChangeRequested && (
                        <div className="mt-4">
                            <Alert>
                                <AlertDescription>
                                    Wir haben dir eine E-Mail an deine neue Adresse geschickt. Bitte klicke zuerst dort auf „E-Mail-Änderung bestätigen“. Anschließend erhältst du eine zweite E-Mail an deine alte Adresse – bestätige auch diese, um die Änderung final abzuschließen.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Fehlerbehandlung */}
            {error && (
                <Alert>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
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

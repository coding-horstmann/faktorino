
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
        <Card>
            <CardHeader>
                <CardTitle>Anmelden</CardTitle>
                <CardDescription>
                    Melden Sie sich bei Ihrem EtsyBuchhalter-Konto an.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Button variant="outline" className="w-full">
                    {/* Hier Google Icon einfügen */}
                    Mit Google anmelden
                </Button>
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            Oder fahre fort mit
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
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                <Button className="w-full">Anmelden</Button>
                <Link href="/reset-password" passHref>
                    <Button variant="link" size="sm" className="w-full">Passwort vergessen?</Button>
                </Link>
            </CardFooter>
        </Card>
    </div>
  );
}

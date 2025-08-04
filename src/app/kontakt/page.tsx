
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function KontaktPage() {
  return (
    <div className="w-full max-w-xl">
        <Card>
            <CardHeader>
                <CardTitle>Kontaktformular</CardTitle>
                <CardDescription>
                    Haben Sie Fragen oder Anregungen? Schreiben Sie uns eine Nachricht.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" placeholder="Ihr Name" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">E-Mail</Label>
                        <Input id="email" type="email" placeholder="ihre@email.de" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="message">Nachricht</Label>
                        <Textarea id="message" placeholder="Ihre Nachricht an uns..." />
                    </div>
                    <Button type="submit" className="w-full">Nachricht senden</Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}

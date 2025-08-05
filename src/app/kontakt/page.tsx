
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const contactFormSchema = z.object({
  name: z.string().min(1, { message: "Bitte geben Sie Ihren Namen ein." }),
  email: z.string().email({ message: "Bitte geben Sie eine gültige E-Mail-Adresse ein." }),
  message: z.string().min(10, { message: "Ihre Nachricht muss mindestens 10 Zeichen lang sein." }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function KontaktPage() {
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit: SubmitHandler<ContactFormValues> = (data) => {
    // Hier würde die Logik zum Senden der E-Mail (z.B. über eine Server Action mit Brevo) stehen.
    // Fürs Erste simulieren wir den Erfolg.
    console.log(data);

    toast({
      title: "Nachricht gesendet!",
      description: "Vielen Dank für Ihre Kontaktaufnahme. Wir werden uns so schnell wie möglich bei Ihnen melden.",
    });
    
    reset();
  };

  return (
    <div className="container mx-auto w-full max-w-xl">
        <Card>
            <CardHeader>
                <CardTitle>Kontaktformular</CardTitle>
                <CardDescription>
                    Haben Sie Fragen oder Anregungen? Schreiben Sie uns eine Nachricht.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input id="name" {...register("name")} placeholder="Ihr Name" />
                        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">E-Mail *</Label>
                        <Input id="email" type="email" {...register("email")} placeholder="ihre@email.de" />
                        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="message">Nachricht *</Label>
                        <Textarea id="message" {...register("message")} placeholder="Ihre Nachricht an uns..." />
                        {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
                    </div>
                    <Button type="submit" className="w-full">Nachricht senden</Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}

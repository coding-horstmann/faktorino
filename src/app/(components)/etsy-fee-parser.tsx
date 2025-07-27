
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Upload, FileSignature } from 'lucide-react';

const formSchema = z.object({
  pdfFile: z.any().refine(files => files?.length === 1, 'Bitte wählen Sie eine PDF-Datei aus.'),
});

type FormValues = z.infer<typeof formSchema>;

export function EtsyFeeParser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setError(null);
    // Placeholder for PDF parsing logic
    console.log('PDF-Datei:', values.pdfFile[0]);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing
    // setError('Die PDF-Verarbeitung ist noch nicht implementiert.');
    setIsLoading(false);
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <FileSignature className="text-primary"/>
            Schritt 2: Etsy-Gebühren aus Abrechnungs-PDF extrahieren
        </CardTitle>
        <CardDescription>
            Laden Sie Ihre monatliche Abrechnungs-PDF von Etsy hoch, um die Gebühren automatisch zu erfassen.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            <FormField
              control={form.control}
              name="pdfFile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etsy-Abrechnungs-PDF</FormLabel>
                  <FormControl>
                    <Input 
                        type="file" 
                        accept=".pdf"
                        onChange={(e) => field.onChange(e.target.files)}
                        disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verarbeite PDF...
                </>
              ) : (
                <>
                  <Upload className="mr-2"/>
                  Gebühren extrahieren
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </Card>
  );
}

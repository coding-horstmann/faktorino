
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle, Upload, FileSignature, Wallet } from 'lucide-react';
import { extractFeesFromPdfAction } from '@/app/actions';


const formSchema = z.object({
  pdfFile: z.instanceof(FileList).refine(files => files?.length === 1, 'Bitte wählen Sie eine PDF-Datei aus.'),
});

type FormValues = z.infer<typeof formSchema>;

type FeeResult = {
  total: number;
  date: string;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};


export function EtsyFeeParser() {
  const [result, setResult] = useState<FeeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const fileRef = form.register("pdfFile");

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('pdfFile', values.pdfFile[0]);

    try {
        const response = await extractFeesFromPdfAction(formData);
        if (response.error) {
            setError(response.error);
        } else if (response.data) {
            setResult(response.data);
        }
    } catch(err: any) {
        console.error("Error calling server action:", err);
        setError(err.message || "Fehler bei der Kommunikation mit dem Server.");
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="text-primary"/>
            Schritt 2: Gebühren aus Etsy-Abrechnung
          </CardTitle>
          <CardDescription>
            Laden Sie Ihre monatliche Etsy-Abrechnungs-PDF hoch, um die Gesamtgebühren automatisch zu extrahieren.
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
                          {...fileRef}
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
                    Extrahiere Daten...
                  </>
                ) : (
                  'Gebühren extrahieren'
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="animate-in fade-in-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="text-primary"/>
              Extrahierte Gebühren
            </CardTitle>
             <CardDescription>
                Abrechnungsdatum: {result.date}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategorie</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Gesamtgebühren (Total)</TableCell>
                  <TableCell className="text-right font-bold text-red-600">{formatCurrency(result.total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

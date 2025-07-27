
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { extractFeesFromPdfAction, type FeeExtractionResult } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle, Upload, FileSignature, Wallet } from 'lucide-react';

const formSchema = z.object({
  pdfFile: z.any().refine(files => files?.length === 1, 'Bitte wählen Sie eine PDF-Datei aus.'),
});

type FormValues = z.infer<typeof formSchema>;

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

export function EtsyFeeParser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FeeExtractionResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const readFileAsDataURI = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
      });
  };

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const file = values.pdfFile[0];
      const dataUri = await readFileAsDataURI(file);
      
      const response = await extractFeesFromPdfAction(dataUri);

      if (response.error) {
        setError(response.error);
      } else {
        setResult(response.data);
      }
    } catch (e) {
      console.error(e);
      setError('Ein unerwarteter Fehler ist beim Verarbeiten der Datei aufgetreten.');
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
                            accept="application/pdf"
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
                      Analysiere PDF...
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

        {result && (
            <Card className="animate-in fade-in-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="text-primary"/>
                        Extrahierte Gebühren & Umsätze
                    </CardTitle>
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
                                <TableCell className="font-medium">Umsätze</TableCell>
                                <TableCell className="text-right font-bold text-green-600">{formatCurrency(result.summary.sales)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Gebühren & Steuern</TableCell>
                                <TableCell className="text-right font-bold text-red-600">{formatCurrency(result.summary.feesAndTaxes)}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell className="font-medium">Nettobetrag</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(result.summary.netAmount)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    <h3 className="text-lg font-semibold mt-6 mb-2">Aufschlüsselung der Gebühren</h3>
                    <Table>
                        <TableHeader>
                             <TableRow>
                                <TableHead>Gebührenart</TableHead>
                                <TableHead className="text-right">Betrag</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {result.fees.map((fee, index) => (
                                <TableRow key={index}>
                                    <TableCell>{fee.description}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(fee.amount)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )}
    </div>
  );
}

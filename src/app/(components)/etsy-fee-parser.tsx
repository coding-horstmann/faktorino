
'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { extractFeesFromPdfAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle, FileSignature, Upload, Wallet } from 'lucide-react';

const formSchema = z.object({
  pdfFile: z.any().refine(files => files?.length === 1, 'Bitte wählen Sie eine PDF-Datei aus.'),
});

type FormValues = z.infer<typeof formSchema>;
type FeeResult = {
  summary: {
    sales: number;
    feesAndTaxes: number;
    netAmount: number;
  }
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

export function EtsyFeeParser() {
  const [result, setResult] = useState<FeeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const file = values.pdfFile[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        const pdfDataUri = e.target?.result as string;
        const response = await extractFeesFromPdfAction(pdfDataUri);
        if (response.error) {
            setError(response.error);
        } else if (response.data) {
            setResult(response.data);
        }
        setIsLoading(false);
    };

    reader.onerror = () => {
        setError("Fehler beim Lesen der Datei.");
        setIsLoading(false);
    }
    
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <FileSignature className="text-primary"/>
                Schritt 2: Gebühren aus Etsy-Abrechnung extrahieren
            </CardTitle>
            <CardDescription>
                Laden Sie Ihre monatliche Etsy-Abrechnungs-PDF hoch, um die Gebühren automatisch zu extrahieren.
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
                            <div className="relative">
                                <Input 
                                    type="file" 
                                    accept=".pdf"
                                    className="pr-20"
                                    ref={fileInputRef}
                                    onChange={(e) => field.onChange(e.target.files)}
                                />
                                <Button 
                                    type="button"
                                    size="sm"
                                    className="absolute right-1 top-1/2 -translate-y-1/2"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isLoading}
                                >
                                    <Upload className="mr-2"/>
                                    Datei wählen
                                </Button>
                            </div>
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
                        Zusammenfassung Ihrer Abrechnung
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
                </CardContent>
            </Card>
        )}
    </div>
  );
}

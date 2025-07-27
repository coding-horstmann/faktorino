
'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateInvoicesAction, type ProcessCsvOutput, type Invoice } from '@/app/actions';
import { generatePdf } from '@/lib/pdf-generator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle, Upload, FileText, Download, PieChart, Euro } from 'lucide-react';

const formSchema = z.object({
  csvFile: z.any().refine(files => files?.length === 1, 'Bitte wählen Sie eine CSV-Datei aus.'),
});

type FormValues = z.infer<typeof formSchema>;

export function InvoiceGenerator() {
  const [result, setResult] = useState<ProcessCsvOutput | null>(null);
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

    const file = values.csvFile[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      const csvData = e.target?.result as string;
      const response = await generateInvoicesAction(csvData);
      if (response.error) {
        setError(response.error);
      } else {
        setResult(response.data);
      }
      setIsLoading(false);
    };

    reader.onerror = () => {
        setError("Fehler beim Lesen der Datei.");
        setIsLoading(false);
    }

    reader.readAsText(file, 'UTF-8');
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };
  
  const handleDownloadPdf = (invoice: Invoice) => {
    generatePdf(invoice);
  };

  return (
    <div className="space-y-6">
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="text-primary"/>
            Schritt 1: Rechnungen generieren
          </CardTitle>
          <CardDescription>
            Laden Sie Ihre Etsy-Bestell-CSV-Datei hoch, um automatisch Rechnungen zu erstellen und eine Umsatzübersicht zu erhalten.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
              <FormField
                control={form.control}
                name="csvFile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etsy-Bestell-CSV</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Input 
                                type="file" 
                                accept=".csv"
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
                    Verarbeite Daten...
                  </>
                ) : (
                  'Rechnungen generieren'
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
        <div className="space-y-6 animate-in fade-in-50">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PieChart className="text-primary"/>
                        Zusammenfassung
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
                    <div className="p-4 bg-secondary rounded-lg flex items-center justify-between">
                        <span className="font-medium">Netto-Umsätze Gesamt:</span>
                        <span className="font-bold text-accent-foreground">{formatCurrency(result.summary.totalNetSales)}</span>
                    </div>
                     <div className="p-4 bg-secondary rounded-lg flex items-center justify-between">
                        <span className="font-medium">Umsatzsteuer Gesamt (19%):</span>
                        <span className="font-bold text-accent-foreground">{formatCurrency(result.summary.totalVat)}</span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Euro className="text-primary"/>
                        Generierte Rechnungen ({result.invoices.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rechnungsnr.</TableHead>
                                    <TableHead>Datum</TableHead>
                                    <TableHead>Käufer</TableHead>
                                    <TableHead>Land</TableHead>
                                    <TableHead className="text-right">Betrag</TableHead>
                                    <TableHead className="text-center">Aktion</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {result.invoices.map((invoice) => (
                                    <TableRow key={invoice.invoiceNumber}>
                                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                        <TableCell>{invoice.orderDate}</TableCell>
                                        <TableCell>{invoice.buyerName}</TableCell>
                                        <TableCell>{invoice.country}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(invoice.grossTotal)}</TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(invoice)}>
                                                <Download className="mr-2"/>
                                                PDF
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}

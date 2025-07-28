
'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateInvoicesAction, type ProcessCsvOutput, type Invoice } from '@/app/actions';
import { generatePdf, type UserInfo } from '@/lib/pdf-generator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle, Upload, FileText, Download, PieChart, Euro, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  csvFiles: z.any().refine((files) => files?.length >= 1, 'Bitte wählen Sie mindestens eine CSV-Datei aus.'),
});

type FormValues = z.infer<typeof formSchema>;

interface InvoiceGeneratorProps {
  onInvoicesGenerated: (grossTotal: number) => void;
  userInfo: UserInfo;
}

export function InvoiceGenerator({ onInvoicesGenerated, userInfo }: InvoiceGeneratorProps) {
  const [result, setResult] = useState<ProcessCsvOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const files = values.csvFiles;
    let combinedCsvData = '';
    const fileReadPromises = [];

    for (const file of files) {
        fileReadPromises.push(
            new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target?.result as string;
                    // Remove header from all but the first file
                    const lines = content.split('\n');
                    if (combinedCsvData !== '') {
                        resolve(lines.slice(1).join('\n'));
                    } else {
                        resolve(content);
                    }
                };
                reader.onerror = (e) => reject(`Fehler beim Lesen der Datei ${file.name}`);
                reader.readAsText(file, 'UTF-8');
            })
        );
    }

    try {
        const allCsvContents = await Promise.all(fileReadPromises);
        combinedCsvData = allCsvContents.join('\n');
        
        if (!combinedCsvData.trim()) {
            setError("Die ausgewählten Dateien sind leer oder ungültig.");
            setIsLoading(false);
            return;
        }

        const response = await generateInvoicesAction(combinedCsvData);
        if (response.error) {
            setError(response.error);
        } else if (response.data) {
            setResult(response.data);
            const totalGross = response.data.invoices.reduce((sum, inv) => sum + inv.grossTotal, 0);
            onInvoicesGenerated(totalGross);
        }
    } catch (err: any) {
         setError(err.message || "Fehler beim Lesen der Dateien.");
    } finally {
        setIsLoading(false);
    }
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };
  
  const handleDownloadPdf = (invoice: Invoice) => {
    if (!userInfo || !userInfo.name) {
        alert("Bitte füllen Sie zuerst die Pflichtangaben für die Rechnungserstellung aus.");
        return;
    }
    generatePdf(invoice, userInfo);
  };

  const getClassificationBadge = (classification: Invoice['countryClassification']) => {
    switch (classification) {
        case 'Deutschland':
            return <Badge variant="default">DE</Badge>;
        case 'EU-Ausland':
            return <Badge variant="secondary">EU</Badge>;
        case 'Drittland':
            return <Badge variant="outline">Welt</Badge>;
        default:
            return null;
    }
  };


  return (
    <div className="space-y-6">
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="text-primary"/>
            1. Etsy-Bestellungen hochladen
          </CardTitle>
          <CardDescription>
            Laden Sie Ihre Etsy-Bestell-CSV-Dateien hoch. Sie können mehrere Dateien auswählen.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
              <FormField
                control={form.control}
                name="csvFiles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etsy-Bestell-CSV(s)</FormLabel>
                    <FormControl>
                      <Input 
                          type="file" 
                          accept=".csv"
                          multiple
                          onChange={(e) => field.onChange(e.target.files)}
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
                                    <TableHead>Klassifizierung</TableHead>
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
                                        <TableCell>{getClassificationBadge(invoice.countryClassification)}</TableCell>
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


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
import { Loader2, AlertTriangle, Wallet, Upload } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Configure the worker for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const formSchema = z.object({
  pdfFiles: z.any().refine((files) => files?.length >= 1, 'Bitte wählen Sie mindestens eine PDF-Datei aus.'),
});

type FormValues = z.infer<typeof formSchema>;

type FeeResult = {
  total: number;
  sources: { fileName: string; total: number; date: string }[];
};

interface EtsyFeeParserProps {
  onFeesParsed: (totalFees: number) => void;
}

const parseFloatSafe = (value: string | null | undefined): number => {
    if (!value) return 0;
    const cleanedValue = value.trim().replace(/\s/g, '');
    
    const lastComma = cleanedValue.lastIndexOf(',');
    const lastDot = cleanedValue.lastIndexOf('.');

    let parsableValue: string;

    if (lastComma > lastDot) {
        parsableValue = cleanedValue.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
        parsableValue = cleanedValue.replace(/,/g, '');
    } else {
        parsableValue = cleanedValue.replace(',', '.');
    }
    
    const parsed = parseFloat(parsableValue);
    return isNaN(parsed) ? 0 : parsed;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};


export function EtsyFeeParser({ onFeesParsed }: EtsyFeeParserProps) {
  const [result, setResult] = useState<FeeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const files = values.pdfFiles;
    if (!files || files.length === 0) {
        setError("Keine Dateien ausgewählt.");
        setIsLoading(false);
        return;
    }

    let grandTotal = 0;
    const sources: FeeResult['sources'] = [];

    try {
      for (const file of files) {
          const arrayBuffer = await file.arrayBuffer();
          const data = new Uint8Array(arrayBuffer);
          const doc = await pdfjs.getDocument(data).promise;
          let fullText = '';
          
          for (let i = 1; i <= doc.numPages; i++) {
              const page = await doc.getPage(i);
              const content = await page.getTextContent();
              const pageText = content.items.map(item => ('str' in item ? item.str : '')).join(' ');
              fullText += pageText + '\n';
          }

          const totalRegex = /(?:Total|Subtotal)\s*€?\s*([\d,]+\.?\d*)/gi;
          let lastMatch: string | null = null;
          let match;
          
          while ((match = totalRegex.exec(fullText)) !== null) {
              lastMatch = match[1];
          }
          
          let fileTotal = 0;
          if (lastMatch) {
              fileTotal = parseFloatSafe(lastMatch);
          }

          const dateRegex = /(?:Invoice Date|Rechnungsdatum):\s*(\d{1,2}[\s.]\w+[\s.]\d{4}|\w+\s\d{1,2},\s\d{4}|\d{1,2}\.\d{1,2}\.\d{4})/i;
          const dateMatch = fullText.match(dateRegex);
          const date = dateMatch && dateMatch[1] ? dateMatch[1].trim() : 'N/A';
          
          if(fileTotal > 0) {
            grandTotal += fileTotal;
            sources.push({ fileName: file.name, total: fileTotal, date });
          }
      }
        
      if (grandTotal === 0) {
           setError("Gesamtgebühr (Total/Subtotal) konnte in den PDFs nicht gefunden werden. Bitte stellen Sie sicher, dass es sich um gültige Etsy-Abrechnungen handelt.");
      } else {
          setResult({ total: grandTotal, sources });
          onFeesParsed(grandTotal);
      }

    } catch(err: any) {
        console.error("Error processing PDF in browser:", err);
        setError(err.message || "Fehler beim Verarbeiten der PDF-Datei(en) im Browser.");
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="text-primary"/>
            2. Etsy-Abrechnungen hochladen
          </CardTitle>
          <CardDescription>
            Laden Sie Ihre monatlichen Etsy-Abrechnungs-PDFs hoch, um die Gesamtgebühren automatisch zu extrahieren. Sie können mehrere Dateien auswählen.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
              <FormField
                control={form.control}
                name="pdfFiles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etsy-Abrechnungs-PDF(s)</FormLabel>
                    <FormControl>
                        <Input
                          type="file"
                          accept=".pdf"
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
                Gesamtsumme aus {result.sources.length} Datei(en).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datei</TableHead>
                  <TableHead>Abrechnungsdatum</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.sources.map((source, index) => (
                    <TableRow key={index}>
                        <TableCell className="font-medium">{source.fileName}</TableCell>
                        <TableCell>{source.date}</TableCell>
                        <TableCell className="text-right">{formatCurrency(source.total)}</TableCell>
                    </TableRow>
                ))}
                <TableRow className="font-bold bg-secondary">
                  <TableCell colSpan={2}>Gesamtgebühren (Total)</TableCell>
                  <TableCell className="text-right text-red-600">{formatCurrency(result.total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

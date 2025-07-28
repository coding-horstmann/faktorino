
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { processBankStatementAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Scale, Banknote, AlertCircle, CheckCircle2, Loader2, Upload, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  csvFile: z.any().refine((files) => files?.length === 1, 'Bitte wählen Sie eine CSV-Datei aus.'),
});

type FormValues = z.infer<typeof formSchema>;

interface PayoutValidatorProps {
  grossInvoices: number | null;
  totalFees: number | null;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

export function PayoutValidator({ grossInvoices, totalFees }: PayoutValidatorProps) {
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [bankStatementTotal, setBankStatementTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const isReadyForValidation = grossInvoices !== null && totalFees !== null && bankStatementTotal !== null;

  async function onUpload(values: FormValues) {
    setIsLoading(true);
    setError(null);
    setBankStatementTotal(null);
    setValidationResult(null);

    const file = values.csvFile[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        const csvData = e.target?.result as string;
        const response = await processBankStatementAction(csvData);
        if (response.error) {
            setError(response.error);
        } else if (response.data !== null) {
            setBankStatementTotal(response.data);
            if (grossInvoices !== null && totalFees !== null) {
                validatePayout(grossInvoices, totalFees, response.data);
            }
        }
        setIsLoading(false);
    };

    reader.onerror = () => {
        setError("Fehler beim Lesen der Datei.");
        setIsLoading(false);
    }

    reader.readAsText(file, 'UTF-8');
  }

  function validatePayout(gross: number, fees: number, payout: number) {
    const expectedPayout = gross - fees;
    const difference = payout - expectedPayout;

    setValidationResult({
        payoutAmount: payout,
        grossInvoices: gross,
        totalFees: -fees, // Show fees as a negative number
        expectedPayout,
        difference,
    });
  }

  return (
    <div className="space-y-6">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Upload className="text-primary"/>
                Schritt 3: Kontoauszug hochladen & prüfen
            </CardTitle>
            <CardDescription>
                Laden Sie einen CSV-Export Ihres Kontoauszugs hoch. Das Tool summiert automatisch alle Gutschriften von Etsy und Zahlungen an Etsy.
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpload)}>
              <CardContent>
                <FormField
                    control={form.control}
                    name="csvFile"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Kontoauszug (CSV-Datei)</FormLabel>
                        <FormControl>
                            <Input type="file" accept=".csv" onChange={(e) => field.onChange(e.target.files)} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verarbeite...
                      </>
                    ) : (
                      'Kontoauszug verarbeiten'
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

        {bankStatementTotal !== null && (
             <Card className="animate-in fade-in-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                         <Banknote className="text-primary"/>
                        Summe der Etsy-Transaktionen
                    </CardTitle>
                     <CardDescription>
                        Dieser Betrag wurde aus Ihrem Kontoauszug berechnet.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-center p-4">
                        {formatCurrency(bankStatementTotal)}
                    </div>
                </CardContent>
             </Card>
        )}

        {validationResult && (
            <Card className="animate-in fade-in-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                         <Scale className="text-primary"/>
                        Validierungs-Ergebnis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell>Rechnungen Brutto (aus Schritt 1)</TableCell>
                                <TableCell className="text-right">{formatCurrency(validationResult.grossInvoices)}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell>Etsy-Gebühren (aus Schritt 2)</TableCell>
                                <TableCell className="text-right text-red-600">{formatCurrency(validationResult.totalFees)}</TableCell>
                            </TableRow>
                             <TableRow className="font-bold border-t-2">
                                <TableCell>Erwartete Auszahlung</TableCell>
                                <TableCell className="text-right">{formatCurrency(validationResult.expectedPayout)}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell>Tatsächliche Auszahlung (aus Kontoauszug)</TableCell>
                                <TableCell className="text-right">{formatCurrency(validationResult.payoutAmount)}</TableCell>
                            </TableRow>
                            <TableRow className={`font-extrabold ${Math.abs(validationResult.difference) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                                <TableCell className="flex items-center gap-2">
                                     {Math.abs(validationResult.difference) > 0.01 ? <AlertCircle/> : <CheckCircle2/>}
                                    Differenz
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(validationResult.difference)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )}

        {!validationResult && isReadyForValidation && (
            <div className="text-center p-4">
                 <Button onClick={() => validatePayout(grossInvoices!, totalFees!, bankStatementTotal!)}>
                    <Scale className="mr-2"/>
                    Jetzt mit Schritt 1 & 2 abgleichen
                </Button>
            </div>
        )}
    </div>
  );
}

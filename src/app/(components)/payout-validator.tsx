
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Scale, Banknote, AlertCircle, CheckCircle2, Loader2, Upload, AlertTriangle, List } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { processBankStatementAction, type BankTransaction } from '@/app/actions';

const formSchema = z.object({
  csvFiles: z.any().refine((files) => files?.length >= 1, 'Bitte wählen Sie mindestens eine CSV-Datei aus.'),
});

type FormValues = z.infer<typeof formSchema>;

interface PayoutValidatorProps {
  grossInvoices: number | null;
  totalFees: number | null;
  onPayoutValidated: (payout: number | null, result: any, transactions: BankTransaction[]) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

export function PayoutValidator({ grossInvoices, totalFees, onPayoutValidated }: PayoutValidatorProps) {
  const [bankStatementTotal, setBankStatementTotal] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const validatePayout = useCallback((payout: number | null, allTransactions: BankTransaction[]) => {
    const gross = grossInvoices ?? 0;
    const fees = totalFees ?? 0;
    const expectedPayout = gross + fees;
    const difference = payout !== null ? payout - expectedPayout : null;
    const result = {
        payoutAmount: payout,
        grossInvoices: grossInvoices,
        totalFees: totalFees,
        expectedPayout: (grossInvoices !== null && totalFees !== null) ? expectedPayout : null,
        difference,
    };
    onPayoutValidated(payout, result, allTransactions);
  }, [grossInvoices, totalFees, onPayoutValidated]);

  useEffect(() => {
    // Re-validate if invoices or fees change after payout is known
    if (bankStatementTotal !== null) {
      validatePayout(bankStatementTotal, transactions);
    }
  }, [grossInvoices, totalFees, bankStatementTotal, transactions, validatePayout]);


  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setError(null);
    setBankStatementTotal(null);
    setTransactions([]);

    const files = Array.from(values.csvFiles as FileList);
    if (!files || files.length === 0) {
        setError("Keine Dateien ausgewählt.");
        setIsLoading(false);
        return;
    }
    
    let cumulativeAmount = 0;
    let cumulativeTransactions: BankTransaction[] = [];
    let cumulativeFoundEtsy = false;
    let processingError: string | null = null;

    try {
      for (const file of files) {
          const fileContent = await file.text();
          const result = await processBankStatementAction(fileContent);

          if (result.error) {
              // Store first error and stop processing
              processingError = `Fehler in Datei '${file.name}': ${result.error}`;
              break; 
          }
          
          if (result.totalAmount !== undefined && result.transactions) {
              cumulativeAmount += result.totalAmount;
              cumulativeTransactions.push(...result.transactions);
              if(result.foundEtsyTransaction) {
                cumulativeFoundEtsy = true;
              }
          }
      }

      if (processingError) {
          setError(processingError);
          // Reset previous results if any
          setBankStatementTotal(null);
          setTransactions([]);
          validatePayout(null, []);
      } else {
          if (!cumulativeFoundEtsy) {
              setError("Keine Transaktionen mit dem Stichwort 'Etsy' in den hochgeladenen CSV-Dateien gefunden.");
              setBankStatementTotal(0);
              setTransactions([]);
              validatePayout(0, []);
          } else {
              setBankStatementTotal(cumulativeAmount);
              setTransactions(cumulativeTransactions);
              validatePayout(cumulativeAmount, cumulativeTransactions);
          }
      }

    } catch(err: any) {
        console.error("Error processing CSVs:", err);
        setError(err.message || "Fehler beim Verarbeiten der CSV-Dateien.");
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
                3. Kontoauszüge hochladen
            </CardTitle>
            <CardDescription>
                Laden Sie CSV-Exporte Ihrer Kontoauszüge hoch. Das Tool summiert automatisch alle Gutschriften von Etsy. Sie können mehrere Dateien von verschiedenen Banken auswählen.
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
                        <FormLabel>Kontoauszug (CSV-Datei(en))</FormLabel>
                        <FormControl>
                            <Input type="file" accept=".csv" multiple onChange={(e) => field.onChange(e.target.files)} />
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
                      'Kontoauszüge verarbeiten'
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
                        Dieser Betrag wurde aus Ihren hochgeladenen Kontoauszügen berechnet.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-center p-4">
                        {formatCurrency(bankStatementTotal)}
                    </div>
                     {transactions.length > 0 && (
                        <div className="mt-6">
                            <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <List className="text-primary"/>
                                Erkannte Etsy-Transaktionen aus Kontoauszug
                            </h4>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Datum</TableHead>
                                            <TableHead>Beschreibung</TableHead>
                                            <TableHead className="text-right">Betrag</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.map((t, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{t.date}</TableCell>
                                                <TableCell>{t.description}</TableCell>
                                                <TableCell className={`text-right font-medium ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </CardContent>
             </Card>
        )}
    </div>
  );
}


export function ValidationResultDisplay({ result }: { result: any }) {

    const formatCurrency = (value: number | null) => {
        if(value === null || value === undefined) return '-';
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    };

    const isComplete = result.grossInvoices !== null && result.totalFees !== null && result.payoutAmount !== null;
    const difference = result.difference;

    return (
        <Card className="animate-in fade-in-50 mt-8 border-primary border-2 shadow-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                     <Scale className="text-primary"/>
                    Finale Prüfung & Übersicht
                </CardTitle>
                <CardDescription>
                    Dies ist die finale Gegenüberstellung Ihrer Einnahmen, Gebühren und der tatsächlichen Auszahlung.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell className="text-base">Rechnungen Brutto (aus Etsy-Rechnungen)</TableCell>
                            <TableCell className="text-right text-base font-medium">{formatCurrency(result.grossInvoices)}</TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell className="text-base">Etsy-Gebühren (aus Etsy-Abrechnung)</TableCell>
                            <TableCell className="text-right text-base font-medium text-red-600">{formatCurrency(result.totalFees)}</TableCell>
                        </TableRow>
                         <TableRow className="font-bold border-t-2">
                            <TableCell className="text-base">Erwartete Auszahlung</TableCell>
                            <TableCell className="text-right text-base">{formatCurrency(result.expectedPayout)}</TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell className="text-base">Tatsächliche Auszahlung (aus Kontoauszug)</TableCell>
                            <TableCell className="text-right text-base font-medium">{formatCurrency(result.payoutAmount)}</TableCell>
                        </TableRow>
                         {isComplete && difference !== null && (
                            <TableRow className={`font-extrabold ${Math.abs(difference) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                                <TableCell className="flex items-center gap-2 text-lg">
                                    {Math.abs(difference) > 0.01 ? <AlertCircle/> : <CheckCircle2/>}
                                    Differenz
                                </TableCell>
                                <TableCell className="text-right text-lg">{formatCurrency(difference)}</TableCell>
                            </TableRow>
                         )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )

}

    
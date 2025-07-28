
'use client';

import { useState, useEffect } from 'react';
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
  csvFile: z.any().refine((files) => files?.length === 1, 'Bitte wählen Sie eine CSV-Datei aus.'),
});

type FormValues = z.infer<typeof formSchema>;

interface PayoutValidatorProps {
  grossInvoices: number | null;
  totalFees: number | null;
  onPayoutValidated: (payout: number, result: any, transactions: BankTransaction[]) => void;
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

  useEffect(() => {
    if (grossInvoices !== null && totalFees !== null && bankStatementTotal !== null) {
      validatePayout(grossInvoices, totalFees, bankStatementTotal);
    }
  }, [grossInvoices, totalFees, bankStatementTotal]);


  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setError(null);
    setBankStatementTotal(null);
    setTransactions([]);

    const file = values.csvFile[0];
    if (!file) {
        setError("Keine Datei ausgewählt.");
        setIsLoading(false);
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const csvData = e.target?.result as string;
        try {
            const result = await processBankStatementAction(csvData);
            if (result.error) {
                setError(result.error);
            } else if (result.totalAmount !== undefined && result.transactions) {
                if (result.totalAmount === 0 && !result.foundEtsyTransaction) {
                     setError("Keine Transaktionen mit dem Stichwort 'Etsy' in der CSV-Datei gefunden.");
                } else {
                    setBankStatementTotal(result.totalAmount);
                    setTransactions(result.transactions);
                     if (grossInvoices !== null && totalFees !== null) {
                        validatePayout(grossInvoices, totalFees, result.totalAmount, result.transactions);
                    }
                }
            }
        } catch (err: any) {
             console.error("Error processing CSV:", err);
             setError(err.message || "Fehler beim Verarbeiten der CSV-Datei.");
        } finally {
            setIsLoading(false);
        }
    };
    reader.onerror = () => {
        setError("Fehler beim Lesen der Datei.");
        setIsLoading(false);
    };
    reader.readAsText(file, 'UTF-8');
  }

  function validatePayout(gross: number, fees: number, payout: number, transactions: BankTransaction[]) {
    const expectedPayout = gross - fees;
    const difference = payout - expectedPayout;
    const result = {
        payoutAmount: payout,
        grossInvoices: gross,
        totalFees: -fees, // Show fees as a negative number
        expectedPayout,
        difference,
    };
    onPayoutValidated(payout, result, transactions);
  }

  return (
    <div className="space-y-6">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Upload className="text-primary"/>
                3. Kontoauszug hochladen
            </CardTitle>
            <CardDescription>
                Laden Sie einen CSV-Export Ihres Kontoauszugs hoch. Das Tool summiert automatisch alle Gutschriften von Etsy und Zahlungen an Etsy.
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
                <Button type="submit" className="w-full" disabled={isLoading || bankStatementTotal !== null}>
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

        {transactions.length > 0 && (
            <Card className="animate-in fade-in-50">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <List className="text-primary"/>
                        Erkannte Etsy-Transaktionen
                    </CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>
        )}
    </div>
  );
}


export function ValidationResultDisplay({ result }: { result: any }) {

    const formatCurrency = (value: number) => {
        if(value === null || value === undefined) return '-';
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    };

    const isComplete = result.grossInvoices !== null && result.totalFees !== null && result.payoutAmount !== null;
    const difference = isComplete ? result.payoutAmount - (result.grossInvoices + result.totalFees) : null;

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
                            <TableCell className="text-right text-base">{formatCurrency(result.grossInvoices)}</TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell className="text-base">Etsy-Gebühren (aus Etsy-Abrechnung)</TableCell>
                            <TableCell className="text-right text-base text-red-600">{formatCurrency(result.totalFees)}</TableCell>
                        </TableRow>
                         <TableRow className="font-bold border-t-2">
                            <TableCell className="text-base">Erwartete Auszahlung</TableCell>
                            <TableCell className="text-right text-base">{formatCurrency(isComplete ? result.grossInvoices + result.totalFees : null)}</TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell className="text-base">Tatsächliche Auszahlung (aus Kontoauszug)</TableCell>
                            <TableCell className="text-right text-base">{formatCurrency(result.payoutAmount)}</TableCell>
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

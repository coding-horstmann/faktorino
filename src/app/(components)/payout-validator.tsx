
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Scale, Banknote, AlertCircle, CheckCircle2 } from 'lucide-react';

const formSchema = z.object({
    payoutAmount: z.string().min(1, 'Bitte geben Sie einen Wert ein.'),
});

type FormValues = z.infer<typeof formSchema>;

const parseFloatFromString = (value: string) => {
    return parseFloat(value.replace('.', '').replace(',', '.'));
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

export function PayoutValidator() {
  const [result, setResult] = useState<any | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        payoutAmount: '',
    }
  });

  // Dummy data for now
  const grossInvoices = 1500.50; 
  const totalFees = -150.20;

  function onSubmit(values: FormValues) {
    const payoutAmount = parseFloatFromString(values.payoutAmount);
    const expectedPayout = grossInvoices + totalFees;
    const difference = payoutAmount - expectedPayout;

    setResult({
        payoutAmount,
        grossInvoices,
        totalFees,
        expectedPayout,
        difference,
    });
  }

  return (
    <div className="space-y-6">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Scale className="text-primary"/>
                Schritt 3: Auszahlungs-Prüfung
            </CardTitle>
            <CardDescription>
                Geben Sie den Betrag ein, der von Etsy auf Ihr Konto ausgezahlt wurde, um ihn mit den erwarteten Einnahmen abzugleichen.
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent>
                <FormField
                    control={form.control}
                    name="payoutAmount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tatsächliche Auszahlung von Etsy (€)</FormLabel>
                        <FormControl>
                            <Input type="text" placeholder="z.B. 1.350,30" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">
                    Auszahlung prüfen
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {result && (
            <Card className="animate-in fade-in-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                         <Banknote className="text-primary"/>
                        Validierungs-Ergebnis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell>Rechnungen Brutto (aus Schritt 1)</TableCell>
                                <TableCell className="text-right">{formatCurrency(result.grossInvoices)}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell>Etsy-Gebühren (aus Schritt 2)</TableCell>
                                <TableCell className="text-right">{formatCurrency(result.totalFees)}</TableCell>
                            </TableRow>
                             <TableRow className="font-bold border-t-2">
                                <TableCell>Erwartete Auszahlung</TableCell>
                                <TableCell className="text-right">{formatCurrency(result.expectedPayout)}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell>Tatsächliche Auszahlung</TableCell>
                                <TableCell className="text-right">{formatCurrency(result.payoutAmount)}</TableCell>
                            </TableRow>
                            <TableRow className={`font-extrabold ${Math.abs(result.difference) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                                <TableCell className="flex items-center gap-2">
                                     {Math.abs(result.difference) > 0.01 ? <AlertCircle/> : <CheckCircle2/>}
                                    Differenz
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(result.difference)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )}
    </div>
  );
}

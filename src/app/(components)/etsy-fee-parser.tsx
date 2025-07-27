
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
import { FileSignature, Wallet, Info } from 'lucide-react';

const formSchema = z.object({
  totalFees: z.string().min(1, 'Bitte geben Sie den Betrag ein.'),
  netAmount: z.string().min(1, 'Bitte geben Sie den Betrag ein.'),
  sales: z.string().min(1, 'Bitte geben Sie den Betrag ein.'),
});

type FormValues = z.infer<typeof formSchema>;

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

export function EtsyFeeParser() {
  const [result, setResult] = useState<{ summary: { sales: number; feesAndTaxes: number; netAmount: number; } } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      totalFees: "0",
      netAmount: "0",
      sales: "0",
    }
  });

  function onSubmit(values: FormValues) {
    const sales = parseFloat(values.sales.replace(',', '.'));
    const feesAndTaxes = parseFloat(values.totalFees.replace(',', '.')) * -1; // Ensure fees are negative
    const netAmount = parseFloat(values.netAmount.replace(',', '.'));

    if (isNaN(sales) || isNaN(feesAndTaxes) || isNaN(netAmount)) {
        form.setError("root", { message: "Bitte geben Sie gültige Zahlen ein."});
        return;
    }

    setResult({
        summary: {
            sales,
            feesAndTaxes,
            netAmount,
        }
    });
  }

  return (
    <div className="space-y-6">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <FileSignature className="text-primary"/>
                Schritt 2: Gebühren aus Etsy-Abrechnung eintragen
            </CardTitle>
            <CardDescription>
                Bitte entnehmen Sie die folgenden Werte aus Ihrer monatlichen Etsy-Abrechnungs-PDF und tragen Sie sie hier ein.
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                 <FormField
                  control={form.control}
                  name="sales"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Umsatz (Gesamtsumme)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="totalFees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gebühren & Steuern (Gesamtsumme)</FormLabel>
                      <FormControl>
                         <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="netAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nettobetrag</FormLabel>
                      <FormControl>
                         <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">
                  Zusammenfassung anzeigen
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {result && (
            <Card className="animate-in fade-in-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="text-primary"/>
                        Zusammenfassung Ihrer Eingaben
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


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
import { FileSignature, Wallet, Calculator } from 'lucide-react';

const formSchema = z.object({
  sales: z.string().min(1, 'Bitte geben Sie einen Wert ein.'),
  feesAndTaxes: z.string().min(1, 'Bitte geben Sie einen Wert ein.'),
  netAmount: z.string().min(1, 'Bitte geben Sie einen Wert ein.'),
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

const parseFloatFromString = (value: string) => {
    return parseFloat(value.replace('.', '').replace(',', '.'));
}

export function EtsyFeeParser() {
  const [result, setResult] = useState<FeeResult | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        sales: '',
        feesAndTaxes: '',
        netAmount: '',
    }
  });

  function onSubmit(values: FormValues) {
    const newResult = {
        summary: {
            sales: parseFloatFromString(values.sales),
            feesAndTaxes: parseFloatFromString(values.feesAndTaxes) * -1, // Ensure it's negative
            netAmount: parseFloatFromString(values.netAmount),
        }
    };
    setResult(newResult);
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
                Öffnen Sie Ihre monatliche Etsy-Abrechnungs-PDF und übertragen Sie die summierten Werte in die entsprechenden Felder.
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
                        <FormLabel>Umsatz</FormLabel>
                        <FormControl>
                            <Input type="text" placeholder="z.B. 1.234,56" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="feesAndTaxes"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Gebühren & Steuern (als positiven Wert eingeben)</FormLabel>
                        <FormControl>
                             <Input type="text" placeholder="z.B. 123,45" {...field} />
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
                            <Input type="text" placeholder="z.B. 1.111,11" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">
                    <Calculator className="mr-2"/>
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

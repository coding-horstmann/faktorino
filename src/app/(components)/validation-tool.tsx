
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { validatePayoutAction, type ValidateEtsyPayoutOutput } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle2, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  totalInvoiceGrossAmount: z.coerce.number({invalid_type_error: "Bitte geben Sie eine Zahl ein."}).positive({ message: "Der Betrag muss positiv sein." }),
  totalEtsyFees: z.coerce.number({invalid_type_error: "Bitte geben Sie eine Zahl ein."}).min(0, { message: "Der Betrag darf nicht negativ sein." }),
  actualPayout: z.coerce.number({invalid_type_error: "Bitte geben Sie eine Zahl ein."}).min(0, { message: "Der Betrag darf nicht negativ sein." }),
});

type FormValues = z.infer<typeof formSchema>;

export function ValidationTool() {
  const [result, setResult] = useState<ValidateEtsyPayoutOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      totalInvoiceGrossAmount: undefined,
      totalEtsyFees: undefined,
      actualPayout: undefined,
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setError(null);
    setResult(null);
    const response = await validatePayoutAction(values);
    if (response.error) {
      setError(response.error);
    } else {
      setResult(response.data);
    }
    setIsLoading(false);
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <>
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="text-primary"/>
            Auszahlungs-Validierungstool
          </CardTitle>
          <CardDescription>
            Geben Sie Ihre Etsy-Zahlen ein, um die erwartete Auszahlung zu berechnen und mit der tatsächlichen Gutschrift zu vergleichen.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="totalInvoiceGrossAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brutto-Rechnungsbeträge Gesamt</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="z.B. 1250.50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalEtsyFees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etsy-Gebühren Gesamt</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="z.B. 125.75" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="actualPayout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tatsächliche Auszahlung von Etsy</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="z.B. 1124.75" {...field} />
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
                    Bitte warten...
                  </>
                ) : (
                  'Validieren'
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
        <Card className="mt-6 shadow-lg animate-in fade-in-50">
          <CardHeader>
            <CardTitle>Validierungsergebnis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Brutto-Rechnungsbeträge</span>
                <span className="font-medium">{formatCurrency(form.getValues('totalInvoiceGrossAmount'))}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">abzgl. Etsy-Gebühren</span>
                <span className="font-medium">- {formatCurrency(form.getValues('totalEtsyFees'))}</span>
            </div>
            <hr/>
            <div className="flex justify-between items-center font-bold">
                <span>Erwartete Auszahlung</span>
                <span>{formatCurrency(result.expectedPayout)}</span>
            </div>
             <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tatsächliche Gutschrift</span>
                <span className="font-medium">{formatCurrency(form.getValues('actualPayout'))}</span>
            </div>
             <div className={cn(
                "flex justify-between items-center font-bold p-2 rounded-md",
                result.isDiscrepancyPresent ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"
             )}>
                <span>Differenz</span>
                <span>{formatCurrency(result.difference)}</span>
            </div>
          </CardContent>
          <CardFooter>
             <Alert className={cn(result.isDiscrepancyPresent ? "border-destructive/50 text-destructive" : "border-accent-foreground/20 bg-accent text-accent-foreground")}>
                {result.isDiscrepancyPresent ? <AlertTriangle className="h-4 w-4"/> : <CheckCircle2 className="h-4 w-4" />}
                <AlertTitle>{result.isDiscrepancyPresent ? "Abweichung festgestellt" : "Keine Abweichung"}</AlertTitle>
                <AlertDescription>
                    {result.discrepancyExplanation}
                </AlertDescription>
            </Alert>
          </CardFooter>
        </Card>
      )}
    </>
  );
}

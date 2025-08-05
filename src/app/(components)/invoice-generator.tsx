
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateInvoicesAction, type Invoice } from '@/app/actions';
import { generatePdf, type UserInfo } from '@/lib/pdf-generator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle, Upload, FileText, Download, PieChart, Euro, Trash2, Pencil, DownloadCloud, FileArchive, RotateCcw, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import JSZip from 'jszip';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  csvFiles: z.any().refine((files) => files?.length >= 1, 'Bitte wählen Sie mindestens eine CSV-Datei aus.'),
});

type FormValues = z.infer<typeof formSchema>;

interface InvoiceGeneratorProps {
  userInfo: UserInfo;
  isUserInfoComplete: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const getClassificationBadge = (classification: Invoice['countryClassification']) => {
  switch (classification) {
      case 'Deutschland':
          return <Badge variant="default">DE</Badge>;
      case 'EU-Ausland':
          return <Badge variant="secondary">EU</Badge>;
      case 'Drittland':
          return <Badge variant="outline">Drittland</Badge>;
      default:
          return null;
  }
};


export function InvoiceGenerator({ userInfo, isUserInfoComplete }: InvoiceGeneratorProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const summary = useMemo(() => {
    const totalNetSales = invoices.reduce((sum, inv) => sum + inv.netTotal, 0);
    const totalVat = invoices.reduce((sum, inv) => sum + inv.vatTotal, 0);
    const totalGross = invoices.reduce((sum, inv) => sum + inv.grossTotal, 0);
    return { totalNetSales, totalVat, totalGross };
  }, [invoices]);
  
  const openEditDialog = useCallback((invoice: Invoice) => {
    setEditingInvoice(JSON.parse(JSON.stringify(invoice))); // Deep copy
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditingInvoice(null);
  }, []);

  const handleDeleteInvoice = useCallback((invoiceId: string) => {
    setInvoices(prevInvoices => prevInvoices.filter(inv => inv.id !== invoiceId));
  }, []);
  
  const handleDeleteAllInvoices = useCallback(() => {
    setInvoices([]);
    toast({
        title: "Alle Rechnungen gelöscht",
        description: "Die Liste der generierten Rechnungen ist jetzt leer.",
    });
  }, [toast]);


  const handleCreateCancellation = useCallback((invoiceToCancel: Invoice) => {
    const cancellationInvoice: Invoice = {
      ...invoiceToCancel,
      id: `${invoiceToCancel.id}-STORNO`, // a unique id for the cancellation
      invoiceNumber: `Storno-${invoiceToCancel.invoiceNumber}`,
      netTotal: -invoiceToCancel.netTotal,
      vatTotal: -invoiceToCancel.vatTotal,
      grossTotal: -invoiceToCancel.grossTotal,
      items: invoiceToCancel.items.map(item => ({
        ...item,
        quantity: item.quantity,
        netAmount: -item.netAmount,
        vatAmount: -item.vatAmount,
        grossAmount: -item.grossAmount,
      })),
      taxNote: `Stornierung der Rechnung ${invoiceToCancel.invoiceNumber}.\n${invoiceToCancel.taxNote}`,
      isCancellation: true,
    };
    setInvoices(prev => [...prev, cancellationInvoice]);
  }, []);

  const handleUpdateInvoice = useCallback(() => {
    if (!editingInvoice) return;
    setInvoices(prevInvoices => 
        prevInvoices.map(inv => inv.id === editingInvoice.id ? editingInvoice : inv)
    );
    closeEditDialog();
    toast({
        title: "Rechnung aktualisiert",
        description: `Die Änderungen an Rechnung ${editingInvoice.invoiceNumber} wurden übernommen.`
    });
  }, [editingInvoice, closeEditDialog, toast]);
  
  const handleEditInvoiceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if(!editingInvoice) return;
    const { name, value } = e.target;
    setEditingInvoice({
        ...editingInvoice,
        [name]: value
    });
  }

  const handleEditItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if(!editingInvoice) return;
    const { name, value } = e.target;
    const updatedItems = [...editingInvoice.items];
    const itemToUpdate = { ...updatedItems[index] };

    let numericValue = 0;
    if (name === 'quantity' || name === 'netAmount' || name === 'vatRate') {
      numericValue = parseFloat(value.replace(',', '.')) || 0;
      (itemToUpdate as any)[name] = numericValue;
    } else {
        (itemToUpdate as any)[name] = value;
    }
    
    // Recalculate amounts
    const net = name === 'netAmount' ? numericValue : itemToUpdate.netAmount;
    const vatRate = name === 'vatRate' ? numericValue : itemToUpdate.vatRate;

    itemToUpdate.vatAmount = net * (vatRate / 100);
    itemToUpdate.grossAmount = net + itemToUpdate.vatAmount;
    
    updatedItems[index] = itemToUpdate;

    const newNetTotal = updatedItems.reduce((sum, item) => sum + item.netAmount, 0);
    const newVatTotal = updatedItems.reduce((sum, item) => sum + item.vatAmount, 0);
    const newGrossTotal = newNetTotal + newVatTotal;
    
    setEditingInvoice({
        ...editingInvoice,
        items: updatedItems,
        netTotal: newNetTotal,
        vatTotal: newVatTotal,
        grossTotal: newGrossTotal,
    });
  }

  const handleDownloadPdf = useCallback((invoice: Invoice) => {
    if (!isUserInfoComplete) {
        toast({
            variant: "destructive",
            title: "Fehlende Angaben",
            description: "Bitte füllen Sie zuerst die Pflichtangaben für die Rechnungserstellung aus und speichern Sie diese.",
        });
        return;
    }
    generatePdf(invoice, userInfo, 'save');
  }, [userInfo, isUserInfoComplete, toast]);

  const handleDownloadAllPdfs = useCallback(async () => {
    if (!isUserInfoComplete) {
        toast({
            variant: "destructive",
            title: "Fehlende Angaben",
            description: "Bitte füllen Sie zuerst die Pflichtangaben für die Rechnungserstellung aus und speichern Sie diese.",
        });
        return;
    }
    if (invoices.length === 0) {
        toast({
            title: "Keine Rechnungen",
            description: "Es sind keine Rechnungen zum Herunterladen vorhanden.",
        });
        return;
    }

    setIsZipping(true);
    const zip = new JSZip();

    for (const invoice of invoices) {
        const pdfBlob = await generatePdf(invoice, userInfo, 'blob');
        if (pdfBlob) {
            const fileName = invoice.isCancellation ? `Stornorechnung-${invoice.invoiceNumber.replace('-STORNO','')}.pdf` : `Rechnung-${invoice.invoiceNumber}.pdf`;
            zip.file(fileName, pdfBlob);
        }
    }

    zip.generateAsync({ type: "blob" }).then(content => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "rechnungen.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsZipping(false);
    });

  }, [invoices, userInfo, isUserInfoComplete, toast]);

  async function onSubmit(values: FormValues) {
    if (!isUserInfoComplete) {
        toast({
            variant: "destructive",
            title: "Fehlende Angaben",
            description: "Bitte füllen Sie zuerst Ihre Firmendaten aus, bevor Sie Rechnungen generieren.",
        });
        return;
    }
    
    setIsLoading(true);
    setError(null);
    setInvoices([]);

    const files = Array.from(values.csvFiles as FileList);
    let combinedCsvData = '';
    const fileReadPromises = files.map((file, index) => {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                if (index === 0) {
                    resolve(content); // Keep header for the first file
                } else {
                    const lines = content.split('\n');
                    resolve(lines.slice(1).join('\n'));
                }
            };
            reader.onerror = (e) => reject(`Fehler beim Lesen der Datei ${file.name}`);
            reader.readAsText(file, 'UTF-8');
        });
    });


    try {
        const allCsvContents = await Promise.all(fileReadPromises);
        combinedCsvData = allCsvContents.join('\n');
        
        if (!combinedCsvData.trim()) {
            setError("Die ausgewählten Dateien sind leer oder ungültig.");
            setIsLoading(false);
            return;
        }

        const response = await generateInvoicesAction(combinedCsvData, userInfo.taxStatus);
        if (response.error) {
            setError(response.error);
        } else if (response.data) {
            setInvoices(response.data.invoices);
        }
    } catch (err: any) {
         setError(err.message || "Fehler beim Lesen der Dateien.");
    } finally {
        setIsLoading(false);
    }
  }
  
  // Dummy value for invoice counter
  const invoicesThisMonth = invoices.length;
  const maxInvoices = 10000;

  return (
    <div className="space-y-6">
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="text-primary"/>
            1. Etsy-Bestellungen hochladen & Rechnungen generieren
          </CardTitle>
          <CardDescription>
            Laden Sie Ihre Etsy-Bestell-CSV-Dateien hoch. Sie können mehrere Dateien auswählen. Das Tool generiert dann automatisch alle Rechnungen.
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
               <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Wo finde ich die CSV-Datei?</AlertTitle>
                  <AlertDescription>
                    Etsy-Dashboard → Shop-Manager → Einstellungen → Optionen → Daten herunterladen → Typ: **Bestellte Artikel**
                  </AlertDescription>
                </Alert>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
               <Button type="submit" disabled={isLoading || !isUserInfoComplete} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verarbeite Daten...
                  </>
                ) : (
                  'Rechnungen generieren'
                )}
              </Button>
               <div className="w-full text-center text-sm text-muted-foreground">
                    Rechnungen in diesem Monat: {invoicesThisMonth} / {maxInvoices}
               </div>
               {!isUserInfoComplete && (
                 <Alert variant="destructive">
                   <AlertTriangle className="h-4 w-4" />
                   <AlertTitle>Achtung</AlertTitle>
                   <AlertDescription>
                     Bitte füllen Sie erst Ihre Firmendaten im oberen Bereich aus und speichern diese, um Rechnungen erstellen zu können.
                   </AlertDescription>
                 </Alert>
               )}
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

      {invoices.length > 0 && (
        <div className="space-y-6 animate-in fade-in-50">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PieChart className="text-primary"/>
                        Zusammenfassung
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-lg">
                    <div className="p-4 bg-secondary rounded-lg flex items-center justify-between">
                        <span className="font-medium">Netto-Umsätze:</span>
                        <span className="font-bold text-accent-foreground">{formatCurrency(summary.totalNetSales)}</span>
                    </div>
                     <div className="p-4 bg-secondary rounded-lg flex items-center justify-between">
                        <span className="font-medium">Umsatzsteuer:</span>
                        <span className="font-bold text-accent-foreground">{formatCurrency(summary.totalVat)}</span>
                    </div>
                     <div className="p-4 bg-secondary rounded-lg flex items-center justify-between">
                        <span className="font-medium">Brutto-Umsätze:</span>
                        <span className="font-bold text-accent-foreground">{formatCurrency(summary.totalGross)}</span>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
                <Button onClick={handleDownloadAllPdfs} disabled={isZipping || invoices.length === 0} size="lg">
                    {isZipping ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /><span>Erstelle ZIP...</span></>
                    ) : (
                        <><FileArchive className="mr-2 h-5 w-5"/><span>Alle {invoices.length} Rechnungen als ZIP</span></>
                    )}
                </Button>
            </div>
             <p className="text-xs text-muted-foreground text-center">
                Rechtlicher Hinweis: Bitte prüfen Sie alle Rechnungen sorgfältig. Für steuerliche Fragen wenden Sie sich an Ihren Steuerberater.
            </p>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Euro className="text-primary"/>
                        Generierte Rechnungen ({invoices.length})
                    </CardTitle>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={invoices.length === 0}>
                                <Trash2 className="mr-2 h-4 w-4"/> Alle löschen
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Diese Aktion kann nicht rückgängig gemacht werden. Dadurch werden alle {invoices.length} generierten Rechnungen dauerhaft aus dieser Ansicht entfernt.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAllInvoices}>Ja, alle löschen</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardHeader>
                <CardContent>
                    <ScrollArea className={invoices.length > 50 ? "h-[700px]" : ""}>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rechnungsnr.</TableHead>
                                    <TableHead>Datum</TableHead>
                                    <TableHead>Käufer</TableHead>
                                    <TableHead>Land</TableHead>
                                    <TableHead>Klassifizierung</TableHead>
                                    <TableHead className="text-right">Netto</TableHead>
                                    {userInfo.taxStatus === 'regular' && (
                                        <TableHead className="text-right">USt.</TableHead>
                                    )}
                                    <TableHead className="text-right">Brutto</TableHead>
                                    <TableHead className="text-center">Aktionen</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.map((invoice) => (
                                    <TableRow key={invoice.id} className={invoice.isCancellation ? 'bg-red-100 dark:bg-red-900/30' : ''}>
                                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                        <TableCell>{invoice.orderDate}</TableCell>
                                        <TableCell>{invoice.buyerName}</TableCell>
                                        <TableCell>{invoice.country}</TableCell>
                                        <TableCell>{getClassificationBadge(invoice.countryClassification)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(invoice.netTotal)}</TableCell>
                                        {userInfo.taxStatus === 'regular' && (
                                            <TableCell className="text-right">{formatCurrency(invoice.vatTotal)}</TableCell>
                                        )}
                                        <TableCell className={`text-right font-semibold ${invoice.isCancellation ? 'text-destructive' : ''}`}>{formatCurrency(invoice.grossTotal)}</TableCell>
                                        <TableCell className="text-center space-x-1">
                                            <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(invoice)}>
                                                <Download className="mr-2 h-4 w-4"/>PDF
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(invoice)} disabled={invoice.isCancellation}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                             <Button variant="ghost" size="icon" onClick={() => handleCreateCancellation(invoice)} disabled={invoice.isCancellation || invoices.some(i => i.id === `${invoice.id}-STORNO`)}>
                                                <RotateCcw className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Rechnung wirklich löschen?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Möchten Sie die Rechnung {invoice.invoiceNumber} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.id)}>Ja, löschen</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      )}

      {editingInvoice && (
        <Dialog open={!!editingInvoice} onOpenChange={closeEditDialog}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Rechnung bearbeiten: {editingInvoice.invoiceNumber}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-4">
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="invoiceNumber" className="text-right">Rechnungs-Nr.</Label>
                            <Input id="invoiceNumber" name="invoiceNumber" value={editingInvoice.invoiceNumber} onChange={handleEditInvoiceChange} className="col-span-3"/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="buyerName" className="text-right">Käufer</Label>
                            <Input id="buyerName" name="buyerName" value={editingInvoice.buyerName} onChange={handleEditInvoiceChange} className="col-span-3"/>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="buyerAddress" className="text-right mt-2">Adresse</Label>
                            <Textarea id="buyerAddress" name="buyerAddress" value={editingInvoice.buyerAddress} onChange={handleEditInvoiceChange} className="col-span-3" rows={4}/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="orderDate" className="text-right">Rechnungsdatum</Label>
                            <Input id="orderDate" name="orderDate" value={editingInvoice.orderDate} onChange={handleEditInvoiceChange} className="col-span-3"/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="serviceDate" className="text-right">Leistungsdatum</Label>
                            <Input id="serviceDate" name="serviceDate" value={editingInvoice.serviceDate} onChange={handleEditInvoiceChange} className="col-span-3"/>
                        </div>
                         <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="taxNote" className="text-right mt-2">Steuervermerk</Label>
                            <Textarea id="taxNote" name="taxNote" value={editingInvoice.taxNote} onChange={handleEditInvoiceChange} className="col-span-3" rows={3}/>
                        </div>

                        <h4 className="font-semibold col-span-4 mt-4">Positionen</h4>
                        {editingInvoice.items.map((item, index) => (
                           <Card key={index} className="col-span-4 p-4">
                               <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                    <Input name="name" value={item.name} onChange={(e) => handleEditItemChange(index, e)} placeholder="Bezeichnung" />
                                    <Input name="quantity" value={item.quantity} onChange={(e) => handleEditItemChange(index, e)} placeholder="Menge" type="number" />
                                    <Input name="netAmount" value={item.netAmount.toFixed(2)} onChange={(e) => handleEditItemChange(index, e)} placeholder="Nettobetrag" type="number" step="0.01" />
                                    <Input name="vatRate" value={item.vatRate} onChange={(e) => handleEditItemChange(index, e)} placeholder="USt %" type="number" />
                                    <div className="p-2 bg-muted rounded-md text-sm">Brutto: {formatCurrency(item.grossAmount)}</div>
                               </div>
                           </Card>
                        ))}

                        <div className="col-span-4 mt-4 text-right space-y-2">
                            <p>Netto: {formatCurrency(editingInvoice.netTotal)}</p>
                            <p>USt.: {formatCurrency(editingInvoice.vatTotal)}</p>
                            <p className="font-bold">Brutto: {formatCurrency(editingInvoice.grossTotal)}</p>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Abbrechen</Button>
                    </DialogClose>
                    <Button onClick={handleUpdateInvoice}>Änderungen speichern</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

    </div>
  );
}

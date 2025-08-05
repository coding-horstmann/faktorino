
'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import { Loader2, AlertTriangle, Upload, FileText, Download, PieChart, Euro, Trash2, Pencil, DownloadCloud, FileArchive, Info, Check, X, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import JSZip from 'jszip';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  csvFiles: z.any().refine((files) => files?.length >= 1, 'Bitte wählen Sie mindestens eine CSV-Datei aus.'),
});

type FormValues = z.infer<typeof formSchema>;

interface InvoiceGeneratorProps {
  userInfo: UserInfo;
  isUserInfoComplete: boolean;
  onMissingInfo: () => boolean;
  onUserInfoSave: () => void;
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


export function InvoiceGenerator({ userInfo, isUserInfoComplete, onMissingInfo, onUserInfoSave }: InvoiceGeneratorProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState<{ id: string; number: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
        const savedInvoices = localStorage.getItem('generatedInvoices');
        if(savedInvoices) {
            setInvoices(JSON.parse(savedInvoices));
        }
    } catch(e) {
        console.error("Could not load invoices from localStorage", e);
    }
  }, []);

  const updateInvoices = (newInvoices: Invoice[]) => {
      setInvoices(newInvoices);
      try {
        localStorage.setItem('generatedInvoices', JSON.stringify(newInvoices));
      } catch(e) {
        console.error("Could not save invoices to localStorage", e);
      }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return invoices;
    return invoices.filter(invoice => 
        invoice.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);
  
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
    updateInvoices(invoices.filter(inv => inv.id !== invoiceId));
  }, [invoices, updateInvoices]);
  
  const handleDeleteAllInvoices = useCallback(() => {
    updateInvoices([]);
    toast({
        title: "Alle Rechnungen gelöscht",
        description: "Die Liste der generierten Rechnungen ist jetzt leer.",
    });
  }, [toast, updateInvoices]);

  const handleUpdateInvoice = useCallback(() => {
    if (!editingInvoice) return;
    updateInvoices(
        invoices.map(inv => inv.id === editingInvoice.id ? editingInvoice : inv)
    );
    closeEditDialog();
    toast({
        title: "Rechnung aktualisiert",
        description: `Die Änderungen an Rechnung ${editingInvoice.invoiceNumber} wurden übernommen.`
    });
  }, [editingInvoice, closeEditDialog, toast, invoices, updateInvoices]);
  
  const handleEditInvoiceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if(!editingInvoice) return;
    const { name, value } = e.target;
    setEditingInvoice({
        ...editingInvoice,
        [name]: value
    });
  }
   const handleClassificationChange = (value: Invoice['countryClassification']) => {
    if (!editingInvoice) return;
    setEditingInvoice({
      ...editingInvoice,
      countryClassification: value,
    });
  };

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
        onMissingInfo();
        return;
    }
    generatePdf(invoice, userInfo, 'save');
  }, [userInfo, isUserInfoComplete, onMissingInfo]);

  const handleDownloadAllPdfs = useCallback(async () => {
    if (!isUserInfoComplete) {
        onMissingInfo();
        return;
    }
    if (invoices.length === 0) {
        toast({
            title: "Keine Rechnungen",
            description: "Es sind keine Rechnungen zum Herunterladen vorhanden.",
            variant: "destructive"
        });
        return;
    }

    setIsZipping(true);
    const zip = new JSZip();

    for (const invoice of invoices) {
        const pdfBlob = await generatePdf(invoice, userInfo, 'blob');
        if (pdfBlob) {
            const fileName = `Rechnung-${invoice.invoiceNumber}.pdf`;
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

  }, [invoices, userInfo, isUserInfoComplete, toast, onMissingInfo]);

  async function onSubmit(values: FormValues) {
    if (!onMissingInfo()) {
        return;
    }
    
    setIsLoading(true);
    setError(null);
    
    const files = Array.from(values.csvFiles as FileList);
    const fileReadPromises = files.map(file => file.text());

    try {
        const allCsvContents = await Promise.all(fileReadPromises);
        
        const header = allCsvContents[0].split('\n')[0];
        const rowsFromAllFiles = allCsvContents.flatMap((content, index) => {
            const lines = content.split('\n');
            // Skip header only for subsequent files
            return index === 0 ? lines.slice(1) : lines.slice(1);
        }).filter(row => row.trim() !== ''); // Filter out empty rows

        // Join header with all rows, ensuring a newline at the end of the header
        const combinedCsvData = [header.trim(), ...rowsFromAllFiles].join('\n');
        
        if (!combinedCsvData.trim() || rowsFromAllFiles.length === 0) {
            setError("Die ausgewählten Dateien sind leer oder ungültig.");
            setIsLoading(false);
            return;
        }
        
        const response = await generateInvoicesAction(combinedCsvData, userInfo.taxStatus, invoices);

        if (response.error) {
            setError(response.error);
        } else if (response.data) {
            const newInvoices = response.data.invoices;
            const uniqueNewInvoices = newInvoices.filter(newInv => !invoices.some(existing => existing.id === newInv.id));
            
            updateInvoices([...invoices, ...uniqueNewInvoices].sort((a, b) => {
                const dateA = new Date(a.orderDate.split('.').reverse().join('-')).getTime();
                const dateB = new Date(b.orderDate.split('.').reverse().join('-')).getTime();
                if (dateA !== dateB) return dateA - dateB;
                return a.invoiceNumber.localeCompare(b.invoiceNumber);
            }));
            
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            form.reset();
        }
    } catch (err: any) {
         setError(err.message || "Fehler beim Lesen oder Verarbeiten der Dateien.");
    } finally {
        setIsLoading(false);
    }
  }
  
  const handleInvoiceNumberSave = () => {
    if (!editingInvoiceNumber) return;
    updateInvoices(
      invoices.map((inv) =>
        inv.id === editingInvoiceNumber.id ? { ...inv, invoiceNumber: editingInvoiceNumber.number } : inv
      )
    );
    setEditingInvoiceNumber(null);
  };
  
  const invoicesThisMonth = invoices.length;
  const maxInvoices = 10000;

  return (
    <div className="space-y-6">
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="text-primary"/>
            1. Etsy-Bestellungen hochladen
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
                          ref={fileInputRef}
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
               <div className="w-full text-center text-sm text-muted-foreground">
                    Rechnungen in diesem Monat: {invoicesThisMonth} / {maxInvoices}
               </div>
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
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-secondary rounded-lg flex flex-col items-center justify-center gap-1 text-center">
                        <span className="font-medium whitespace-nowrap text-muted-foreground">Netto-Umsätze</span>
                        <span className="font-bold text-lg text-accent-foreground">{formatCurrency(summary.totalNetSales)}</span>
                    </div>
                     <div className="p-4 bg-secondary rounded-lg flex flex-col items-center justify-center gap-1 text-center">
                        <span className="font-medium whitespace-nowrap text-muted-foreground">Umsatzsteuer</span>
                        <span className="font-bold text-lg text-accent-foreground">{formatCurrency(summary.totalVat)}</span>
                    </div>
                     <div className="p-4 bg-secondary rounded-lg flex flex-col items-center justify-center gap-1 text-center">
                        <span className="font-medium whitespace-nowrap text-muted-foreground">Brutto-Umsätze</span>
                        <span className="font-bold text-lg text-accent-foreground">{formatCurrency(summary.totalGross)}</span>
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
                <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                        <Euro className="text-primary"/>
                        Generierte Rechnungen ({filteredInvoices.length})
                    </CardTitle>
                    <div className="w-full md:w-auto flex items-center gap-2">
                         <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Suche nach Name, Re-Nr..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
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
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="w-full overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[220px]">Rechnungsnr.</TableHead>
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
                                {filteredInvoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">
                                          {editingInvoiceNumber?.id === invoice.id ? (
                                            <div className="flex items-center gap-1 w-[200px]">
                                              <Input
                                                value={editingInvoiceNumber.number}
                                                onChange={(e) =>
                                                  setEditingInvoiceNumber({ ...editingInvoiceNumber, number: e.target.value })
                                                }
                                                className="h-8"
                                              />
                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={handleInvoiceNumberSave}><Check className="h-4 w-4"/></Button>
                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => setEditingInvoiceNumber(null)}><X className="h-4 w-4"/></Button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setEditingInvoiceNumber({ id: invoice.id, number: invoice.invoiceNumber })}>
                                              {invoice.invoiceNumber}
                                            </div>
                                          )}
                                        </TableCell>
                                        <TableCell>{invoice.orderDate}</TableCell>
                                        <TableCell>{invoice.buyerName}</TableCell>
                                        <TableCell>{invoice.country}</TableCell>
                                        <TableCell>{getClassificationBadge(invoice.countryClassification)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(invoice.netTotal)}</TableCell>
                                        {userInfo.taxStatus === 'regular' && (
                                            <TableCell className="text-right">{formatCurrency(invoice.vatTotal)}</TableCell>
                                        )}
                                        <TableCell className="text-right font-semibold">{formatCurrency(invoice.grossTotal)}</TableCell>
                                        <TableCell className="text-center space-x-1">
                                            <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(invoice)}>
                                                <Download className="mr-2 h-4 w-4"/>PDF
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(invoice)}>
                                                <Pencil className="h-4 w-4" />
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
                       </div>
                </CardContent>
            </Card>
        </div>
      )}

      {editingInvoice && (
        <Dialog open={!!editingInvoice} onOpenChange={(isOpen) => !isOpen && closeEditDialog()}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Rechnung bearbeiten: {editingInvoice.invoiceNumber}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1">
                    <div className="space-y-6 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="invoiceNumber">Rechnungs-Nr.</Label>
                                <Input id="invoiceNumber" name="invoiceNumber" value={editingInvoice.invoiceNumber} onChange={handleEditInvoiceChange}/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="buyerName">Käufer</Label>
                                <Input id="buyerName" name="buyerName" value={editingInvoice.buyerName} onChange={handleEditInvoiceChange}/>
                            </div>
                        </div>

                         <div className="space-y-2">
                            <Label htmlFor="buyerAddress">Adresse</Label>
                            <Textarea id="buyerAddress" name="buyerAddress" value={editingInvoice.buyerAddress.replace(/\\n/g, '\n')} onChange={handleEditInvoiceChange} rows={4}/>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="orderDate">Rechnungsdatum</Label>
                                <Input id="orderDate" name="orderDate" value={editingInvoice.orderDate} onChange={handleEditInvoiceChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="serviceDate">Leistungsdatum</Label>
                                <Input id="serviceDate" name="serviceDate" value={editingInvoice.serviceDate} onChange={handleEditInvoiceChange} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="countryClassification">Klassifizierung</Label>
                                 <Select
                                    value={editingInvoice.countryClassification}
                                    onValueChange={handleClassificationChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Klassifizierung auswählen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Deutschland">Deutschland</SelectItem>
                                        <SelectItem value="EU-Ausland">EU-Ausland</SelectItem>
                                        <SelectItem value="Drittland">Drittland</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="taxNote">Steuervermerk</Label>
                                <Textarea id="taxNote" name="taxNote" value={editingInvoice.taxNote} onChange={handleEditInvoiceChange} rows={3}/>
                            </div>
                        </div>

                        <h4 className="font-semibold mt-4 border-t pt-4">Positionen</h4>
                        <div className="space-y-4">
                        {editingInvoice.items.map((item, index) => (
                           <Card key={index} className="p-4 bg-secondary">
                               <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label>Bezeichnung</Label>
                                        <Input name="name" value={item.name} onChange={(e) => handleEditItemChange(index, e)} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                      <div className="space-y-1">
                                          <Label>Menge</Label>
                                          <Input name="quantity" value={item.quantity} onChange={(e) => handleEditItemChange(index, e)} type="number" />
                                      </div>
                                      <div className="space-y-1">
                                          <Label>Nettobetrag</Label>
                                          <Input name="netAmount" value={item.netAmount.toFixed(2)} onChange={(e) => handleEditItemChange(index, e)} type="number" step="0.01" />
                                      </div>
                                      <div className="space-y-1">
                                          <Label>USt %</Label>
                                          <Input name="vatRate" value={item.vatRate} onChange={(e) => handleEditItemChange(index, e)} type="number" />
                                      </div>
                                    </div>
                               </div>
                               <div className="mt-2 text-right text-sm text-muted-foreground">Brutto (berechnet): {formatCurrency(item.grossAmount)}</div>
                           </Card>
                        ))}
                        </div>

                        <div className="mt-4 text-right space-y-2 border-t pt-4">
                            <div className="flex justify-end items-center gap-4"><span>Netto:</span> <span>{formatCurrency(editingInvoice.netTotal)}</span></div>
                            <div className="flex justify-end items-center gap-4"><span>USt.:</span> <span>{formatCurrency(editingInvoice.vatTotal)}</span></div>
                            <div className="flex justify-end items-center gap-4 font-bold text-lg"><span>Brutto:</span> <span>{formatCurrency(editingInvoice.grossTotal)}</span></div>
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

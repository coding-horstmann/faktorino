'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateInvoicesAction, type Invoice } from '@/app/actions';
import { generatePdf, type UserInfo } from '@/lib/pdf-generator';
import { useAuth } from '@/contexts/AuthContext';
import { InvoiceService } from '@/lib/invoice-service';
import { CreditService } from '@/lib/credit-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle, Upload, FileText, Download, PieChart, Euro, Trash2, Pencil, DownloadCloud, FileArchive, Info, X, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import JSZip from 'jszip';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// UsageService entfernt - jetzt Credit-System

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
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [isZipping, setIsZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // monthlyUsage entfernt - jetzt Credit-System
  const [sortField, setSortField] = useState<'orderDate' | 'invoiceNumber'>('orderDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showLegalWarning, setShowLegalWarning] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<FormValues | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Funktion zur Prüfung der rechtlichen Warnung
  const shouldShowLegalWarning = () => {
    if (!user) return false;
    
    const storageKey = `legal_warning_${user.id}`;
    const lastShown = localStorage.getItem(storageKey);
    
    if (!lastShown) return true;
    
    const lastShownDate = new Date(lastShown);
    const now = new Date();
    const hoursSinceLastShown = (now.getTime() - lastShownDate.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceLastShown >= 24;
  };

  // Funktion zum Speichern der Warnung
  const markLegalWarningAsShown = () => {
    if (!user) return;
    
    const storageKey = `legal_warning_${user.id}`;
    localStorage.setItem(storageKey, new Date().toISOString());
    setShowLegalWarning(false);
    
    // Führe die ursprüngliche Form-Submission aus
    if (pendingFormValues) {
      processFormSubmission(pendingFormValues);
      setPendingFormValues(null);
    }
  };

  // Funktion zur Verarbeitung der Form-Submission (ohne rechtliche Warnung)
  const processFormSubmission = async (values: FormValues) => {
    setIsLoading(true);
    setError(null);
    
    const files = Array.from(values.csvFiles as FileList);
    const fileReadPromises = files.map(file => file.text());

    try {
        // Validierung der hochgeladenen Dateien
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.name.toLowerCase().endsWith('.csv')) {
                setError(`Die Datei "${file.name}" ist keine CSV-Datei. Bitte wählen Sie nur CSV-Dateien aus.`);
                setIsLoading(false);
                return;
            }
            if (file.size === 0) {
                setError(`Die Datei "${file.name}" ist leer. Bitte wählen Sie eine gültige CSV-Datei aus.`);
                setIsLoading(false);
                return;
            }
            if (file.size > 10 * 1024 * 1024) { // 10MB Limit
                setError(`Die Datei "${file.name}" ist zu groß (max. 10MB). Bitte wählen Sie eine kleinere Datei aus.`);
                setIsLoading(false);
                return;
            }
        }

        const allCsvContents = await Promise.all(fileReadPromises);
        
        // Prüfe jede Datei auf gültigen Inhalt
        for (let i = 0; i < allCsvContents.length; i++) {
            const content = allCsvContents[i];
            if (!content || content.trim().length === 0) {
                setError(`Die Datei "${files[i].name}" enthält keine gültigen Daten.`);
                setIsLoading(false);
                return;
            }
            
            const lines = content.split('\n').filter(line => line.trim());
            if (lines.length < 2) {
                setError(`Die Datei "${files[i].name}" enthält zu wenige Daten. Eine gültige CSV-Datei benötigt mindestens eine Header-Zeile und eine Datenzeile.`);
                setIsLoading(false);
                return;
            }
        }
        
        const header = allCsvContents[0].split('\n')[0];
        const rowsFromAllFiles = allCsvContents.flatMap((content, index) => {
            const lines = content.split('\n');
            // Skip header only for subsequent files
            return index === 0 ? lines.slice(1) : lines.slice(1);
        }).filter(row => row.trim() !== ''); // Filter out empty rows

        // Join header with all rows, ensuring a newline at the end of the header
        const combinedCsvData = [header.trim(), ...rowsFromAllFiles].join('\n');
        
        if (!combinedCsvData.trim() || rowsFromAllFiles.length === 0) {
            setError("Die verarbeiteten CSV-Dateien enthalten keine gültigen Datenzeilen. Bitte überprüfen Sie den Inhalt der Dateien.");
            setIsLoading(false);
            return;
        }
        
        const response = await generateInvoicesAction(combinedCsvData, userInfo.taxStatus, user.id);

        if (response.error) {
            setError(response.error);
        } else if (response.data && user) {
            console.log('InvoiceGenerator: Got response data, user:', user.id);
            const newInvoices = response.data.invoices;
            const uniqueNewInvoices = newInvoices.filter(newInv => !invoices.some(existing => existing.id === newInv.id));

            if (uniqueNewInvoices.length === 0 && newInvoices.length > 0) {
                setError("Keine neuen Bestellungen in der CSV-Datei gefunden. Bereits existierende Rechnungen wurden übersprungen.");
                setIsLoading(false);
                clearAllFiles();
                form.reset();
                return;
            }

            // **CREDIT-SYSTEM**
            // Die Credit-Validierung erfolgt bereits in generateInvoicesAction()
            let invoicesToCreate = uniqueNewInvoices;
            let limitWarning = response.data.warning || '';

            console.log('InvoiceGenerator: Saving', invoicesToCreate.length, 'new invoices to Supabase');

            // Save new invoices to Supabase
            try {
                const invoicesToSave = invoicesToCreate.map(invoice => {
                    // Convert DD.MM.YYYY to YYYY-MM-DD for database
                    const formatDateForDB = (dateStr: string) => {
                        const [day, month, year] = dateStr.split('.');
                        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    };

                    return {
                        // Don't include id - let database generate it
                        user_id: user.id,
                        invoice_number: invoice.invoiceNumber,
                        order_date: formatDateForDB(invoice.orderDate),
                        service_date: formatDateForDB(invoice.serviceDate),
                        buyer_name: invoice.buyerName,
                        buyer_address: invoice.buyerAddress,
                        country: invoice.country,
                        country_classification: invoice.countryClassification,
                        net_total: invoice.netTotal,
                        vat_total: invoice.vatTotal,
                        gross_total: invoice.grossTotal,
                        tax_note: invoice.taxNote,
                        items: invoice.items
                    };
                });

                const savedInvoices = await InvoiceService.createMultipleInvoices(invoicesToSave);
                console.log('InvoiceGenerator: Saved invoices result:', savedInvoices.length, 'of', invoicesToSave.length);

                if (savedInvoices.length > 0) {
                    // **NEUE CREDIT-DEKREMENTIERUNG**
                    try {
                        const creditResult = await CreditService.useCredits(
                            user.id, 
                            savedInvoices.length, 
                            `${savedInvoices.length} Rechnungen erstellt`
                        );
                        
                        if (!creditResult.success) {
                            console.error('Error using credits:', creditResult.error);
                            // Don't fail the whole process if credit tracking fails, but warn user
                            toast({
                                title: "Credits-Update Fehler",
                                description: "Rechnungen wurden erstellt, aber Credits konnten nicht aktualisiert werden.",
                                variant: "destructive"
                            });
                        }
                    } catch (creditError) {
                        console.error('Error updating credits:', creditError);
                        // Don't fail the whole process if credit tracking fails
                    }

                    // Map saved DB rows to UI invoices (use real UUIDs and convert dates for display)
                    const formatDateFromDB = (dbDate: string) => {
                      if (!dbDate) return '';
                      if (dbDate.includes('.')) return dbDate;
                      const [year, month, day] = dbDate.split('-');
                      if (year && month && day) return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
                      return dbDate;
                    };
                    const savedUiInvoices: Invoice[] = savedInvoices.map(db => ({
                      id: db.id,
                      invoiceNumber: db.invoice_number,
                      orderDate: formatDateFromDB(db.order_date),
                      serviceDate: formatDateFromDB(db.service_date),
                      buyerName: db.buyer_name,
                      buyerAddress: db.buyer_address,
                      country: db.country,
                      countryClassification: db.country_classification,
                      netTotal: db.net_total,
                      vatTotal: db.vat_total,
                      grossTotal: db.gross_total,
                      taxNote: db.tax_note,
                      items: db.items
                    }));

                    updateInvoices([...invoices, ...savedUiInvoices].sort((a, b) => {
                        const dateA = new Date(a.orderDate.split('.').reverse().join('-')).getTime();
                        const dateB = new Date(b.orderDate.split('.').reverse().join('-')).getTime();
                        if (dateA !== dateB) return dateA - dateB;
                        return a.invoiceNumber.localeCompare(b.invoiceNumber);
                    }));

                    toast({
                        title: "Rechnungen erstellt",
                        description: limitWarning || `${savedInvoices.length} neue Rechnungen wurden erfolgreich erstellt.`,
                        variant: limitWarning ? "default" : "default"
                    });

                    clearAllFiles();
                    form.reset();
                } else {
                    setError("Fehler beim Speichern der Rechnungen. Bitte versuchen Sie es erneut.");
                }
            } catch (error) {
                console.error('Error saving invoices:', error);
                setError("Fehler beim Speichern der Rechnungen. Bitte versuchen Sie es erneut.");
            }
        }
    } catch (error) {
        console.error('Error processing CSV:', error);
        setError("Fehler bei der Verarbeitung der CSV-Datei. Bitte überprüfen Sie das Format der Datei.");
    } finally {
        setIsLoading(false);
    }
  };

  // Modifizierte onSubmit-Funktion mit rechtlicher Warnung
  async function onSubmit(values: FormValues) {
    if (!onMissingInfo()) {
        return;
    }
    
    // Prüfe, ob rechtliche Warnung angezeigt werden soll
    if (shouldShowLegalWarning()) {
        setPendingFormValues(values);
        setShowLegalWarning(true);
        return;
    }
    
    // Normale Verarbeitung ohne Warnung
    processFormSubmission(values);
  }

  useEffect(() => {
    const loadInvoices = async () => {
      console.log('InvoiceGenerator: loadInvoices called, user:', user?.id, user?.email);
      if (!user) {
        console.log('InvoiceGenerator: No user found, skipping invoice load');
        setIsLoadingInvoices(false);
        return;
      }

      try {
        const formatDateFromDB = (dbDate: string) => {
          // Expecting YYYY-MM-DD, convert to DD.MM.YYYY
          if (!dbDate) return '';
          if (dbDate.includes('.')) return dbDate; // already in display format
          const [year, month, day] = dbDate.split('-');
          if (year && month && day) return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
          return dbDate;
        };
        const dbInvoices = await InvoiceService.getUserInvoices(user.id);

        // Convert database format to app format
        const convertedInvoices: Invoice[] = dbInvoices.map(dbInvoice => ({
          id: dbInvoice.id,
          invoiceNumber: dbInvoice.invoice_number,
          orderDate: formatDateFromDB(dbInvoice.order_date),
          serviceDate: formatDateFromDB(dbInvoice.service_date),
          buyerName: dbInvoice.buyer_name,
          buyerAddress: dbInvoice.buyer_address,
          country: dbInvoice.country,
          countryClassification: dbInvoice.country_classification,
          netTotal: dbInvoice.net_total,
          vatTotal: dbInvoice.vat_total,
          grossTotal: dbInvoice.gross_total,
          taxNote: dbInvoice.tax_note,
          items: dbInvoice.items
        }));

        setInvoices(convertedInvoices);
      } catch (error) {
        console.error('Error loading invoices:', error);
        toast({
          variant: "destructive",
          title: "Fehler beim Laden",
          description: "Rechnungen konnten nicht geladen werden.",
        });
      } finally {
        setIsLoadingInvoices(false);
      }
    };

    loadInvoices();
  }, [user, toast]);

  // Load monthly usage data
  useEffect(() => {
    const loadUsage = async () => {
      if (!user) return;

      // UsageService entfernt - Credits werden jetzt im Dashboard angezeigt
    };

    loadUsage();
  }, [user]);

  const updateInvoices = (newInvoices: Invoice[]) => {
      setInvoices(newInvoices);
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  // Funktionen für Dateiverwaltung
  const handleFileChange = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(fileArray);
      form.setValue('csvFiles', files);
    }
  };

  const removeFile = (indexToRemove: number) => {
    const newFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
    setSelectedFiles(newFiles);
    
    // Erstelle eine neue FileList für das Form
    const dataTransfer = new DataTransfer();
    newFiles.forEach(file => dataTransfer.items.add(file));
    
    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files;
    }
    
    if (newFiles.length === 0) {
      form.setValue('csvFiles', null);
    } else {
      form.setValue('csvFiles', dataTransfer.files);
    }
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    form.setValue('csvFiles', null);
  };

  const handleSort = useCallback((field: 'orderDate' | 'invoiceNumber') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;
    
    // Zuerst filtern
    if (searchTerm) {
      filtered = invoices.filter(invoice => 
        invoice.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Dann sortieren
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'orderDate') {
        // Datum von DD.MM.YYYY zu Date konvertieren für korrekten Vergleich
        const dateA = new Date(a.orderDate.split('.').reverse().join('-'));
        const dateB = new Date(b.orderDate.split('.').reverse().join('-'));
        comparison = dateA.getTime() - dateB.getTime();
      } else if (sortField === 'invoiceNumber') {
        comparison = a.invoiceNumber.localeCompare(b.invoiceNumber, 'de', { numeric: true });
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [invoices, searchTerm, sortField, sortDirection]);
  
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

  const handleDeleteInvoice = useCallback(async (invoiceId: string) => {
    if (!user) return;

    try {
      const success = await InvoiceService.deleteInvoice(invoiceId);
      if (success) {
        updateInvoices(invoices.filter(inv => inv.id !== invoiceId));
        toast({
          title: "Rechnung gelöscht",
          description: "Die Rechnung wurde erfolgreich gelöscht.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Die Rechnung konnte nicht gelöscht werden.",
        });
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ein Fehler beim Löschen ist aufgetreten.",
      });
    }
  }, [invoices, updateInvoices, user, toast]);
  
  const handleDeleteAllInvoices = useCallback(async () => {
    if (!user) return;

    try {
      const success = await InvoiceService.deleteAllUserInvoices(user.id);
      if (success) {
        updateInvoices([]);
        toast({
            title: "Alle Rechnungen gelöscht",
            description: "Die Liste der generierten Rechnungen ist jetzt leer.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Die Rechnungen konnten nicht gelöscht werden.",
        });
      }
    } catch (error) {
      console.error('Error deleting all invoices:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ein Fehler beim Löschen ist aufgetreten.",
      });
    }
  }, [user, toast, updateInvoices]);

  const handleUpdateInvoice = useCallback(async () => {
    if (!editingInvoice || !user) return;

    try {
      const toDbDate = (dateStr: string | undefined) => {
        if (!dateStr) return undefined;
        // Already in YYYY-MM-DD
        if (dateStr.includes('-')) return dateStr;
        // Common UI format DD.MM.YYYY
        if (dateStr.includes('.')) {
          const parts = dateStr.split('.');
          if (parts.length === 3) {
            const [day, month, year] = parts;
            if (year && month && day) {
              return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
          }
        }
        // Fallback: try Date parsing
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          const y = String(parsed.getFullYear());
          const m = String(parsed.getMonth() + 1).padStart(2, '0');
          const d = String(parsed.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
        return undefined;
      };

      const updates: any = {
        invoice_number: editingInvoice.invoiceNumber,
        buyer_name: editingInvoice.buyerName,
        buyer_address: editingInvoice.buyerAddress,
        country: editingInvoice.country,
        country_classification: editingInvoice.countryClassification,
        net_total: editingInvoice.netTotal,
        vat_total: editingInvoice.vatTotal,
        gross_total: editingInvoice.grossTotal,
        tax_note: editingInvoice.taxNote,
        items: editingInvoice.items
      };
      const orderDateDb = toDbDate(editingInvoice.orderDate);
      const serviceDateDb = toDbDate(editingInvoice.serviceDate);
      if (orderDateDb) updates.order_date = orderDateDb;
      if (serviceDateDb) updates.service_date = serviceDateDb;

      const updatedInvoice = await InvoiceService.updateInvoice(editingInvoice.id, updates);

      if (updatedInvoice) {
        updateInvoices(
            invoices.map(inv => inv.id === editingInvoice.id ? editingInvoice : inv)
        );
        closeEditDialog();
        toast({
            title: "Rechnung aktualisiert",
            description: `Die Änderungen an Rechnung ${editingInvoice.invoiceNumber} wurden übernommen.`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Die Rechnung konnte nicht aktualisiert werden.",
        });
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ein Fehler beim Aktualisieren ist aufgetreten.",
      });
    }
  }, [editingInvoice, closeEditDialog, toast, invoices, updateInvoices, user]);
  
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
        if(onMissingInfo()){
             // If onMissingInfo returns true, it means the user has been notified and we can proceed if they fix it.
             // For now, we just stop. The user will have to click again.
        }
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

    // KORREKT: Eine simple for...of Schleife.
    // Diese stellt sicher, dass immer nur ein PDF zur gleichen Zeit generiert wird.
    for (const invoice of invoices) {
        // "await" innerhalb der Schleife ist hier der Schlüssel.
        // Der nächste Schleifendurchlauf startet erst, wenn dieser abgeschlossen ist.
        const pdfBlob = await generatePdf(invoice, userInfo, 'blob');
        if (pdfBlob) {
            const fileName = `Rechnung-${invoice.invoiceNumber}.pdf`;
            zip.file(fileName, pdfBlob);
        }
    }

    // Erst nachdem die Schleife komplett durchlaufen ist, wird die ZIP-Datei erstellt.
    zip.generateAsync({ type: "blob" }).then(content => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "rechnungen.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsZipping(false);
    });
  }, [invoices, userInfo, isUserInfoComplete, onMissingInfo, toast]);

  return (
    <div className="space-y-6">
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="text-primary"/>
            1. Etsy-CSV hochladen
          </CardTitle>
          <CardDescription>
            Laden Sie Ihre Etsy-Bestellungen hoch. Sie können mehrere Dateien auswählen.
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
                          onChange={(e) => {
                            field.onChange(e.target.files);
                            handleFileChange(e.target.files);
                          }}
                      />
                    </FormControl>
                    <FormMessage />
                    
                    {/* Anzeige der ausgewählten Dateien */}
                    {selectedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Ausgewählte Dateien ({selectedFiles.length})</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={clearAllFiles}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Alle entfernen
                          </Button>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">{file.name}</span>
                                <span className="text-xs text-gray-500">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                                className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </FormItem>
                )}
              />
               <Alert className="mt-4 bg-blue-50 border-blue-200 text-blue-800 [&>svg]:text-blue-600">
                  <Info className="h-4 w-4" />
                  <AlertTitle className="font-semibold">Wo finde ich die CSV-Datei?</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    Etsy-Dashboard → Shop-Manager → Einstellungen → Optionen → Daten herunterladen → Typ: Bestellte Artikel auswählen → Zeitraum angeben → „CSV herunterladen" klicken.
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
               {/* monthlyUsage entfernt - Credits werden im Dashboard angezeigt */}
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
             <p className="text-base text-muted-foreground text-center">
                Dieses Tool dient ausschließlich der Unterstützung bei der Rechnungserstellung. Es ersetzt keine steuerliche oder rechtliche Beratung. Für die Richtigkeit, Vollständigkeit und rechtliche Gültigkeit der erstellten Rechnungen ist allein der Nutzer verantwortlich.
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
                    <div className="relative h-[70vh] w-full overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead 
                                        className="w-[140px] min-w-[140px] bg-background cursor-pointer hover:bg-muted/50 select-none"
                                        onClick={() => handleSort('invoiceNumber')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Rechnungsnr.
                                            {sortField === 'invoiceNumber' ? (
                                                sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                            )}
                                        </div>
                                    </TableHead>
                                    <TableHead 
                                        className="w-[80px] min-w-[80px] bg-background cursor-pointer hover:bg-muted/50 select-none"
                                        onClick={() => handleSort('orderDate')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Datum
                                            {sortField === 'orderDate' ? (
                                                sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                            )}
                                        </div>
                                    </TableHead>
                                    <TableHead className="min-w-[120px] bg-background">Kunde</TableHead>
                                    <TableHead className="w-[60px] min-w-[60px] bg-background">Land</TableHead>
                                    <TableHead className="w-[90px] min-w-[90px] bg-background">Klassifizierung</TableHead>
                                    <TableHead className="text-right w-[80px] min-w-[80px] bg-background">Netto</TableHead>
                                    {userInfo.taxStatus === 'regular' && (
                                        <TableHead className="text-right w-[70px] min-w-[70px] bg-background">USt.</TableHead>
                                    )}
                                    <TableHead className="text-right w-[80px] min-w-[80px] bg-background">Brutto</TableHead>
                                    <TableHead className="text-center w-[100px] min-w-[100px] bg-background">Aktionen</TableHead>
                                </TableRow>
                            </TableHeader>
                                <TableBody>
                                    {filteredInvoices.map((invoice) => (
                                        <TableRow key={invoice.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                {invoice.invoiceNumber}
                                                </div>
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
                                            <TableCell className="text-center">
                                                <div className="flex justify-center items-center space-x-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(invoice)}>
                                                        <Download className="h-4 w-4"/>
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
                                                </div>
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

      {showLegalWarning && (
        <Dialog open={showLegalWarning} onOpenChange={setShowLegalWarning}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Rechtliche Warnung</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Dieses Tool dient ausschließlich der Unterstützung bei der Rechnungserstellung. Es ersetzt keine steuerliche oder rechtliche Beratung. Für die Richtigkeit, Vollständigkeit und rechtliche Gültigkeit der erstellten Rechnungen ist allein der Nutzer verantwortlich.
            </DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={markLegalWarningAsShown}>Verstanden</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}

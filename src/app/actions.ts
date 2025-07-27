
'use server';

import Papa from 'papaparse';
import { z } from 'zod';

const invoiceItemSchema = z.object({
  quantity: z.number(),
  name: z.string(),
  netAmount: z.number(),
  vatRate: z.number(),
  vatAmount: z.number(),
  grossAmount: z.number(),
});

const invoiceSchema = z.object({
  invoiceNumber: z.string(),
  orderDate: z.string(),
  buyerName: z.string(),
  buyerAddress: z.string(),
  items: z.array(invoiceItemSchema),
  netTotal: z.number(),
  vatTotal: z.number(),
  grossTotal: z.number(),
  taxNote: z.string(),
  country: z.string(),
});

const summarySchema = z.object({
  totalNetSales: z.number(),
  totalVat: z.number(),
});

const processCsvOutputSchema = z.object({
  invoices: z.array(invoiceSchema),
  summary: summarySchema,
});

export type Invoice = z.infer<typeof invoiceSchema>;
export type Summary = z.infer<typeof summarySchema>;
export type ProcessCsvOutput = z.infer<typeof processCsvOutputSchema>;


const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR',
  'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
];

function isEUDestination(countryCode: string): boolean {
    if (!countryCode) return false;
    return EU_COUNTRIES.includes(countryCode.toUpperCase());
}

function getTaxInfo(country: string, transactionType: string): { vatRate: number; taxNote: string } {
    const isEU = isEUDestination(country);
    
    // Annahme: "Sale" ist physisch, alles andere (insb. "Transaction") könnte digital sein.
    // Dies ist eine Vereinfachung. Eine bessere Logik könnte auf SKU oder Titel basieren.
    const isDigital = transactionType.toLowerCase().includes('transaction') || transactionType.toLowerCase().includes('payment');

    if (isEU) {
        if (isDigital) {
            return { vatRate: 0, taxNote: "Umsatzsteuer wird von Etsy gemäß den geltenden Vorschriften abgeführt (One-Stop-Shop-Verfahren)." };
        } else { // Physisch
            return { vatRate: 19, taxNote: "Enthält 19% deutsche USt." };
        }
    } else { // Drittland
        if (isDigital) {
            return { vatRate: 0, taxNote: "Nicht steuerbare Leistung im Drittland." };
        } else { // Physisch
            return { vatRate: 0, taxNote: "Steuerfreie Ausfuhrlieferung in ein Drittland (§ 4 Nr. 1a UStG)." };
        }
    }
}

function parseFloatSafe(value: string | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleanedValue = value.trim().replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(cleanedValue);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}


export async function generateInvoicesAction(csvData: string): Promise<{ data: ProcessCsvOutput | null; error: string | null; }> {
  try {
    const parseResult = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim(),
    });

    if (parseResult.errors.length > 0) {
        console.error("CSV Parsing Errors:", parseResult.errors);
        return { data: null, error: `Fehler beim Parsen der CSV-Datei: ${parseResult.errors[0].message}` };
    }
    
    const orders = new Map<string, Invoice>();
    let totalNetSales = 0;
    let totalVat = 0;

    const rowsBySaleId = new Map<string, any[]>();
    for (const row of parseResult.data as any[]) {
      const saleId = row['Sale ID'] || row['Order ID'];
      if (!saleId) continue;
      if (!rowsBySaleId.has(saleId)) {
        rowsBySaleId.set(saleId, []);
      }
      rowsBySaleId.get(saleId)!.push(row);
    }

    let invoiceCounter = 1;

    for (const [saleId, rows] of rowsBySaleId.entries()) {
      const firstRow = rows[0];
      const country = firstRow['Ship To Country'] || firstRow['Shipping Country'] || firstRow['Country'];
      
      const saleRow = rows.find(r => r['Type'] === 'Sale') || rows.find(r => r['Type'] === 'Transaction') || rows[0];
      const transactionType = saleRow['Type'] || 'Sale';
      
      const { vatRate, taxNote } = getTaxInfo(country, transactionType);

      const items: Invoice['items'] = [];
      let orderNetTotal = 0;
      let orderVatTotal = 0;
      let orderGrossTotal = 0;

      rows.forEach(row => {
          const itemName = row['Title'] || row['Item Name'];
          const itemType = row['Type'];
          const amount = parseFloatSafe(row['Amount']);
          const netAmount = parseFloatSafe(row['Net']);

          if ((itemType === 'Sale' || itemType === 'Transaction') && amount > 0) {
              const quantity = parseInt(row['Items'] || row['Quantity'], 10) || 1;
              
              // Wenn Netto vorhanden ist, verwenden wir es. Ansonsten rechnen wir Brutto zurück.
              const itemNet = netAmount > 0 ? netAmount : (vatRate > 0 ? amount / (1 + (vatRate / 100)) : amount);
              
              if(itemNet > 0) {
                const vatAmount = itemNet * (vatRate / 100);
                const grossAmount = itemNet + vatAmount;

                items.push({
                  quantity,
                  name: itemName || `Bestellung ${saleId}`,
                  netAmount: itemNet,
                  vatRate,
                  vatAmount,
                  grossAmount,
                });
                
                orderNetTotal += itemNet;
                orderVatTotal += vatAmount;
                orderGrossTotal += grossAmount;
              }
          }
      });
      
      if (items.length === 0) {
        continue;
      }

      const buyerFullName = firstRow['Full Name'] || firstRow['Buyer'] || firstRow['Name'] || 'N/A';
      const address1 = firstRow['Ship To Street 1'] || '';
      const address2 = firstRow['Ship To Street 2'] || '';
      const city = firstRow['Ship To City'] || '';
      const state = firstRow['Ship To State'] || '';
      const zipcode = firstRow['Ship To Zipcode'] || firstRow['Shipping Zipcode'] || '';

      let buyerAddress = address1;
      if (address2) buyerAddress += `\n${address2}`;
      buyerAddress += `\n${zipcode} ${city}`;
      if (state && state !== city) buyerAddress += `, ${state}`;
      buyerAddress += `\n${country || ''}`;


      const invoice: Invoice = {
        invoiceNumber: `RE-${new Date().getFullYear()}-${String(invoiceCounter++).padStart(4, '0')}`,
        orderDate: firstRow['Sale Date'] || firstRow['Date'],
        buyerName: buyerFullName,
        buyerAddress: buyerAddress.trim(),
        items,
        netTotal: orderNetTotal,
        vatTotal: orderVatTotal,
        grossTotal: orderGrossTotal,
        taxNote,
        country: country || 'Unbekannt',
      };

      orders.set(saleId, invoice);
      totalNetSales += orderNetTotal;
      totalVat += orderVatTotal;
    }

    const result: ProcessCsvOutput = {
      invoices: Array.from(orders.values()),
      summary: {
        totalNetSales,
        totalVat,
      },
    };
    
    if (result.invoices.length === 0) {
        return { data: null, error: "Keine gültigen Bestellungen zur Rechnungsstellung in der CSV-Datei gefunden. Bitte prüfen Sie das Dateiformat." };
    }
    
    return { data: result, error: null };
  } catch (error) {
    console.error("Error in generateInvoicesAction:", error);
    const errorMessage = error instanceof Error ? error.message : "Ein unbekannter interner Fehler ist aufgetreten.";
    return { data: null, error: `Ein unerwarteter Fehler ist aufgetreten: ${errorMessage}. Bitte überprüfen Sie die CSV-Datei und versuchen Sie es erneut.` };
  }
}

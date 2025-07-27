
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

    // Heuristik: Wir nehmen an, dass "Sale" physisch und "Etsy Payment" digital ist, wenn keine besseren Daten verfügbar sind.
    // Dies ist eine Vereinfachung und muss evtl. angepasst werden, wenn die CSV mehr Details liefert.
    const isDigital = transactionType.toLowerCase().includes('payment');

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

// Funktion zum sicheren Parsen von Zahlen, die Kommas als Dezimaltrennzeichen verwenden könnten.
function parseFloatSafe(value: string | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        // Ersetze zuerst Tausendertrennzeichen (Punkte), dann das Dezimalkomma durch einen Punkt.
        const cleanedValue = value.replace(/\./g, '').replace(',', '.');
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
      const country = firstRow['Ship To Country'] || firstRow['Shipping Country'];
      
      const saleRow = rows.find(r => (r['Type'] === 'Sale' || r['Type'] === 'Transaction') && parseFloatSafe(r['Amount']) > 0) || 
                      rows.find(r => r['Title'] || r['Item Name']) || 
                      rows[0];

      const transactionType = saleRow ? saleRow['Type'] : 'Unknown';
      
      const { vatRate, taxNote } = getTaxInfo(country, transactionType);

      const items: Invoice['items'] = [];
      let orderNetTotal = 0;
      let orderVatTotal = 0;
      let orderGrossTotal = 0;

      // Logik zur Verarbeitung der Artikel verbessert.
      rows.forEach(row => {
          const itemName = row['Title'] || row['Item Name'];
          const amount = parseFloatSafe(row['Amount']);
          const netAmount = parseFloatSafe(row['Net']);

          // Wir suchen Zeilen, die einen Artikel darstellen.
          // Das ist oft der Fall, wenn 'Sale' im Typ steht oder ein Titel vorhanden ist
          // und der Betrag positiv ist.
          if (itemName && (row['Type'] === 'Sale' || amount > 0 || netAmount > 0)) {
              const quantity = parseInt(row['Items'] || row['Quantity'], 10) || 1;
              const itemNet = netAmount > 0 ? netAmount : amount / (1 + (vatRate/100)); // Rückrechnung falls nur Brutto da ist

              if(itemNet > 0) {
                const vatAmount = itemNet * (vatRate / 100);
                const grossAmount = itemNet + vatAmount;

                items.push({
                  quantity,
                  name: itemName,
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

      const invoice: Invoice = {
        invoiceNumber: `RE-${new Date().getFullYear()}-${String(invoiceCounter++).padStart(4, '0')}`,
        orderDate: firstRow['Sale Date'] || firstRow['Date'],
        buyerName: firstRow['Full Name'] || firstRow['Buyer'] || 'N/A',
        buyerAddress: `${firstRow['Ship To Street 1'] || ''}\n${firstRow['Ship To Zipcode'] || ''} ${firstRow['Ship To City'] || ''}\n${country || ''}`.trim(),
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
    return { data: null, error: "Ein unerwarteter Fehler ist aufgetreten. Bitte überprüfen Sie die CSV-Datei und versuchen Sie es erneut." };
  }
}


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

function getTaxInfo(country: string, isDigitalProduct: boolean): { vatRate: number; taxNote: string } {
    const isEU = isEUDestination(country);

    if (isEU) {
        if (isDigitalProduct) {
            return { vatRate: 0, taxNote: "Umsatzsteuer wird von Etsy gemäß den geltenden Vorschriften abgeführt (One-Stop-Shop-Verfahren)." };
        } else { // Physisch
            return { vatRate: 19, taxNote: "Enthält 19% deutsche USt." };
        }
    } else { // Drittland
        if (isDigitalProduct) {
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

function getColumn(row: any, potentialNames: string[]): string | undefined {
    for (const name of potentialNames) {
        if (row[name] !== undefined && row[name] !== null) {
            return String(row[name]);
        }
    }
    return undefined;
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
      const saleId = getColumn(row, ['Bestellnummer', 'Sale ID', 'Order ID']);
      if (!saleId || saleId.trim() === '') continue;
      if (!rowsBySaleId.has(saleId)) {
        rowsBySaleId.set(saleId, []);
      }
      rowsBySaleId.get(saleId)!.push(row);
    }

    let invoiceCounter = 1;

    for (const [saleId, rows] of rowsBySaleId.entries()) {
      const firstRow = rows[0];
      const country = getColumn(firstRow, ['Versandland', 'Ship To Country', 'Shipping Country', 'Country']) || '';
      
      const isDigitalOrder = rows.some(r => {
        const shipping = parseFloatSafe(getColumn(r, ['Versandkosten', 'Shipping']));
        return shipping === 0;
      });
      
      const { vatRate, taxNote } = getTaxInfo(country, isDigitalOrder);

      const items: Invoice['items'] = [];
      let orderNetTotal = 0;
      let orderVatTotal = 0;
      let orderGrossTotal = 0;

      rows.forEach(row => {
          const itemName = getColumn(row, ['Titel', 'Title', 'Item Name']);
          const itemPrice = parseFloatSafe(getColumn(row, ['Artikelpreis', 'Item Price', 'Price']));
          
          if (itemName && itemPrice > 0) {
              const quantity = parseInt(getColumn(row, ['Anzahl', 'Items', 'Quantity']) || '1', 10) || 1;
              const itemTotal = parseFloatSafe(getColumn(row, ['Artikelsumme', 'Item Total']));
              const grossAmount = itemTotal > 0 ? itemTotal : itemPrice * quantity;
              
              const itemNet = vatRate > 0 ? grossAmount / (1 + (vatRate / 100)) : grossAmount;
              
              if(itemNet > 0) {
                const vatAmount = itemNet * (vatRate / 100);
                const itemGrossTotal = itemNet + vatAmount;

                items.push({
                  quantity,
                  name: itemName,
                  netAmount: itemNet,
                  vatRate,
                  vatAmount,
                  grossAmount: itemGrossTotal,
                });
                
                orderNetTotal += itemNet;
                orderVatTotal += vatAmount;
                orderGrossTotal += itemGrossTotal;
              }
          }
      });
      
      const shippingRow = rows[0]; 
      const shippingCost = parseFloatSafe(getColumn(shippingRow, ['Versandkosten', 'Shipping']));
      if (shippingCost > 0) {
          const shippingNet = vatRate > 0 ? shippingCost / (1 + (vatRate / 100)) : shippingCost;
          const shippingVat = shippingNet * (vatRate / 100);
          
          items.push({
              quantity: 1,
              name: 'Versandkosten',
              netAmount: shippingNet,
              vatRate: vatRate,
              vatAmount: shippingVat,
              grossAmount: shippingCost,
          });
          orderNetTotal += shippingNet;
          orderVatTotal += shippingVat;
          orderGrossTotal += shippingCost;
      }
      
      if (items.length === 0) {
        continue;
      }

      const buyerFullName = getColumn(firstRow, ['Vollständiger Name', 'Full Name', 'Buyer', 'Name']) || 'N/A';
      const address1 = getColumn(firstRow, ['Empfänger Adresse 1', 'Ship To Street 1', 'Street 1']) || '';
      const address2 = getColumn(firstRow, ['Empfänger Adresse 2', 'Ship To Street 2', 'Street 2']) || '';
      const city = getColumn(firstRow, ['Empfänger Stadt', 'Ship To City', 'City']) || '';
      const state = getColumn(firstRow, ['Empfänger Bundesland', 'Ship To State', 'State']) || '';
      const zipcode = getColumn(firstRow, ['Empfänger PLZ', 'Ship To Zipcode', 'Shipping Zipcode', 'Zipcode']) || '';
      const orderDate = getColumn(firstRow, ['Bestelldatum', 'Sale Date', 'Date']);
      
      let buyerAddress = address1;
      if (address2) buyerAddress += `\n${address2}`;
      buyerAddress += `\n${zipcode} ${city}`;
      if (state && state !== city) buyerAddress += `, ${state}`;
      buyerAddress += `\n${country || ''}`;


      const invoice: Invoice = {
        invoiceNumber: `RE-${new Date().getFullYear()}-${String(invoiceCounter++).padStart(4, '0')}`,
        orderDate: orderDate || new Date().toLocaleDateString('de-DE'),
        buyerName: buyerFullName,
        buyerAddress: buyerAddress.trim(),
        items,
        netTotal: orderNetTotal,
        vatTotal: orderVatTotal,
        grossTotal: orderNetTotal + orderVatTotal,
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
    return { data: null, error: `Ein unerwarteter Fehler ist aufgetreten. Bitte überprüfen Sie die CSV-Datei und versuchen Sie es erneut.` };
  }
}

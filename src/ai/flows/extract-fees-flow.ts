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

function getTaxInfo(country: string, hasSKU: boolean): { vatRate: number; taxNote: string } {
    const isEU = isEUDestination(country);

    if (hasSKU) { // Physisches Produkt
        if (isEU) { // EU-Inland / Fernverkauf
            return { vatRate: 19, taxNote: "Enthält 19% deutsche USt." };
        } else { // Drittland (Export)
            return { vatRate: 0, taxNote: "Steuerfreie Ausfuhrlieferung in ein Drittland (§ 4 Nr. 1a UStG)." };
        }
    } else { // Digitales Produkt
        if (isEU) {
            return { vatRate: 0, taxNote: "Umsatzsteuer wird von Etsy gemäß den geltenden Vorschriften abgeführt (One-Stop-Shop-Verfahren)." };
        } else { // Drittland
            return { vatRate: 0, taxNote: "Leistung außerhalb EU, keine USt" };
        }
    }
}

function parseFloatSafe(value: string | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleanedValue = value.trim()
            .replace(/\s/g, '',)
            .replace(/\./g, (match, offset, full) => full.lastIndexOf(',') > offset ? '' : '.')
            .replace(/,/g, '.');
        const parsed = parseFloat(cleanedValue);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}

function getColumn(row: any, potentialNames: string[]): string | undefined {
    // First, try case-insensitive and trimmed match on keys
    const lowerCaseTrimmedNames = potentialNames.map(n => n.toLowerCase().trim());
    for (const key in row) {
        const trimmedKey = key.toLowerCase().trim();
        if (lowerCaseTrimmedNames.includes(trimmedKey)) {
             if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
                return String(row[key]);
            }
        }
    }

    return undefined;
}


export async function generateInvoicesAction(csvData: string): Promise<{ data: ProcessCsvOutput | null; error: string | null; }> {
  try {
    const parseResult = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim().toLowerCase(),
    });

    if (parseResult.errors.length > 0) {
        console.error("CSV Parsing Errors:", parseResult.errors);
        return { data: null, error: `Fehler beim Parsen der CSV-Datei: ${parseResult.errors[0].message}` };
    }
    
    let totalNetSales = 0;
    let totalVat = 0;

    const rowsBySaleId = new Map<string, any[]>();
    for (const row of parseResult.data as any[]) {
      const saleId = getColumn(row, ['order id', 'bestellnummer', 'sale id']);
      if (!saleId) continue;
      if (!rowsBySaleId.has(saleId)) {
        rowsBySaleId.set(saleId, []);
      }
      rowsBySaleId.get(saleId)!.push(row);
    }

    const invoices: Invoice[] = [];
    let invoiceCounter = 1;

    for (const [saleId, rows] of rowsBySaleId.entries()) {
      const firstRow = rows[0];
      const country = getColumn(firstRow, ['ship country', 'versandland', 'ship to country', 'shipping country']) || '';
      
      const items: Invoice['items'] = [];
      let orderNetTotal = 0;
      let orderVatTotal = 0;
      let orderGrossTotal = 0;

      rows.forEach(row => {
          const itemName = getColumn(row, ['titel', 'title', 'item name']);
          const itemTotalStr = getColumn(row, ['item total', 'artikelsumme']);
          const sku = getColumn(row, ['sku']);

          if (itemName && itemTotalStr) {
              const itemTotal = parseFloatSafe(itemTotalStr);
              const discountAmount = parseFloatSafe(getColumn(row, ['discount amount']));
              const shippingDiscount = parseFloatSafe(getColumn(row, ['shipping discount']));
              
              const grossAmount = itemTotal - discountAmount - shippingDiscount;

              if (grossAmount <= 0) return;

              const hasSKU = !!sku && sku.trim() !== '';
              const { vatRate } = getTaxInfo(country, hasSKU);

              const quantity = parseInt(getColumn(row, ['anzahl', 'items', 'quantity']) || '1', 10) || 1;
              const netAmount = vatRate > 0 ? grossAmount / (1 + vatRate / 100) : grossAmount;
              const vatAmount = grossAmount - netAmount;

              items.push({
                quantity,
                name: itemName,
                netAmount: netAmount / quantity,
                vatRate,
                vatAmount,
                grossAmount: grossAmount,
              });
              
              orderNetTotal += netAmount;
              orderVatTotal += vatAmount;
              orderGrossTotal += grossAmount;
          }
      });
      
      const shippingRow = rows.find(r => parseFloatSafe(getColumn(r, ['shipping', 'versandkosten'])) > 0) || rows[0]; 
      const shippingCost = parseFloatSafe(getColumn(shippingRow, ['shipping', 'versandkosten']));

      if (shippingCost > 0) {
          const hasSKU = true; // Versand ist immer physisch
          const { vatRate } = getTaxInfo(country, hasSKU);

          const shippingNet = vatRate > 0 ? shippingCost / (1 + (vatRate / 100)) : shippingCost;
          const shippingVat = shippingCost - shippingNet;
          
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
      
      const hasAnySKU = rows.some(r => !!getColumn(r, ['sku']));
      const { taxNote } = getTaxInfo(country, hasAnySKU);

      const buyerFullName = getColumn(firstRow, ['ship name', 'shipname', 'shipname ']) || 'N/A';
      const address1 = getColumn(firstRow, ['ship to street 1', 'empfänger adresse 1', 'street 1']) || '';
      const address2 = getColumn(firstRow, ['ship to street 2', 'empfänger adresse 2', 'street 2']) || '';
      const city = getColumn(firstRow, ['ship to city', 'empfänger stadt', 'city']) || '';
      const state = getColumn(firstRow, ['ship to state', 'empfänger bundesland', 'state']) || '';
      const zipcode = getColumn(firstRow, ['ship to zipcode', 'empfänger plz', 'shipping zipcode', 'zipcode']) || '';
      const orderDate = getColumn(firstRow, ['sale date', 'bestelldatum', 'date']);
      
      let buyerAddress = address1;
      if (address2) buyerAddress += `\n${address2}`;
      buyerAddress += `\n${zipcode} ${city}`;
      if (state && state !== city) buyerAddress += `, ${state}`;
      
      const countryDisplay = getColumn(firstRow, ['ship country', 'versandland', 'ship to country', 'shipping country']) || 'Unbekannt';
      buyerAddress += `\n${countryDisplay}`;

      const invoice: Invoice = {
        invoiceNumber: `RE-${new Date().getFullYear()}-${String(invoiceCounter++).padStart(4, '0')}`,
        orderDate: orderDate || new Date().toLocaleDateString('de-DE'),
        buyerName: buyerFullName,
        buyerAddress: buyerAddress.trim(),
        items: items,
        netTotal: orderNetTotal,
        vatTotal: orderVatTotal,
        grossTotal: orderGrossTotal,
        taxNote,
        country: countryDisplay,
      };
      
      // Recalculate totals based on potentially adjusted items
      const finalNetTotal = invoice.items.reduce((sum, item) => sum + (item.netAmount * item.quantity), 0);
      const finalVatTotal = invoice.items.reduce((sum, item) => sum + item.vatAmount, 0);
      const finalGrossTotal = invoice.items.reduce((sum, item) => sum + item.grossAmount, 0);

      invoice.netTotal = finalNetTotal;
      invoice.vatTotal = finalVatTotal;
      invoice.grossTotal = finalGrossTotal;

      invoices.push(invoice);
      totalNetSales += finalNetTotal;
      totalVat += finalVatTotal;
    }

    if (invoices.length === 0) {
        return { data: null, error: "Keine gültigen Bestellungen zur Rechnungsstellung in der CSV-Datei gefunden. Bitte prüfen Sie das Dateiformat." };
    }

    const result: ProcessCsvOutput = {
      invoices,
      summary: {
        totalNetSales,
        totalVat,
      },
    };
    
    return { data: result, error: null };
  } catch (error) {
    console.error("Error in generateInvoicesAction:", error);
    return { data: null, error: `Ein unerwarteter Fehler ist aufgetreten. Bitte überprüfen Sie die CSV-Datei und versuchen Sie es erneut.` };
  }
}

'use server';

import Papa from 'papaparse';
import { z } from 'zod';
import type { UserInfo } from '@/lib/pdf-generator';

const invoiceItemSchema = z.object({
  quantity: z.number(),
  name: z.string(),
  netAmount: z.number(),
  vatRate: z.number(),
  vatAmount: z.number(),
  grossAmount: z.number(),
});

const invoiceSchema = z.object({
  id: z.string(), // Add a unique ID for each invoice for state management
  invoiceNumber: z.string(),
  orderDate: z.string(),
  serviceDate: z.string(),
  buyerName: z.string(),
  etsyCustomerName: z.string().optional(),
  buyerAddress: z.string(),
  items: z.array(invoiceItemSchema),
  netTotal: z.number(),
  vatTotal: z.number(),
  grossTotal: z.number(),
  taxNote: z.string(),
  country: z.string(),
  countryClassification: z.enum(['Deutschland', 'EU-Ausland', 'Drittland']),
  isCancellation: z.boolean().optional(),
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

export type BankTransaction = {
    date: string;
    description: string;
    amount: number;
}

const EU_COUNTRIES = new Set([
  'austria', 'belgium', 'bulgaria', 'croatia', 'cyprus', 'czech republic', 
  'denmark', 'estonia', 'finland', 'france', 'germany', 'greece', 'hungary', 
  'ireland', 'italy', 'latvia', 'lithuania', 'luxembourg', 'malta', 
  'netherlands', 'poland', 'portugal', 'romania', 'slovakia', 'slovenia', 
  'spain', 'sweden',
  'österreich', 'belgien', 'bulgarien', 'kroatien', 'zypern', 'tschechische republik',
  'dänemark', 'estland', 'finnland', 'frankreich', 'deutschland', 'griechenland', 'ungarn',
  'irland', 'italien', 'lettland', 'litauen', 'luxemburg', 'malta',
  'niederlande', 'polen', 'portugal', 'rumänien', 'slowakei', 'slowenien',
  'spanien', 'schweden'
]);


function normalizeString(str: string | null | undefined): string {
    if (!str) return '';
    return str.toLowerCase().trim();
}


function getCountryClassification(countryName: string): Invoice['countryClassification'] {
    const normalizedName = normalizeString(countryName);
    if (!normalizedName) return 'Drittland';

    if (normalizedName === 'germany' || normalizedName === 'deutschland') {
        return 'Deutschland';
    }
    if (EU_COUNTRIES.has(normalizedName)) {
        return 'EU-Ausland';
    }
    return 'Drittland';
}

function getTaxInfo(
    classification: Invoice['countryClassification'], 
    vatPaidByBuyer: boolean,
    taxStatus: UserInfo['taxStatus']
): { vatRate: number; taxNote: string; } {
    
    if (taxStatus === 'small_business') {
        return {
            vatRate: 0,
            taxNote: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."
        };
    }

    if (classification === 'Drittland') {
        return {
            vatRate: 0,
            taxNote: "Steuerfreie Ausfuhrlieferung in ein Drittland."
        };
    }

    if (classification === 'EU-Ausland') {
        if (vatPaidByBuyer) {
             return {
                vatRate: 0,
                taxNote: "Umsatzsteuer wird von Etsy im Rahmen des One-Stop-Shop-Verfahrens abgeführt."
            };
        }
        return { vatRate: 19, taxNote: "Enthält 19% deutsche USt." };
    }

    // Default for Germany
    return { vatRate: 19, taxNote: "Enthält 19% deutsche USt." };
}


function parseFloatSafe(value: string | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleanedValue = value.trim().replace(/\s/g, '').replace(/"/g, '');
        const lastComma = cleanedValue.lastIndexOf(',');
        const lastDot = cleanedValue.lastIndexOf('.');

        if (lastComma > lastDot) {
            const parsableValue = cleanedValue.replace(/\./g, '').replace(',', '.');
            const parsed = parseFloat(parsableValue);
            return isNaN(parsed) ? 0 : parsed;
        }
        const parsableValue = cleanedValue.replace(/,/g, '');
        const parsed = parseFloat(parsableValue);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}

const normalizeKey = (key: string) => key.toLowerCase().replace(/\s+/g, '');

function getColumn(row: any, potentialNames: string[], normalizedKeys: { [key: string]: string }): string {
    for (const name of potentialNames) {
        const normalizedName = normalizeKey(name);
        const actualKey = normalizedKeys[normalizedName];
        if (actualKey && row[actualKey] !== undefined && row[actualKey] !== null) {
            const value = String(row[actualKey]).trim();
            if (value !== '') {
                return value;
            }
        }
    }
    return '';
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.match(/(\d+)/g);
    let date: Date;
    if (parts && parts.length === 3) {
      // Assuming MM/DD/YY or similar, which is common in Etsy CSVs
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (year < 100) {
        year += 2000; // E.g., '24' becomes '2024'
      }
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(dateStr);
    }
    
    if (isNaN(date.getTime())) return dateStr;
    
    return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}


export async function generateInvoicesAction(
    csvData: string, 
    taxStatus: UserInfo['taxStatus'],
    existingInvoiceIds: Set<string>
): Promise<{ data: ProcessCsvOutput | null; error: string | null; }> {
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

    const normalizedHeaderMap: { [key: string]: string } = {};
    if (parseResult.meta.fields) {
        for (const field of parseResult.meta.fields) {
            normalizedHeaderMap[normalizeKey(field)] = field;
        }
    }

    const rowsByOrderId = new Map<string, any[]>();
    for (const row of parseResult.data as any[]) {
      const orderId = getColumn(row, ['order id', 'bestellnummer', 'sale id'], normalizedHeaderMap);
      if (!orderId || existingInvoiceIds.has(orderId)) continue; // Skip if no ID or already exists
      if (!rowsByOrderId.has(orderId)) {
        rowsByOrderId.set(orderId, []);
      }
      rowsByOrderId.get(orderId)!.push(row);
    }

    const invoices: Invoice[] = [];
    const invoiceCounters: { [year: number]: number } = {};
    let totalNetSales = 0;
    let totalVat = 0;

    for (const [orderId, rows] of rowsByOrderId.entries()) {
      const firstRow = rows[0];
      const countryName = getColumn(firstRow, ['ship country', 'versandland', 'shiptocountry', 'shippingcountry', 'country'], normalizedHeaderMap);
      const countryClassification = getCountryClassification(countryName);
      
      const vatPaidByBuyerStr = getColumn(firstRow, ['vat paid by buyer', 'vom käufer gezahlte ust'], normalizedHeaderMap);
      const vatPaidByBuyer = parseFloatSafe(vatPaidByBuyerStr) > 0;
      
      const { taxNote, vatRate: orderWideVatRate } = getTaxInfo(countryClassification, vatPaidByBuyer, taxStatus);
      
      const items: Invoice['items'] = [];
      let orderItemTotal = 0;
      
      rows.forEach(row => {
          const itemTotalStr = getColumn(row, ['item total', 'artikelsumme'], normalizedHeaderMap);
          if (itemTotalStr) {
              orderItemTotal += parseFloatSafe(itemTotalStr);
          }
      });
      
      const potentialShippingCols = ['Order Shipping', 'shipping', 'versand', 'shipping costs', 'versandkosten'];
      const shippingRow = rows.find(r => parseFloatSafe(getColumn(r, potentialShippingCols, normalizedHeaderMap)) > 0) || rows[0];
      const shippingCost = parseFloatSafe(getColumn(shippingRow, potentialShippingCols, normalizedHeaderMap));
      
      const discountAmount = parseFloatSafe(getColumn(firstRow, ['discount amount', 'rabattbetrag'], normalizedHeaderMap));
      
      const orderGrossTotal = orderItemTotal + shippingCost - discountAmount;

      if (orderGrossTotal <= 0) {
        continue;
      }
      
      const orderNetTotal = orderWideVatRate > 0 ? orderGrossTotal / (1 + orderWideVatRate / 100) : orderGrossTotal;
      const orderVatTotal = orderGrossTotal - orderNetTotal;

      rows.forEach(row => {
          const itemName = getColumn(row, ['artikelname', 'titel', 'title', 'item name'], normalizedHeaderMap);
          const itemTotalStr = getColumn(row, ['item total', 'artikelsumme'], normalizedHeaderMap);
          if (itemName && itemTotalStr) {
              const itemGross = parseFloatSafe(itemTotalStr);
              if (itemGross > 0) {
                  const itemNet = orderWideVatRate > 0 ? itemGross / (1 + orderWideVatRate / 100) : itemGross;
                  const itemVat = itemGross - itemNet;
                   items.push({
                      quantity: parseInt(getColumn(row, ['anzahl', 'items', 'quantity'], normalizedHeaderMap) || '1', 10) || 1,
                      name: itemName,
                      netAmount: itemNet,
                      vatRate: orderWideVatRate,
                      vatAmount: itemVat,
                      grossAmount: itemGross,
                  });
              }
          }
      });
      
      if (shippingCost > 0) {
          const shippingNet = orderWideVatRate > 0 ? shippingCost / (1 + orderWideVatRate / 100) : shippingCost;
          const shippingVat = shippingCost - shippingNet;
          items.push({
              quantity: 1,
              name: 'Versandkosten',
              netAmount: shippingNet,
              vatRate: orderWideVatRate,
              vatAmount: shippingVat,
              grossAmount: shippingCost,
          });
      }

      if (discountAmount > 0) {
          const discountNet = orderWideVatRate > 0 ? discountAmount / (1 + orderWideVatRate / 100) : discountAmount;
          const discountVat = discountAmount - discountNet;
          items.push({
              quantity: 1,
              name: 'Rabatt',
              netAmount: -discountNet,
              vatRate: orderWideVatRate,
              vatAmount: -discountVat,
              grossAmount: -discountAmount,
          });
      }
      
      let buyerName = getColumn(firstRow, ['ship name', 'ship to name', 'full name', 'empfaengername', 'kaeufer', 'buyer'], normalizedHeaderMap);
      let buyerAddress: string;

      const address1 = getColumn(firstRow, ['ship address1', 'ship to street 1', 'empfaenger adresse 1', 'street 1'], normalizedHeaderMap);
      const address2 = getColumn(firstRow, ['ship address2', 'ship to street 2', 'empfaenger adresse 2', 'street 2'], normalizedHeaderMap);
      const city = getColumn(firstRow, ['ship city', 'ship to city', 'empfaenger stadt', 'city'], normalizedHeaderMap);
      const state = getColumn(firstRow, ['ship state', 'ship to state', 'empfaenger bundesland', 'state'], normalizedHeaderMap);
      const zipcode = getColumn(firstRow, ['ship zipcode', 'ship to zipcode', 'empfaenger plz', 'shipping zipcode', 'zipcode'], normalizedHeaderMap);
      const countryDisplay = getColumn(firstRow, ['ship country', 'versandland', 'ship to country', 'shipping country', 'country'], normalizedHeaderMap);
      
      let addressParts = [address1, address2, `${zipcode} ${city}`];
      if(state && state !== city) {
        addressParts[1] = address2 ? `${address2}, ${state}` : state;
      }
      addressParts.push(countryDisplay);
      
      buyerAddress = addressParts.filter(part => part && part.trim() !== '' && part.trim() !== city).join('\\n');
      
      const orderDateRaw = getColumn(firstRow, ['sale date', 'bestelldatum', 'date', 'datum des kaufs'], normalizedHeaderMap);
      const orderDate = formatDate(orderDateRaw);
      
      const dateObject = new Date(orderDate.split('.').reverse().join('-'));
      const orderYear = !isNaN(dateObject.getTime()) ? dateObject.getFullYear() : new Date().getFullYear();
      
      if (!invoiceCounters[orderYear]) {
          invoiceCounters[orderYear] = 1;
      }
      const invoiceNumberForYear = invoiceCounters[orderYear]++;
      const finalOrderDate = orderDate || new Date().toLocaleDateString('de-DE');

      const invoice: Invoice = {
        id: orderId,
        invoiceNumber: `RE-${orderYear}-${String(invoiceNumberForYear).padStart(4, '0')}`,
        orderDate: finalOrderDate,
        serviceDate: finalOrderDate,
        buyerName: buyerName || 'Unbekannt',
        buyerAddress,
        items,
        netTotal: orderNetTotal,
        vatTotal: orderVatTotal,
        grossTotal: orderGrossTotal,
        taxNote,
        country: countryName || 'Unbekannt',
        countryClassification,
      };
      
      invoices.push(invoice);
      totalNetSales += invoice.netTotal;
      totalVat += invoice.vatTotal;
    }

    if (invoices.length === 0) {
        return { data: null, error: "Keine neuen Bestellungen in der CSV-Datei gefunden. Bereits existierende Rechnungen wurden übersprungen." };
    }
    
    invoices.sort((a, b) => {
        const dateA = new Date(a.orderDate.split('.').reverse().join('-')).getTime();
        const dateB = new Date(b.orderDate.split('.').reverse().join('-')).getTime();
        if (dateA !== dateB) {
            return dateA - dateB;
        }
        return a.invoiceNumber.localeCompare(b.invoiceNumber);
    });

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
    const errorMessage = error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten.";
    return { data: null, error: `Ein unerwarteter Fehler ist aufgetreten. Bitte überprüfen Sie die CSV-Datei und versuchen Sie es erneut. Details: ${errorMessage}` };
  }
}

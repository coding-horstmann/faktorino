
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

const EU_COUNTRIES_EN = new Set([
  'austria', 'belgium', 'bulgaria', 'croatia', 'cyprus', 'czech republic', 
  'denmark', 'estonia', 'finland', 'france', 'germany', 'greece', 'hungary', 
  'ireland', 'italy', 'latvia', 'lithuania', 'luxembourg', 'malta', 
  'netherlands', 'poland', 'portugal', 'romania', 'slovakia', 'slovenia', 
  'spain', 'sweden'
]);

const ETSY_ADDRESS_INFO = {
    name: 'Etsy Ireland UC',
    address: 'One Le Pole Square\nShip Street Great\nDublin 8\nIreland\nUSt-IdNr. IE9777587C',
};

function normalizeString(str: string | null | undefined): string {
    if (!str) return '';
    return str.toLowerCase().trim();
}


function getCountryClassification(countryName: string): Invoice['countryClassification'] {
    const normalizedName = normalizeString(countryName);
    if (!normalizedName) return 'Drittland';

    if (normalizedName === 'germany') {
        return 'Deutschland';
    }
    if (EU_COUNTRIES_EN.has(normalizedName)) {
        return 'EU-Ausland';
    }
    return 'Drittland';
}

function getTaxInfo(
    classification: Invoice['countryClassification'], 
    isPhysical: boolean,
    taxStatus: UserInfo['taxStatus']
): { vatRate: number; taxNote: string; recipient: 'buyer' | 'etsy' } {
    
    if (taxStatus === 'small_business') {
        return {
            vatRate: 0,
            taxNote: "Im Sinne der Kleinunternehmerregelung nach § 19 UStG enthält der ausgewiesene Betrag keine Umsatzsteuer.",
            recipient: 'buyer' // For small businesses, the invoice is always to the buyer
        };
    }

    // Regular tax payer logic below
    if (isPhysical) {
        const recipient = 'buyer';
        if (classification === 'Deutschland' || classification === 'EU-Ausland') {
            return { vatRate: 19, taxNote: "Enthält 19% deutsche USt.", recipient };
        } else { // Drittland
            return { vatRate: 0, taxNote: "Steuerfreie Ausfuhrlieferung gemäß § 4 Nr. 1 a UStG.", recipient };
        }
    } else { // Digital Product
        if (classification === 'Drittland') {
             return {
                recipient: 'etsy',
                vatRate: 0,
                taxNote: "Leistung außerhalb EU, keine Ust."
            };
        }
        return {
            recipient: 'etsy',
            vatRate: 0,
            taxNote: "USt wird von Etsy abgeführt (One-Stop-Shop).\nSteuerschuldnerschaft des Leistungsempfängers/Reverse Charge."
        };
    }
}

function parseFloatSafe(value: string | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleanedValue = value.trim().replace(/\s/g, '').replace(/"/g, '');
        const lastComma = cleanedValue.lastIndexOf(',');
        const lastDot = cleanedValue.lastIndexOf('.');

        // Treat comma as decimal separator
        if (lastComma > lastDot) {
            const parsableValue = cleanedValue.replace(/\./g, '').replace(',', '.');
            const parsed = parseFloat(parsableValue);
            return isNaN(parsed) ? 0 : parsed;
        }
        // Treat dot as decimal separator, remove commas
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
    // Handle cases like "dd.MM.yy" or "MM/dd/yy"
    const parts = dateStr.match(/(\d+)/g);
    let date: Date;
    if (parts && parts.length === 3) {
      // Assuming MM/DD/YY format from Etsy CSV
      date = new Date(parseInt(parts[2], 10) > 50 ? `19${parts[2]}` : `20${parts[2]}`, parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
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


export async function generateInvoicesAction(csvData: string, taxStatus: UserInfo['taxStatus']): Promise<{ data: ProcessCsvOutput | null; error: string | null; }> {
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
      if (!orderId) continue;
      if (!rowsByOrderId.has(orderId)) {
        rowsByOrderId.set(orderId, []);
      }
      rowsByOrderId.get(orderId)!.push(row);
    }

    const invoices: Invoice[] = [];
    let totalNetSales = 0;
    let totalVat = 0;
    let invoiceCounter = 1;

    for (const [orderId, rows] of rowsByOrderId.entries()) {
      const firstRow = rows[0];
      const countryName = getColumn(firstRow, ['ship country', 'versandland', 'shiptocountry', 'shippingcountry', 'country'], normalizedHeaderMap);
      const countryClassification = getCountryClassification(countryName);
      
      const isOrderPhysical = rows.some(r => getColumn(r, ['sku'], normalizedHeaderMap).trim() !== '');
      const { taxNote, recipient } = getTaxInfo(countryClassification, isOrderPhysical, taxStatus);

      let orderNetTotal = 0;
      let orderVatTotal = 0;
      let orderGrossTotal = 0;
      const items: Invoice['items'] = [];

      rows.forEach(row => {
          const itemName = getColumn(row, ['artikelname', 'titel', 'title', 'item name'], normalizedHeaderMap);
          const itemTotalStr = getColumn(row, ['item total', 'artikelsumme'], normalizedHeaderMap);

          if (itemName && itemTotalStr) {
              const itemTotal = parseFloatSafe(itemTotalStr);
              const discountAmount = parseFloatSafe(getColumn(row, ['discount amount', 'rabattbetrag'], normalizedHeaderMap));
              const shippingDiscount = parseFloatSafe(getColumn(row, ['shipping discount', 'versandrabatt'], normalizedHeaderMap));
              
              const grossAmount = itemTotal - discountAmount - shippingDiscount;

              if (grossAmount > 0) {
                  const isItemPhysical = getColumn(row, ['sku'], normalizedHeaderMap).trim() !== '';
                  const { vatRate: itemVatRate } = getTaxInfo(countryClassification, isItemPhysical, taxStatus);
                  
                  const quantity = parseInt(getColumn(row, ['anzahl', 'items', 'quantity'], normalizedHeaderMap) || '1', 10) || 1;
                  const netAmount = itemVatRate > 0 ? grossAmount / (1 + itemVatRate / 100) : grossAmount;
                  const vatAmount = grossAmount - netAmount;

                  items.push({
                    quantity,
                    name: itemName,
                    netAmount,
                    vatRate: itemVatRate,
                    vatAmount,
                    grossAmount,
                  });
                  
                  orderNetTotal += netAmount;
                  orderVatTotal += vatAmount;
                  orderGrossTotal += grossAmount;
              }
          }
      });
      
      const shippingRow = rows.find(r => parseFloatSafe(getColumn(r, ['shipping', 'versand', 'shipping costs', 'versandkosten'], normalizedHeaderMap)) > 0) || rows[0];
      const shippingCost = parseFloatSafe(getColumn(shippingRow, ['shipping', 'versand', 'shipping costs', 'versandkosten'], normalizedHeaderMap));

      if (shippingCost > 0) {
          const { vatRate: shippingVatRate } = getTaxInfo(countryClassification, true, taxStatus); // Shipping is always physical
          const shippingNet = shippingVatRate > 0 ? shippingCost / (1 + shippingVatRate / 100) : shippingCost;
          const shippingVat = shippingCost - shippingNet;
          
          items.push({
              quantity: 1,
              name: 'Versandkosten',
              netAmount: shippingNet,
              vatRate: shippingVatRate,
              vatAmount: shippingVat,
              grossAmount: shippingCost,
          });
          orderNetTotal += shippingNet;
          orderVatTotal += shippingVat;
          orderGrossTotal += shippingCost;
      }
      
      if (orderGrossTotal <= 0) {
        continue;
      }

      let buyerName: string;
      let buyerAddress: string;

      if (recipient === 'etsy') {
          buyerName = ETSY_ADDRESS_INFO.name;
          buyerAddress = ETSY_ADDRESS_INFO.address;
      } else {
          buyerName = getColumn(firstRow, ['ship name', 'ship to name', 'full name', 'empfaengername', 'kaeufer'], normalizedHeaderMap);
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
          
          buyerAddress = addressParts.filter(part => part && part.trim() !== '' && part.trim() !== city).join('\n');
      }
      
      const orderDateRaw = getColumn(firstRow, ['sale date', 'bestelldatum', 'date', 'datum des kaufs'], normalizedHeaderMap);
      const orderDate = formatDate(orderDateRaw);
      
      const invoice: Invoice = {
        invoiceNumber: `RE-${new Date().getFullYear()}-${String(invoiceCounter++).padStart(4, '0')}`,
        orderDate: orderDate || new Date().toLocaleDateString('de-DE'),
        buyerName,
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
        return { data: null, error: "Keine gültigen Bestellungen zur Rechnungsstellung in der CSV-Datei gefunden. Bitte prüfen Sie das Dateiformat und die Spaltennamen." };
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
    const errorMessage = error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten.";
    return { data: null, error: `Ein unerwarteter Fehler ist aufgetreten. Bitte überprüfen Sie die CSV-Datei und versuchen Sie es erneut. Details: ${errorMessage}` };
  }
}


export async function processBankStatementAction(csvData: string): Promise<{ totalAmount?: number; transactions?: BankTransaction[]; foundEtsyTransaction?: boolean; error?: string; }> {
    try {
        const parseResult = Papa.parse(csvData, {
            skipEmptyLines: true,
            header: false, // We will find the header ourselves
        });

        if (parseResult.errors.length > 0) {
            console.error("CSV Parsing Errors in Bank Statement:", parseResult.errors);
            return { error: `Fehler beim Parsen der CSV-Datei: ${parseResult.errors[0].message}` };
        }

        const data = parseResult.data as string[][];

        const headerKeywords = {
            amount: ['betrag', 'amount', 'summe'],
            description: ['verwendungszweck', 'beschreibung', 'buchungstext', 'text', 'auftraggeber', 'empfänger', 'beguenstigter/zahlungspflichtiger', 'name'],
            date: ['datum', 'date', 'buchungstag', 'valuta']
        };

        let headerRowIndex = -1;
        let headers: string[] = [];

        let maxScore = 0;
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!Array.isArray(row) || row.length < 2) continue;
            
            let score = 0;
            const lowerCaseRow = row.map(cell => String(cell || '').toLowerCase().trim());
            
            for (const key in headerKeywords) {
                if (lowerCaseRow.some(cell => headerKeywords[key as keyof typeof headerKeywords].some(kw => cell.includes(kw)))) {
                    score++;
                }
            }

            if (score > maxScore && score > 1) { // A good header should have at least amount and description/date
                maxScore = score;
                headerRowIndex = i;
                headers = lowerCaseRow;
            }
        }


        if (headerRowIndex === -1) {
            return { error: "Konnte keine gültige Header-Zeile mit Spalten wie 'Betrag', 'Datum' oder 'Verwendungszweck' in der CSV-Datei finden. Bitte prüfen Sie die Datei." };
        }

        const findIndex = (keywords: string[]): number => {
            for (const kw of keywords) {
                const index = headers.findIndex(h => h.includes(kw));
                if (index !== -1) return index;
            }
            return -1;
        };
        
        const amountIndex = findIndex(headerKeywords.amount);
        const dateIndex = findIndex(headerKeywords.date);
        const descriptionIndices = headerKeywords.description
            .map(kw => headers.findIndex(h => h.includes(kw)))
            .filter(index => index !== -1);
        const uniqueDescriptionIndices = [...new Set(descriptionIndices)];


        if (amountIndex === -1) return { error: "Konnte die 'Betrag'-Spalte in der CSV nicht finden." };
        if (uniqueDescriptionIndices.length === 0) return { error: "Konnte keine Spalte für den Verwendungszweck oder die Beschreibung in der CSV finden." };
        if (dateIndex === -1) return { error: "Konnte die 'Datum'-Spalte in der CSV nicht finden."};

        let totalAmount = 0;
        let foundEtsyTransaction = false;
        const transactions: BankTransaction[] = [];
        const dataStartIndex = headerRowIndex + 1;

        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (!Array.isArray(row) || row.length <= Math.max(amountIndex, dateIndex, ...uniqueDescriptionIndices)) continue;

            const amountStr = row[amountIndex];
            const dateStr = row[dateIndex];
            const fullDescription = uniqueDescriptionIndices.map(idx => row[idx] || '').join(' ').toLowerCase();

            if (!amountStr || !dateStr || parseFloatSafe(amountStr) === 0) {
                continue;
            }

            if (fullDescription.includes('etsy')) {
                foundEtsyTransaction = true;
                const amount = parseFloatSafe(amountStr);
                totalAmount += amount;
                transactions.push({
                    date: dateStr || 'N/A',
                    description: uniqueDescriptionIndices.map(idx => row[idx] || '').join(' '),
                    amount: amount
                });
            }
        }
        
        return { totalAmount, transactions, foundEtsyTransaction };

    } catch (error) {
        console.error("Error processing bank statement CSV:", error);
        return { error: 'Ein unerwarteter Fehler ist beim Verarbeiten des Kontoauszugs aufgetreten.' };
    }
}

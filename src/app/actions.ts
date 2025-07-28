
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
  countryClassification: z.enum(['Deutschland', 'EU-Ausland', 'Drittland']),
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

const EU_COUNTRY_NAMES = [
  'belgien', 'bulgarien', 'daenemark', 'estland', 'finnland', 'frankreich', 
  'griechenland', 'irland', 'italien', 'kroatien', 'lettland', 'litauen', 
  'luxemburg', 'malta', 'niederlande', 'oesterreich', 'polen', 'portugal', 
  'rumaenien', 'schweden', 'slowakei', 'slowenien', 'spanien', 'tschechien', 
  'ungarn', 'zypern'
];

const ETSY_ADDRESS_INFO = {
    name: 'Etsy Ireland UC',
    address: 'One Le Pole Square\nShip Street Great\nDublin 8\nIreland',
    fullAddress: 'Etsy Ireland UC\nOne Le Pole Square\nShip Street Great\nDublin 8\nIreland\nUSt-IdNr. IE9777587C'
};

function normalizeCountryName(countryName: string): string {
    if (!countryName) return '';
    return countryName.toLowerCase().trim()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}

function getCountryClassification(countryName: string): Invoice['countryClassification'] {
    const normalizedName = normalizeCountryName(countryName);
    if (!normalizedName) return 'Drittland';
    
    if (normalizedName === 'deutschland') {
        return 'Deutschland';
    }
    if (EU_COUNTRY_NAMES.includes(normalizedName)) {
        return 'EU-Ausland';
    }
    return 'Drittland';
}


function getTaxInfo(classification: Invoice['countryClassification'], hasSKU: boolean): { vatRate: number; taxNote: string; recipient: 'buyer' | 'etsy' } {
    const isEU = classification === 'Deutschland' || classification === 'EU-Ausland';

    if (hasSKU) { // Physisches Produkt
        if (classification === 'Deutschland') {
            return { vatRate: 19, taxNote: "Enthält 19% deutsche USt.", recipient: 'buyer' };
        } else if (classification === 'EU-Ausland') {
             return { vatRate: 19, taxNote: "Enthält 19% deutsche USt.", recipient: 'buyer' };
        } else { // Drittland (Export)
            return { vatRate: 0, taxNote: "Steuerfreie Ausfuhrlieferung in ein Drittland (§ 4 Nr. 1a UStG).", recipient: 'buyer' };
        }
    } else { // Digitales Produkt
        if (isEU) {
            return { vatRate: 0, taxNote: "Steuerschuldnerschaft des Leistungsempfängers/Reverse Charge", recipient: 'etsy' };
        } else { // Drittland
            return { vatRate: 0, taxNote: "Leistung außerhalb EU, keine USt.", recipient: 'etsy' };
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

// Normalisiert einen String für den Schlüsselvergleich (Kleinschreibung, keine Leerzeichen)
const normalizeKey = (key: string) => key.toLowerCase().replace(/\s+/g, '');

function getColumn(row: any, potentialNames: string[], normalizedKeys: { [key: string]: string }): string | undefined {
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
    
    // Erstelle eine Map von normalisierten Schlüsseln zu den Originalschlüsseln aus dem Header
    const normalizedHeaderMap: { [key: string]: string } = {};
    if (parseResult.meta.fields) {
        for (const field of parseResult.meta.fields) {
            normalizedHeaderMap[normalizeKey(field)] = field;
        }
    }

    let totalNetSales = 0;
    let totalVat = 0;
    
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
    let invoiceCounter = 1;

    for (const [orderId, rows] of rowsByOrderId.entries()) {
      const firstRow = rows[0];
      const countryName = getColumn(firstRow, ['ship country', 'versandland', 'ship to country', 'shipping country', 'country'], normalizedHeaderMap) || '';
      const countryClassification = getCountryClassification(countryName);
      const hasAnySKU = rows.some(r => !!getColumn(r, ['sku'], normalizedHeaderMap) && (getColumn(r, ['sku'], normalizedHeaderMap) || '').trim() !== '');

      const { taxNote, recipient } = getTaxInfo(countryClassification, hasAnySKU);

      const items: Invoice['items'] = [];
      let orderNetTotal = 0;
      let orderVatTotal = 0;
      let orderGrossTotal = 0;

      rows.forEach(row => {
          const itemName = getColumn(row, ['titel', 'title', 'item name'], normalizedHeaderMap);
          const itemTotalStr = getColumn(row, ['item total', 'artikelsumme'], normalizedHeaderMap);
          const sku = getColumn(row, ['sku'], normalizedHeaderMap);

          // Process item only if it has a name and a total value
          if (itemName && itemTotalStr) {
              const itemTotal = parseFloatSafe(itemTotalStr);
              const discountAmount = parseFloatSafe(getColumn(row, ['discount amount'], normalizedHeaderMap));
              const shippingDiscount = parseFloatSafe(getColumn(row, ['shipping discount'], normalizedHeaderMap));
              
              const grossAmount = itemTotal - discountAmount - shippingDiscount;

              // Only skip this specific item if its value is zero, not the whole order
              if (grossAmount > 0) {
                  const hasSKU = !!sku && sku.trim() !== '';
                  const { vatRate: itemVatRate } = getTaxInfo(countryClassification, hasSKU);
                  
                  const quantity = parseInt(getColumn(row, ['anzahl', 'items', 'quantity'], normalizedHeaderMap) || '1', 10) || 1;
                  const netAmount = itemVatRate > 0 ? grossAmount / (1 + itemVatRate / 100) : grossAmount;
                  const vatAmount = grossAmount - netAmount;

                  items.push({
                    quantity,
                    name: itemName,
                    netAmount: netAmount,
                    vatRate: itemVatRate,
                    vatAmount: vatAmount,
                    grossAmount: grossAmount,
                  });
                  
                  orderNetTotal += netAmount;
                  orderVatTotal += vatAmount;
                  orderGrossTotal += grossAmount;
              }
          }
      });
      
      const shippingRow = rows.find(r => parseFloatSafe(getColumn(r, ['shipping', 'versand', 'shipping costs'], normalizedHeaderMap)) > 0) || rows[0];
      const shippingCost = parseFloatSafe(getColumn(shippingRow, ['shipping', 'versand', 'shipping costs'], normalizedHeaderMap));

      if (shippingCost > 0) {
          // Shipping is always treated as a physical product delivery for tax purposes
          const { vatRate: shippingVatRate } = getTaxInfo(countryClassification, true);

          const shippingNet = shippingVatRate > 0 ? shippingCost / (1 + (shippingVatRate / 100)) : shippingCost;
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
      
      // Create an invoice only if there are items with a total value greater than 0
      if (orderGrossTotal <= 0) {
        continue;
      }

      let buyerName: string;
      let buyerAddress: string;

      if (recipient === 'etsy') {
          buyerName = ETSY_ADDRESS_INFO.name;
          buyerAddress = ETSY_ADDRESS_INFO.fullAddress;
      } else {
          buyerName = getColumn(firstRow, ['ship name', 'ship to name', 'full name'], normalizedHeaderMap) || 'N/A';
          const address1 = getColumn(firstRow, ['ship to street 1', 'empfaenger adresse 1', 'street 1'], normalizedHeaderMap) || '';
          const address2 = getColumn(firstRow, ['ship to street 2', 'empfaenger adresse 2', 'street 2'], normalizedHeaderMap) || '';
          const city = getColumn(firstRow, ['ship to city', 'empfaenger stadt', 'city'], normalizedHeaderMap) || '';
          const state = getColumn(firstRow, ['ship to state', 'empfaenger bundesland', 'state'], normalizedHeaderMap) || '';
          const zipcode = getColumn(firstRow, ['ship to zipcode', 'empfaenger plz', 'shipping zipcode', 'zipcode'], normalizedHeaderMap) || '';
          const countryDisplay = getColumn(firstRow, ['ship country', 'versandland', 'ship to country', 'shipping country', 'country'], normalizedHeaderMap) || 'Unbekannt';

          let address = address1;
          if (address2) address += `\n${address2}`;
          address += `\n${zipcode} ${city}`;
          if (state && state !== city) address += `, ${state}`;
          address += `\n${countryDisplay}`;
          buyerAddress = address.trim();
      }
      
      const orderDate = getColumn(firstRow, ['sale date', 'bestelldatum', 'date'], normalizedHeaderMap);
      
      const invoice: Invoice = {
        invoiceNumber: `RE-${new Date().getFullYear()}-${String(invoiceCounter++).padStart(4, '0')}`,
        orderDate: orderDate || new Date().toLocaleDateString('de-DE'),
        buyerName: buyerName,
        buyerAddress: buyerAddress,
        items: items,
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
    return { data: null, error: `Ein unerwarteter Fehler ist aufgetreten. Bitte überprüfen Sie die CSV-Datei und versuchen Sie es erneut.` };
  }
}


export async function processBankStatementAction(csvData: string): Promise<{ totalAmount?: number; transactions?: BankTransaction[]; foundEtsyTransaction?: boolean; error?: string; }> {
    try {
        const parseResult = Papa.parse(csvData, {
            skipEmptyLines: true,
            dynamicTyping: true, // Be more flexible with data types
        });

        if (parseResult.errors.length > 0) {
            console.error("CSV Parsing Errors in Bank Statement:", parseResult.errors);
            return { error: `Fehler beim Parsen der CSV-Datei: ${parseResult.errors[0].message}` };
        }

        const data = parseResult.data as (string | number)[][];

        const headerKeywords = ['betrag', 'verwendungszweck', 'auftraggeber', 'empfänger', 'buchungstext', 'beschreibung', 'name', 'beguenstigter/zahlungspflichtiger'];
        let headerRowIndex = -1;
        let headers: string[] = [];

        for (let i = 0; i < data.length; i++) {
            // Check if the row is an array and not empty
            if (Array.isArray(data[i]) && data[i].length > 0) {
                const row = data[i].map(h => String(h).toLowerCase().trim());
                if (row.some(cell => headerKeywords.some(kw => cell.includes(kw)))) {
                    headerRowIndex = i;
                    headers = data[i].map(h => String(h).toLowerCase().trim());
                    break;
                }
            }
        }

        if (headerRowIndex === -1) {
            return { error: "Konnte keine gültige Header-Zeile mit Spalten wie 'Betrag' oder 'Verwendungszweck' in der CSV-Datei finden." };
        }

        const descriptionKeys = ['verwendungszweck', 'beschreibung', 'buchungstext', 'text', 'auftraggeber/empfänger', 'empfänger/auftraggeber', 'beguenstigter/zahlungspflichtiger', 'name'];
        const amountKeys = ['betrag', 'amount', 'gutschrift', 'lastschrift'];
        const dateKeys = ['datum', 'buchungsdatum', 'valuta', 'buchungstag'];
        
        let amountIndex = -1;
        let dateIndex = -1;
        const descriptionIndices: number[] = [];

        headers.forEach((header, index) => {
            if (amountKeys.some(key => header.includes(key))) amountIndex = index;
            if (dateKeys.some(key => header.includes(key))) dateIndex = index;
            if (descriptionKeys.some(key => header.includes(key))) descriptionIndices.push(index);
        });

        if (amountIndex === -1) return { error: "Konnte die 'Betrag'-Spalte in der CSV nicht finden." };
        if (descriptionIndices.length === 0) return { error: "Konnte keine Spalte für den Verwendungszweck oder die Beschreibung in der CSV finden." };
        if (dateIndex === -1) return { error: "Konnte die 'Datum'-Spalte in der CSV nicht finden."};

        let totalAmount = 0;
        let foundEtsyTransaction = false;
        const transactions: BankTransaction[] = [];

        for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i];
            if(row.length <= Math.max(amountIndex, dateIndex, ...descriptionIndices)) continue;

            const fullDescription = descriptionIndices.map(idx => row[idx] || '').join(' ').toLowerCase();

            if (fullDescription.includes('etsy')) {
                foundEtsyTransaction = true;
                const amount = parseFloatSafe(row[amountIndex]);
                totalAmount += amount;
                transactions.push({
                    date: String(row[dateIndex] || 'N/A'),
                    description: descriptionIndices.map(idx => row[idx] || '').join(' '),
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

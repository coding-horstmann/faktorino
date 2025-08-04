
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Invoice } from '@/app/actions';

// Erweitern der jsPDF-Typdefinition, um autoTable hinzuzufügen
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export type UserInfo = {
    name: string;
    address: string;
    city: string;
    taxInfo: string;
    taxStatus: 'regular' | 'small_business';
}

const ETSY_PLATFORM_INFO = 'Verkauf über die Plattform:\nEtsy Ireland UC\nOne Le Pole Square\nShip Street Great\nDublin 8, Ireland\nUSt-IdNr. IE9777587C';


export function generatePdf(invoice: Invoice, userInfo: UserInfo, outputType: 'save'): void;
export function generatePdf(invoice: Invoice, userInfo: UserInfo, outputType: 'blob'): Promise<Blob | null>;
export async function generatePdf(invoice: Invoice, userInfo: UserInfo, outputType: 'save' | 'blob' = 'save'): Promise<Blob | null> | void {
    const doc = new jsPDF();

    const { name: senderName, address: senderAddress, city: senderCity, taxInfo: senderTaxInfo } = userInfo;

    // Absenderzeile (klein, oben)
    doc.setFontSize(8);
    doc.text(`${senderName} • ${senderAddress} • ${senderCity}`, 20, 20);

    // Empfängeradresse (links unter dem Absender)
    doc.setFontSize(10);
    const recipientYStart = 40;
    let currentY = recipientYStart;
    doc.text(invoice.buyerName, 20, currentY);
    currentY += 5;
    const recipientLines = invoice.buyerAddress.split('\n');
    recipientLines.forEach((line) => {
        if (line.trim() !== '') {
            doc.text(line, 20, currentY);
            currentY += 5;
        }
    });


    const headerY = 80;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const title = invoice.isCancellation ? 'Stornorechnung' : 'Rechnung';
    doc.text(title, 20, headerY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rechnungs-Nr.: ${invoice.invoiceNumber}`, 120, headerY);
    doc.text(`Rechnungsdatum: ${invoice.orderDate}`, 120, headerY + 5);
    doc.text(`Leistungsdatum: ${invoice.serviceDate}`, 120, headerY + 10);

    const tableColumn = ["Pos.", "Bezeichnung", "Menge", "USt.", "Einzelpreis (Netto)", "Gesamt (Netto)"];
    const tableRows: any[][] = [];

    invoice.items.forEach((item, index) => {
        const singlePrice = item.quantity !== 0 ? item.netAmount / item.quantity : 0;
        const itemData = [
            index + 1,
            item.name,
            item.quantity,
            `${item.vatRate.toFixed(0)} %`,
            `${singlePrice.toFixed(2)} €`,
            `${item.netAmount.toFixed(2)} €`,
        ];
        tableRows.push(itemData);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: headerY + 20,
        theme: 'striped',
        headStyles: { fillColor: [30, 30, 30] }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    const summaryX = 130;
    let summaryY = finalY + 10;
    const valueX = 195;

    doc.setFontSize(10);
    doc.text('Zwischensumme (Netto):', summaryX, summaryY);
    doc.text(`${invoice.netTotal.toFixed(2)} €`, valueX, summaryY, { align: 'right' });

    summaryY += 7;
    doc.text(`zzgl. USt:`, summaryX, summaryY);
    doc.text(`${invoice.vatTotal.toFixed(2)} €`, valueX, summaryY, { align: 'right' });

    summaryY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Gesamtbetrag:', summaryX, summaryY);
    doc.text(`${invoice.grossTotal.toFixed(2)} €`, valueX, summaryY, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // Position for tax notes and other info
    let infoY = finalY + 15;
    const taxNoteLines = doc.splitTextToSize(invoice.taxNote, 100);
    doc.text(taxNoteLines, 20, infoY);
    infoY += (taxNoteLines.length * 4) + 5;
    
    if (!invoice.isCancellation) {
        doc.text("Zahlung dankend erhalten.", 20, infoY);
        infoY += 10;
    }

    doc.setFontSize(8);
    doc.setTextColor(100);
    const etsyNoteLines = doc.splitTextToSize(ETSY_PLATFORM_INFO, 100);
    doc.text(etsyNoteLines, 20, infoY);


    doc.setFontSize(8);
    doc.setTextColor(0);
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    doc.text(`${senderName}, ${senderAddress}, ${senderCity} | ${senderTaxInfo}`, 20, pageHeight - 10);
    
    const fileName = invoice.isCancellation ? `Stornorechnung-${invoice.invoiceNumber.replace('-STORNO','')}.pdf` : `Rechnung-${invoice.invoiceNumber}.pdf`;

    if (outputType === 'save') {
        doc.save(fileName);
        return Promise.resolve(null);
    } else {
        return Promise.resolve(doc.output('blob'));
    }
}


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
    taxNumber: string;
    vatId: string;
    taxStatus: 'regular' | 'small_business';
    logo: string | null;
}

const ETSY_PLATFORM_INFO = 'Verkauf über die Plattform:\nEtsy Ireland UC\nOne Le Pole Square\nShip Street Great\nDublin 8, Ireland\nUSt-IdNr. IE9777587C';


export function generatePdf(invoice: Invoice, userInfo: UserInfo, outputType: 'save'): void;
export function generatePdf(invoice: Invoice, userInfo: UserInfo, outputType: 'blob'): Promise<Blob | null>;
export async function generatePdf(invoice: Invoice, userInfo: UserInfo, outputType: 'save' | 'blob' = 'save'): Promise<Blob | null | void> {
    const doc = new jsPDF();

    const { name: senderName, address: senderAddress, city: senderCity, taxNumber, vatId, logo } = userInfo;
    
    let headerY = 20;

    if (logo) {
        try {
            const img = new Image();
            img.src = logo;
            await new Promise(resolve => img.onload = resolve);
            const imgProps = doc.getImageProperties(logo);
            const aspectRatio = imgProps.width / imgProps.height;
            const imgWidth = 25;
            const imgHeight = imgWidth / aspectRatio;
            doc.addImage(logo, 'PNG', 170, 15, imgWidth, imgHeight);
            headerY = 15 + imgHeight + 5; // Adjust header start based on logo height
        } catch(e) {
            console.error("Error adding logo to PDF:", e);
        }
    }


    // Absenderzeile (klein, oben)
    doc.setFontSize(8);
    doc.text(`${senderName} • ${senderAddress} • ${senderCity}`, 20, 20);

    // Empfängeradresse (links unter dem Absender)
    doc.setFontSize(10);
    const recipientYStart = 35;
    let currentY = recipientYStart;
    doc.text(invoice.buyerName, 20, currentY);
    currentY += 5;
    const recipientLines = invoice.buyerAddress.replace(/\\n/g, '\n').split('\n');
    recipientLines.forEach((line) => {
        if (line.trim() !== '') {
            doc.text(line.trim(), 20, currentY);
            currentY += 5;
        }
    });


    const infoBlockY = headerY > 60 ? headerY : 60;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const title = 'Rechnung';
    // Positioniere "Rechnung" exakt an der rechten Kante der Werte (infoXEnd)
    // So schließt es mit Rechnungs-Nr., Rechnungsdatum und Leistungsdatum ab
    // sowie konsistent mit rechten Spaltenüberschriften wie "Gesamt (Netto)".
    // infoXEnd ist unten als 200 definiert.
    doc.text(title, 200, infoBlockY - 10, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let infoX = 120;
    let infoXEnd = 200;

    doc.text(`Rechnungs-Nr.:`, infoX, infoBlockY);
    doc.text(`${invoice.invoiceNumber}`, infoXEnd, infoBlockY, {align: 'right'});
    
    doc.text(`Rechnungsdatum:`, infoX, infoBlockY + 5);
    doc.text(`${invoice.orderDate}`, infoXEnd, infoBlockY + 5, {align: 'right'});
    
    doc.text(`Leistungsdatum:`, infoX, infoBlockY + 10);
    doc.text(`${invoice.serviceDate}`, infoXEnd, infoBlockY + 10, {align: 'right'});


    const tableColumn = ["Pos.", "Bezeichnung", "Menge", "USt.", "Einzelpreis (Netto)", "Gesamt (Netto)"];
    const tableRows: any[][] = [];

    invoice.items.forEach((item, index) => {
        const singlePrice = item.quantity !== 0 ? item.netAmount / item.quantity : 0;
        const itemData = [
            index + 1,
            item.name,
            item.quantity,
            `${item.vatRate.toFixed(0)} %`,
            `${singlePrice.toFixed(2).replace('.', ',')} €`,
            `${item.netAmount.toFixed(2).replace('.', ',')} €`,
        ];
        tableRows.push(itemData);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: infoBlockY + 20,
        theme: 'striped',
        headStyles: { fillColor: [30, 30, 30] }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    const summaryX = 125;
    let summaryY = finalY + 10;
    const valueX = 195;

    doc.setFontSize(10);
    doc.text('Zwischensumme (Netto):', summaryX, summaryY);
    doc.text(`${invoice.netTotal.toFixed(2).replace('.', ',')} €`, valueX, summaryY, { align: 'right' });

    summaryY += 7;
    doc.text(`zzgl. USt:`, summaryX, summaryY);
    doc.text(`${invoice.vatTotal.toFixed(2).replace('.', ',')} €`, valueX, summaryY, { align: 'right' });

    summaryY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Gesamtbetrag:', summaryX, summaryY);
    doc.text(`${invoice.grossTotal.toFixed(2).replace('.', ',')} €`, valueX, summaryY, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    let infoY = finalY + 15;
    const taxNoteLines = doc.splitTextToSize(invoice.taxNote, 100);
    doc.text(taxNoteLines, 20, infoY);
    infoY += (taxNoteLines.length * 4) + 5;
    
    doc.text("Zahlung dankend erhalten.", 20, infoY);
    infoY += 10;

    doc.setFontSize(8);
    doc.setTextColor(100);
    const etsyNoteLines = doc.splitTextToSize(ETSY_PLATFORM_INFO, 100);
    doc.text(etsyNoteLines, 20, infoY);


    doc.setFontSize(8);
    doc.setTextColor(0);
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const taxInfo = [];
    if(taxNumber) taxInfo.push(`St.-Nr.: ${taxNumber}`);
    if(vatId) taxInfo.push(`USt-IdNr.: ${vatId}`);
    
    const footerLine = [senderName, senderAddress, senderCity].join(' | ');
    doc.text(footerLine, 20, pageHeight - 15);
    doc.text(taxInfo.join(' | '), 20, pageHeight - 10);
    
    const fileName = `Rechnung-${invoice.invoiceNumber}.pdf`;

    if (outputType === 'save') {
        doc.save(fileName);
        return Promise.resolve(null);
    } else {
        return Promise.resolve(doc.output('blob'));
    }
}
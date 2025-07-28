
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
}

export function generatePdf(invoice: Invoice, userInfo: UserInfo) {
  const doc = new jsPDF();

  const { name: senderName, address: senderAddress, city: senderCity, taxInfo: senderTaxInfo } = userInfo;

  doc.setFontSize(8);
  doc.text(`${senderName} • ${senderAddress} • ${senderCity}`, 20, 20);
  
  doc.setFontSize(10);
  doc.text(senderName, 20, 35);
  doc.text(senderAddress, 20, 40);
  doc.text(senderCity, 20, 45);

  // Dynamischer Rechnungsempfänger
  const recipientYStart = 35;
  let currentY = recipientYStart;
  const recipientLines = invoice.buyerAddress.split('\n');
  
  doc.text(invoice.buyerName, 120, currentY);
  currentY += 5;

  recipientLines.forEach((line) => {
      doc.text(line, 120, currentY);
      currentY += 5;
  });

  const headerY = 70;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rechnung`, 20, headerY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Rechnungsnummer: ${invoice.invoiceNumber}`, 120, headerY);
  doc.text(`Bestelldatum: ${invoice.orderDate}`, 120, headerY + 5);

  const tableColumn = ["Pos.", "Bezeichnung", "Menge", "USt.", "Einzelpreis (Netto)", "Gesamt (Netto)"];
  const tableRows: any[][] = [];

  invoice.items.forEach((item, index) => {
    const itemData = [
      index + 1,
      item.name,
      item.quantity,
      `${item.vatRate.toFixed(0)} %`,
      `${(item.netAmount / item.quantity).toFixed(2)} €`,
      `${item.netAmount.toFixed(2)} €`,
    ];
    tableRows.push(itemData);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: headerY + 15,
    theme: 'striped',
    headStyles: { fillColor: [30, 30, 30] }
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  
  const summaryX = 140;
  let summaryY = finalY + 10;
  
  doc.setFontSize(10);
  doc.text('Zwischensumme (Netto):', summaryX, summaryY);
  doc.text(`${invoice.netTotal.toFixed(2)} €`, 190, summaryY, { align: 'right' });
  
  summaryY += 7;
  doc.text(`zzgl. USt:`, summaryX, summaryY);
  doc.text(`${invoice.vatTotal.toFixed(2)} €`, 190, summaryY, { align: 'right' });

  summaryY += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Gesamtbetrag:', summaryX, summaryY);
  doc.text(`${invoice.grossTotal.toFixed(2)} €`, 190, summaryY, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  // Position for tax notes and other info
  let infoY = finalY + 15;
  const taxNoteLines = doc.splitTextToSize(invoice.taxNote, 100);
  doc.text(taxNoteLines, 20, infoY);
  infoY += (taxNoteLines.length * 5) + 5;

  doc.text("Zahlung dankend erhalten.", 20, infoY);
  
  doc.setFontSize(8);
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  doc.text(`${senderName}, ${senderAddress}, ${senderCity} | ${senderTaxInfo}`, 20, pageHeight - 10);


  doc.save(`Rechnung-${invoice.invoiceNumber}.pdf`);
}

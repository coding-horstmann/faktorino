
'use server';
/**
 * @fileOverview A flow for extracting fees from an Etsy statement PDF.
 *
 * - extractFees - A function that handles the fee extraction process.
 * - FeeExtractionInput - The input type for the extractFees function.
 * - FeeExtractionOutput - The return type for the extractFees function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FeeExtractionInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "An Etsy statement PDF, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
});
export type FeeExtractionInput = z.infer<typeof FeeExtractionInputSchema>;

const FeeItemSchema = z.object({
  description: z.string().describe('Die Beschreibung der Gebühr (z.B. "Transaktionsgebühren", "Listing-Gebühren").'),
  amount: z.number().describe('Der Betrag der Gebühr in EUR. Dies ist immer ein negativer Wert oder 0.'),
});

const FeeSummarySchema = z.object({
  sales: z.number().describe('Die Summe aller Umsätze (Gesamtsumme aus "Umsatz"). Dies ist ein positiver Wert.'),
  feesAndTaxes: z.number().describe('Die Summe aller Gebühren und Steuern (Gesamtsumme aus "Gebühren & Steuern"). Dies ist ein negativer Wert.'),
  netAmount: z.number().describe('Der Nettobetrag (Umsätze + Gebühren).'),
});

const FeeExtractionOutputSchema = z.object({
  fees: z.array(FeeItemSchema).describe('Eine Liste aller einzelnen Gebührenpositionen, die unter "Gebühren & Steuern" aufgeführt sind.'),
  summary: FeeSummarySchema.describe('Eine Zusammenfassung der Finanzdaten, die aus den Hauptabschnitten der Abrechnung entnommen wurde.'),
});
export type FeeExtractionOutput = z.infer<typeof FeeExtractionOutputSchema>;

const prompt = ai.definePrompt({
  name: 'extractFeesPrompt',
  input: { schema: FeeExtractionInputSchema },
  output: { schema: FeeExtractionOutputSchema },
  prompt: `Du bist ein Experte für die Buchhaltung von Etsy-Shops in Deutschland. Deine Aufgabe ist es, die Gebühren aus einer monatlichen Etsy-Abrechnungs-PDF zu extrahieren. Analysiere die bereitgestellte PDF-Datei und extrahiere die angeforderten Informationen im JSON-Format.

WICHTIG:
- Alle Beträge müssen als Zahlen (Numbers) ohne Währungssymbol zurückgegeben werden.
- Verwende einen Punkt als Dezimaltrennzeichen (z.B. 12.34).
- Gebühren und Steuern sind immer negative Werte. Umsätze sind immer positive Werte.
- Die PDF ist auf Deutsch. Achte auf die korrekte Interpretation von Begriffen wie "Umsatz", "Gebühren & Steuern", "Nettobetrag".
- Extrahiere jede einzelne Gebührenposition aus der detaillierten Auflistung unter "Gebühren & Steuern".

PDF-Inhalt: {{media url=pdfDataUri}}`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
    ],
  },
});

const extractFeesFlow = ai.defineFlow(
  {
    name: 'extractFeesFlow',
    inputSchema: FeeExtractionInputSchema,
    outputSchema: FeeExtractionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI failed to return structured data.");
    }
    return output;
  }
);

export async function extractFees(input: FeeExtractionInput): Promise<FeeExtractionOutput> {
  return extractFeesFlow(input);
}

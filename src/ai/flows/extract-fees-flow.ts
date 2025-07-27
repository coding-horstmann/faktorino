
'use server';
/**
 * @fileOverview A flow for extracting fee information from an Etsy statement PDF.
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
      "A PDF file of an Etsy statement, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
});
export type FeeExtractionInput = z.infer<typeof FeeExtractionInputSchema>;

const FeeExtractionOutputSchema = z.object({
  summary: z.object({
    sales: z.number().describe('The total amount of sales (Umsatz). Should be a positive number.'),
    feesAndTaxes: z.number().describe('The total amount of fees and taxes (Gebühren & Steuern). Should be a negative number.'),
    netAmount: z.number().describe('The net amount (Nettobetrag).'),
  }),
});
export type FeeExtractionOutput = z.infer<typeof FeeExtractionOutputSchema>;

export async function extractFees(input: FeeExtractionInput): Promise<FeeExtractionOutput> {
  return extractFeesFlow(input);
}

const extractFeesPrompt = ai.definePrompt({
  name: 'extractFeesPrompt',
  input: { schema: FeeExtractionInputSchema },
  output: { schema: FeeExtractionOutputSchema },
  prompt: `You are an expert accountant specializing in parsing German Etsy statements.
Analyze the provided Etsy statement PDF and extract the following summary values from the "Zahlungskonto" section.

- Umsatz (Sales): Find the total sales amount. It is usually a positive value.
- Gebühren & Steuern (Fees & Taxes): Find the total fees and taxes. This is usually a negative value.
- Nettobetrag (Net Amount): Find the final net amount.

Return the extracted values in the specified JSON format. Ensure that "Gebühren & Steuern" is a negative number.

Document: {{media url=pdfDataUri}}`,
  config: {
    model: 'googleai/gemini-1.5-pro-latest',
  }
});

const extractFeesFlow = ai.defineFlow(
  {
    name: 'extractFeesFlow',
    inputSchema: FeeExtractionInputSchema,
    outputSchema: FeeExtractionOutputSchema,
  },
  async (input) => {
    const { output } = await extractFeesPrompt(input);
    if (!output) {
      throw new Error("The AI service did not return a valid structured response.");
    }
    return output;
  }
);

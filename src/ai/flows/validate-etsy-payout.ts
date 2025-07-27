//ValidateEtsyPayout Flow
'use server';
/**
 * @fileOverview Implements a Genkit flow to validate Etsy payouts by comparing expected payouts (calculated from invoices and fees) with actual payouts,
 *               identifying discrepancies due to refunds, chargebacks, or other inconsistencies.
 *
 * - validateEtsyPayout - Validates Etsy payouts by comparing expected payouts (calculated from invoices and fees) with actual payouts.
 * - ValidateEtsyPayoutInput - The input type for the validateEtsyPayout function.
 * - ValidateEtsyPayoutOutput - The return type for the validateEtsyPayout function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateEtsyPayoutInputSchema = z.object({
  totalInvoiceGrossAmount: z.number().describe('The total gross amount from all invoices (including VAT).'),
  totalEtsyFees: z.number().describe('The total amount of Etsy fees.'),
  actualPayout: z.number().describe('The actual payout amount received from Etsy.'),
});
export type ValidateEtsyPayoutInput = z.infer<typeof ValidateEtsyPayoutInputSchema>;

const ValidateEtsyPayoutOutputSchema = z.object({
  expectedPayout: z.number().describe('The calculated expected payout amount.'),
  difference: z.number().describe('The difference between the expected payout and the actual payout.'),
  isDiscrepancyPresent: z.boolean().describe('Indicates whether there is a discrepancy between the expected and actual payouts.'),
  discrepancyExplanation: z.string().describe('An explanation of potential reasons for the discrepancy, such as refunds or chargebacks.'),
});
export type ValidateEtsyPayoutOutput = z.infer<typeof ValidateEtsyPayoutOutputSchema>;

export async function validateEtsyPayout(input: ValidateEtsyPayoutInput): Promise<ValidateEtsyPayoutOutput> {
  return validateEtsyPayoutFlow(input);
}

const validateEtsyPayoutPrompt = ai.definePrompt({
  name: 'validateEtsyPayoutPrompt',
  input: {schema: ValidateEtsyPayoutInputSchema},
  output: {schema: ValidateEtsyPayoutOutputSchema},
  prompt: `You are a financial analyst specializing in Etsy payouts. 
  Given the total gross invoice amount (including VAT), the total Etsy fees, and the actual payout amount received, calculate the expected payout and determine if there is any discrepancy.

  Total Invoice Gross Amount: {{totalInvoiceGrossAmount}}
  Total Etsy Fees: {{totalEtsyFees}}
  Actual Payout: {{actualPayout}}

  Calculate the expected payout by subtracting the total Etsy fees from the total invoice gross amount.
  Determine the difference between the expected payout and the actual payout.  If the difference is significant, it may indicate refunds, chargebacks, or other inconsistencies.
  
  Provide an explanation of potential reasons for any discrepancy found.
  
  Return the expected payout, the difference, a boolean indicating whether a discrepancy is present, and the discrepancy explanation.
`,
});

const validateEtsyPayoutFlow = ai.defineFlow(
  {
    name: 'validateEtsyPayoutFlow',
    inputSchema: ValidateEtsyPayoutInputSchema,
    outputSchema: ValidateEtsyPayoutOutputSchema,
  },
  async input => {
    const expectedPayout = input.totalInvoiceGrossAmount - input.totalEtsyFees;
    const difference = expectedPayout - input.actualPayout;
    const isDiscrepancyPresent = Math.abs(difference) > 0.01; // Consider a small tolerance for rounding errors

    let discrepancyExplanation = '';
    if (isDiscrepancyPresent) {
      discrepancyExplanation = 'A discrepancy was detected between the expected and actual payouts. This could be due to refunds, chargebacks, or other transaction adjustments. Please review your Etsy transaction history for details.';
    } else {
      discrepancyExplanation = 'No significant discrepancy was detected between the expected and actual payouts.';
    }

    return {
      expectedPayout: expectedPayout,
      difference: difference,
      isDiscrepancyPresent: isDiscrepancyPresent,
      discrepancyExplanation: discrepancyExplanation,
    };
  }
);

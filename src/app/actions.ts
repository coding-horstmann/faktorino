
'use server';

import { z } from 'zod';

const formSchema = z.object({
  totalInvoiceGrossAmount: z.number(),
  totalEtsyFees: z.number(),
  actualPayout: z.number(),
});

// Corresponds to ValidateEtsyPayoutInput
const ValidateEtsyPayoutInputSchema = z.object({
  totalInvoiceGrossAmount: z.number().describe('The total gross amount from all invoices (including VAT).'),
  totalEtsyFees: z.number().describe('The total amount of Etsy fees.'),
  actualPayout: z.number().describe('The actual payout amount received from Etsy.'),
});
export type ValidateEtsyPayoutInput = z.infer<typeof ValidateEtsyPayoutInputSchema>;

// Corresponds to ValidateEtsyPayoutOutput
const ValidateEtsyPayoutOutputSchema = z.object({
  expectedPayout: z.number().describe('The calculated expected payout amount.'),
  difference: z.number().describe('The difference between the expected payout and the actual payout.'),
  isDiscrepancyPresent: z.boolean().describe('Indicates whether there is a discrepancy between the expected and actual payouts.'),
  discrepancyExplanation: z.string().describe('An explanation of potential reasons for the discrepancy, such as refunds or chargebacks.'),
});
export type ValidateEtsyPayoutOutput = z.infer<typeof ValidateEtsyPayoutOutputSchema>;


async function validateEtsyPayout(input: ValidateEtsyPayoutInput): Promise<ValidateEtsyPayoutOutput> {
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


export async function validatePayoutAction(input: ValidateEtsyPayoutInput): Promise<{ data: ValidateEtsyPayoutOutput | null; error: string | null; }> {
  const parsedInput = formSchema.safeParse(input);
  if (!parsedInput.success) {
    return { data: null, error: "Ungültige Eingabedaten." };
  }

  try {
    const result = await validateEtsyPayout(parsedInput.data);
    return { data: result, error: null };
  } catch (error) {
    console.error("Error in validateEtsyPayout:", error);
    return { data: null, error: "Fehler bei der Validierung. Bitte versuchen Sie es später erneut." };
  }
}

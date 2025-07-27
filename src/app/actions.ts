
'use server';

import { validateEtsyPayout, type ValidateEtsyPayoutInput, type ValidateEtsyPayoutOutput } from '@/ai/flows/validate-etsy-payout';
import { z } from 'zod';

const formSchema = z.object({
  totalInvoiceGrossAmount: z.number(),
  totalEtsyFees: z.number(),
  actualPayout: z.number(),
});

export async function validatePayoutAction(input: ValidateEtsyPayoutInput): Promise<{ data: ValidateEtsyPayoutOutput | null; error: string | null; }> {
  const parsedInput = formSchema.safeParse(input);
  if (!parsedInput.success) {
    return { data: null, error: "Ungültige Eingabedaten." };
  }

  try {
    const result = await validateEtsyPayout(parsedInput.data);
    return { data: result, error: null };
  } catch (error) {
    console.error("Error in validateEtsyPayout flow:", error);
    return { data: null, error: "Fehler bei der Validierung durch die AI. Bitte versuchen Sie es später erneut." };
  }
}

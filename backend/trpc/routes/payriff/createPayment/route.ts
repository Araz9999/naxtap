import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { payriffService } from '../../../../services/payriff';

export const createPaymentProcedure = publicProcedure
  .input(
    z.object({
      amount: z.number().positive().describe('Amount in AZN'),
      orderId: z.string().min(1).describe('Unique order ID'),
      description: z.string().min(1).describe('Payment description'),
      language: z.enum(['az', 'en', 'ru']).optional().default('az'),
      customerEmail: z.string().email().optional(),
      customerPhone: z.string().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    // Avoid logging full input to prevent leaking PII

    const result = await payriffService.createPayment({
      amount: input.amount,
      orderId: input.orderId,
      description: input.description,
      language: input.language,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to create payment');
    }

    return {
      success: true,
      paymentUrl: result.paymentUrl,
      transactionId: result.transactionId,
    };
  });

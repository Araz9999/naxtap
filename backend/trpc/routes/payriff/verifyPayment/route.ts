import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { payriffService } from '../../../../services/payriff';

import { logger } from '../../../../utils/logger';
export const verifyPaymentProcedure = publicProcedure
  .input(
    z.object({
      orderId: z.string().min(1).describe('Order ID to verify'),
      transactionId: z.string().min(1).describe('Transaction ID from Payriff'),
    }),
  )
  .query(async ({ input }) => {
    logger.debug('Verifying Payriff payment:', input);

    const status = await payriffService.getTransactionStatus(input.transactionId);

    if (!status) {
      return {
        verified: false,
        status: 'not_found',
        message: 'Transaction not found',
      };
    }

    if (status.orderId !== input.orderId) {
      return {
        verified: false,
        status: 'mismatch',
        message: 'Order ID mismatch',
      };
    }

    return {
      verified: status.status === 'approved',
      status: status.status,
      amount: status.amount / 100,
      currency: status.currency,
      transactionId: status.transactionId,
      orderId: status.orderId,
      approvedAt: status.approvedAt,
    };
  });

import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import config from '../../../../config';
import { PayriffResponse, isPayriffSuccess, getPayriffErrorMessage } from '../../../../constants/payriffCodes';

import { logger } from '../../../../utils/logger';
export const refundProcedure = publicProcedure
  .input(
    z.object({
      amount: z.number().positive(),
      orderId: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const secretKey = config.PAYRIFF_SECRET_KEY;
    const baseUrl = config.PAYRIFF_BASE_URL || 'https://api.payriff.com';

    if (!secretKey) {
      throw new Error('Payriff credentials not configured');
    }

    const requestBody = {
      amount: input.amount,
      orderId: input.orderId,
    };

    // Avoid logging sensitive request bodies

    // BUG FIX: Add network error handling
    let response;
    try {
      response = await fetch(`${baseUrl}/api/v3/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': secretKey,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000),
      });
    } catch (error) {
      logger.error('Network error during refund:', error);
      throw new Error('Network error: Unable to connect to payment service');
    }

    const data: PayriffResponse = await response.json();

    if (!response.ok || !isPayriffSuccess(data)) {
      const errorMessage = getPayriffErrorMessage(data);
      logger.error('Refund error:', errorMessage);
      throw new Error(errorMessage);
    }

    return data;
  });

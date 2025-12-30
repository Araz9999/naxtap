import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import config from '../../../../config';
import { PayriffResponse, isPayriffSuccess, getPayriffErrorMessage } from '../../../../constants/payriffCodes';

import { logger } from '../../../../utils/logger';
export const transferProcedure = publicProcedure
  .input(
    z.object({
      toMerchant: z.string().min(1),
      amount: z.number().positive(),
      description: z.string().min(1),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const merchantId = config.PAYRIFF_MERCHANT_ID;
    const secretKey = config.PAYRIFF_SECRET_KEY;
    const baseUrl = config.PAYRIFF_BASE_URL || 'https://api.payriff.com';

    if (!merchantId || !secretKey) {
      throw new Error('Payriff credentials not configured');
    }

    // BUG FIX: Add amount bounds validation
    if (input.amount > 10000) {
      throw new Error('Maximum transfer amount is 10,000 AZN');
    }
    if (input.amount < 0.01) {
      throw new Error('Minimum transfer amount is 0.01 AZN');
    }

    const requestBody = {
      merchant: merchantId,
      body: {
        toMerchant: input.toMerchant,
        amount: input.amount,
        description: input.description,
      },
    };

    // Avoid logging sensitive headers/body

    // BUG FIX: Add network error handling
    let response;
    try {
      response = await fetch(`${baseUrl}/api/v2/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': secretKey,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000),
      });
    } catch (error) {
      logger.error('Network error during transfer:', error);
      throw new Error('Network error: Unable to connect to payment service');
    }

    const data: PayriffResponse = await response.json();
    logger.debug('Transfer response:', JSON.stringify(data, null, 2));

    if (!response.ok || !isPayriffSuccess(data)) {
      const errorMessage = getPayriffErrorMessage(data);
      logger.error('Transfer error:', errorMessage);
      throw new Error(errorMessage);
    }

    return data;
  });

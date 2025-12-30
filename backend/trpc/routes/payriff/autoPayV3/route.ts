import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import config from '../../../../config';
import { PayriffResponse, isPayriffSuccess, getPayriffErrorMessage } from '../../../../constants/payriffCodes';

import { logger } from '../../../../utils/logger';
export const autoPayV3Procedure = publicProcedure
  .input(
    z.object({
      cardUuid: z.string(),
      amount: z.number().positive(),
      currency: z.enum(['AZN', 'USD', 'EUR']),
      description: z.string(),
      callbackUrl: z.string().optional(),
      operation: z.enum(['PURCHASE', 'PRE_AUTH']).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const secretKey = config.PAYRIFF_SECRET_KEY;
    const baseUrl = config.PAYRIFF_BASE_URL || 'https://api.payriff.com';
    const frontendUrl = config.FRONTEND_URL || 'https://1r36dhx42va8pxqbqz5ja.rork.app';

    if (!secretKey) {
      throw new Error('Payriff credentials not configured');
    }

    const requestBody = {
      cardUuid: input.cardUuid,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      callbackUrl: input.callbackUrl || `${frontendUrl}/payment/success`,
      operation: input.operation || 'PURCHASE',
    };

    // Avoid logging sensitive headers/body

    const response = await fetch(`${baseUrl}/api/v3/autoPay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': secretKey,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json() as PayriffResponse;

    if (!response.ok || !isPayriffSuccess(data)) {
      const errorMessage = getPayriffErrorMessage(data);
      logger.error('AutoPay V3 error:', errorMessage);
      throw new Error(errorMessage);
    }

    return data;
  });

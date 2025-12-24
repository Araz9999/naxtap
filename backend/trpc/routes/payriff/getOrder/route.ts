import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import config from '../../../../config';
import { PayriffResponse, isPayriffSuccess, getPayriffErrorMessage } from '../../../../constants/payriffCodes';

import { logger } from '../../../../utils/logger';
export const getOrderProcedure = publicProcedure
  .input(
    z.object({
      orderId: z.string(),
    })
  )
  .query(async ({ ctx, input }) => {
    const secretKey = config.PAYRIFF_SECRET_KEY;
    const baseUrl = config.PAYRIFF_BASE_URL || 'https://api.payriff.com';

    if (!secretKey) {
      throw new Error('Payriff credentials not configured');
    }

    logger.debug('Get order request:', input.orderId);

    const response = await fetch(`${baseUrl}/api/v3/orders/${input.orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': secretKey,
      },
    });

    const data = await response.json() as PayriffResponse;
    logger.debug('Get order response:', JSON.stringify(data, null, 2));

    if (!response.ok || !isPayriffSuccess(data)) {
      const errorMessage = getPayriffErrorMessage(data);
      logger.error('Get order error:', errorMessage);
      throw new Error(errorMessage);
    }

    // Mask PAN fields if present
    if (data?.payload?.transactions) {
      data.payload.transactions = data.payload.transactions.map((t: Record<string, unknown>) => ({
        ...t,
        pan: t.pan && typeof t.pan === 'string' && t.pan.length >= 4 ? `**** **** **** ${t.pan.slice(-4)}` : t.pan,
      }));
    }
    return data;
  });

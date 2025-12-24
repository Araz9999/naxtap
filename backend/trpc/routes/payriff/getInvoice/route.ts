import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import config from '../../../../config';
import { PayriffResponse, isPayriffSuccess, getPayriffErrorMessage } from '../../../../constants/payriffCodes';

import { logger } from '../../../../utils/logger';
export const getInvoiceProcedure = publicProcedure
  .input(
    z.object({
      uuid: z.string(),
    })
  )
  .query(async ({ ctx, input }) => {
    const merchantId = config.PAYRIFF_MERCHANT_ID;
    const secretKey = config.PAYRIFF_SECRET_KEY;
    const baseUrl = config.PAYRIFF_BASE_URL || 'https://api.payriff.com';

    if (!merchantId || !secretKey) {
      throw new Error('Payriff credentials not configured');
    }

    const requestBody = {
      merchant: merchantId,
      body: {
        uuid: input.uuid,
      },
    };

    logger.debug('Get invoice request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${baseUrl}/api/v2/get-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': secretKey,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json() as PayriffResponse;
    logger.debug('Get invoice response:', JSON.stringify(data, null, 2));

    if (!response.ok || !isPayriffSuccess(data)) {
      const errorMessage = getPayriffErrorMessage(data);
      logger.error('Get invoice error:', errorMessage);
      throw new Error(errorMessage);
    }

    return data;
  });

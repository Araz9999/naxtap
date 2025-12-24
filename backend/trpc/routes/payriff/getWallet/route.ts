import { publicProcedure } from "../../../create-context";
import config from '../../../../config';
import { PayriffResponse, isPayriffSuccess, getPayriffErrorMessage } from '../../../../constants/payriffCodes';

import { logger } from '../../../../utils/logger';
export const getWalletProcedure = publicProcedure.query(async () => {
  try {
    const merchantId = config.PAYRIFF_MERCHANT_ID;
    const secretKey = config.PAYRIFF_SECRET_KEY;
    const baseUrl = config.PAYRIFF_BASE_URL || 'https://api.payriff.com';

    // BUG FIX: Validate secretKey before using
    if (!secretKey) {
      throw new Error('Payriff credentials not configured');
    }

    // Avoid verbose logs in production

    // BUG FIX: Add network error handling with timeout
    let response;
    try {
      response = await fetch(`${baseUrl}/api/v2/wallet`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': secretKey,
        },
        signal: AbortSignal.timeout(30000),
      });
    } catch (error) {
      logger.error('Network error fetching wallet:', error);
      throw new Error('Network error: Unable to connect to payment service');
    }

    const data: PayriffResponse = await response.json();

    if (!response.ok || !isPayriffSuccess(data)) {
      const errorMessage = getPayriffErrorMessage(data);
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    logger.error('Payriff get wallet failed:', error);
    throw error;
  }
});

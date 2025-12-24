import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import config from '../../../../config';
import { PayriffResponse, isPayriffSuccess, getPayriffErrorMessage } from '../../../../constants/payriffCodes';

import { logger } from '../../../../utils/logger';
export const createInvoiceProcedure = publicProcedure
  .input(
    z.object({
      amount: z.number().positive(),
      currencyType: z.enum(['AZN', 'USD', 'EUR']).optional(),
      customMessage: z.string().optional(),
      description: z.string(),
      email: z.string().email().optional(),
      expireDate: z.string().optional(),
      fullName: z.string().optional(),
      installmentPeriod: z.number().optional(),
      installmentProductType: z.enum(['BIRKART']).optional(),
      languageType: z.enum(['AZ', 'EN', 'RU']).optional(),
      phoneNumber: z.string().optional(),
      sendSms: z.boolean().optional(),
      sendWhatsapp: z.boolean().optional(),
      sendEmail: z.boolean().optional(),
      amountDynamic: z.boolean().optional(),
      directPay: z.boolean().optional(),
      metadata: z.record(z.string(), z.string()).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const merchantId = config.PAYRIFF_MERCHANT_ID;
    const secretKey = config.PAYRIFF_SECRET_KEY;
    const baseUrl = config.PAYRIFF_BASE_URL || 'https://api.payriff.com';
    const frontendUrl = config.FRONTEND_URL || 'https://1r36dhx42va8pxqbqz5ja.rork.app';

    if (!merchantId || !secretKey) {
      throw new Error('Payriff credentials not configured');
    }

    const requestBody = {
      body: {
        amount: input.amount,
        approveURL: `${frontendUrl}/payment/success`,
        cancelURL: `${frontendUrl}/payment/cancel`,
        currencyType: input.currencyType || 'AZN',
        customMessage: input.customMessage,
        declineURL: `${frontendUrl}/payment/error`,
        description: input.description,
        email: input.email,
        expireDate: input.expireDate,
        fullName: input.fullName,
        installmentPeriod: input.installmentPeriod,
        installmentProductType: input.installmentProductType,
        languageType: input.languageType || 'AZ',
        phoneNumber: input.phoneNumber,
        sendSms: input.sendSms !== undefined ? input.sendSms : true,
        sendWhatsapp: input.sendWhatsapp,
        sendEmail: input.sendEmail,
        amountDynamic: input.amountDynamic,
        directPay: input.directPay,
        metadata: input.metadata,
      },
      merchant: merchantId,
    };

    // Avoid logging sensitive request bodies

    const response = await fetch(`${baseUrl}/api/v2/invoices`, {
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
      logger.error('Create invoice error:', errorMessage);
      throw new Error(errorMessage);
    }

    return data;
  });

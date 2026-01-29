import config from '@/constants/config';
import { Platform } from 'react-native';

import { logger } from '@/utils/logger';
export interface PayriffPaymentRequest {
  amount: number;
  currency: string;
  description: string;
  orderId: string;
  language?: 'az' | 'en' | 'ru';
  successUrl?: string;
  errorUrl?: string;
  cancelUrl?: string;
}

export interface PayriffPaymentResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  orderId?: string;
  error?: string;
}

export interface PayriffPaymentStatus {
  orderId: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  transactionId?: string;
  paymentDate?: string;
}

export interface PayriffCardSaveRequest {
  amount: number;
  approveURL?: string;
  cancelURL?: string;
  declineURL?: string;
  currencyType?: 'AZN' | 'USD' | 'EUR';
  description: string;
  directPay?: boolean;
  language?: 'AZ' | 'EN' | 'RU';
}

export interface PayriffCardSaveResponse {
  code: string;
  internalMessage: string;
  message: string;
  payload: {
    orderId: string;
    paymentUrl: string;
    sessionId: string;
  };
}

export interface PayriffCardSaveResult {
  code: string;
  internalMessage: string;
  message: string;
  payload: {
    orderID: string;
    sessionID: string;
    transactionType: string;
    purchaseAmount: string;
    currency: string;
    tranDateTime: string;
    responseCode: string;
    responseDescription: string;
    brand: string;
    orderStatus: string;
    approvalCode: string;
    acqFee: string;
    orderDescription: string;
    approvalCodeScr: string;
    purchaseAmountScr: string;
    currencyScr: string;
    orderStatusScr: string;
    cardRegistrationResponse: string;
    rrn: string;
    pan: string;
    cardHolderName: string;
    cardUID: string;
  };
}

export interface PayriffAutoPayRequest {
  amount: number;
  cardUuid: string;
  description: string;
  orderId: string;
  currencyType?: 'AZN' | 'USD' | 'EUR';
}

export interface PayriffInvoiceRequest {
  amount: number;
  approveURL?: string;
  cancelURL?: string;
  currencyType?: 'AZN' | 'USD' | 'EUR';
  customMessage?: string;
  declineURL?: string;
  description: string;
  email?: string;
  expireDate?: string;
  fullName?: string;
  installmentPeriod?: number;
  installmentProductType?: 'BIRKART';
  languageType?: 'AZ' | 'EN' | 'RU';
  phoneNumber?: string;
  sendSms?: boolean;
  sendWhatsapp?: boolean;
  sendEmail?: boolean;
  amountDynamic?: boolean;
  directPay?: boolean;
  metadata?: Record<string, string>;
}

export interface PayriffInvoiceResponse {
  code: string;
  message: string;
  route: string;
  internalMessage: string | null;
  payload: {
    id: number;
    merchantId: string;
    amount: number;
    payriffAmount: number | null;
    payriffFixedFeeAmount: number | null;
    payriffFee: number | null;
    totalAmount: number | null;
    fullName: string;
    email: string;
    phoneNumber: string;
    customMessage: string | null;
    expireDate: string;
    currencyType: string;
    languageType: string;
    paymentType: string;
    active: boolean;
    description: string;
    approveURL: string;
    cancelURL: string;
    declineURL: string;
    uuid: string;
    invoiceUuid: string;
    invoiceCode: string;
    invoiceStatus: string;
    createdDate: string;
    paymentUrl: string;
    sendSms: boolean;
  };
}

export interface PayriffTransferRequest {
  toMerchant: string;
  amount: number;
  description: string;
}

export interface PayriffTransferResponse {
  code: string;
  message: string;
  route: string;
  internalMessage: string | null;
  payload: string;
}

export interface PayriffTopupRequest {
  phoneNumber: string;
  amount: number;
  description: string;
}

export interface PayriffTopupResponse {
  code: string;
  message: string;
  route: string;
  internalMessage: string | null;
  payload: string;
}

export interface PayriffWalletHistory {
  description: any;
  createdAt: any;
  id: number;
  active: boolean;
  balance: number;
  amount: number;
  operation: string;
}

export interface PayriffWalletResponse {
  code: string;
  message: string;
  route: string;
  internalMessage: string | null;
  payload: {
    historyResponse: PayriffWalletHistory[];
    totalBalance: number;
  };
}

export interface PayriffWalletByIdResponse {
  id: number;
  active: boolean;
  balance: number;
  appId: number;
  userId: number;
  applicationStatus: string;
}

export interface PayriffCreateOrderRequest {
  amount: number;
  language?: 'EN' | 'AZ' | 'RU';
  currency?: 'AZN' | 'USD' | 'EUR';
  description: string;
  callbackUrl?: string;
  cardSave?: boolean;
  operation?: 'PURCHASE' | 'PRE_AUTH';
  metadata?: Record<string, string>;
}

export interface PayriffCreateOrderResponse {
  code: string;
  message: string;
  route: string;
  internalMessage: string | null;
  responseId: string;
  payload: {
    orderId: string;
    paymentUrl: string;
    transactionId: number;
  };
}

export interface PayriffOrderInfoResponse {
  code: string;
  message: string;
  route: string;
  internalMessage: string | null;
  responseId: string;
  payload: {
    orderId: string;
    amount: number;
    currencyType: string;
    merchantName: string;
    operationType: string;
    paymentStatus: string;
    auto: boolean;
    createdDate: string;
    description: string;
    transactions: {
      uuid: string;
      createdDate: string;
      status: string;
      channel: string;
      channelType: string;
      requestRrn: string;
      responseRrn: string;
      pan: string;
      paymentWay: string;
      cardDetails: {
        maskedPan: string;
        brand: string;
        cardHolderName: string;
      };
      merchantCategory: string;
      installment?: {
        type: string;
        period: string;
      };
    }[];
  };
}

class PayriffService {
  private merchantId: string;
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    this.merchantId = config.PAYRIFF_MERCHANT_ID as string;
    this.secretKey = config.PAYRIFF_SECRET_KEY as string;
    this.baseUrl = config.PAYRIFF_BASE_URL || 'https://api.payriff.com';
  }

  private async generateSignature(data: Record<string, unknown>): Promise<string> {
    // SECURITY: Client-side signature generation for Payriff API
    // NOTE: In React Native, crypto module is not available
    // Signature should be generated on backend for security

    // For production, this should be done on backend
    logger.warn('[PayriffService] Client-side signature generation - consider moving to backend');

    try {
      // Sort keys for consistent signature
      const sortedKeys = Object.keys(data).sort();
      const signatureString = sortedKeys
        .map(key => `${key}=${data[key]}`)
        .join('&');

      // In React Native/Browser, use Web Crypto API or send to backend
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        // Browser environment - use Web Crypto API
        const encoder = new TextEncoder();
        const keyData = encoder.encode(this.secretKey);
        const messageData = encoder.encode(signatureString);

        const cryptoKey = await window.crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign'],
        );

        const signature = await window.crypto.subtle.sign(
          'HMAC',
          cryptoKey,
          messageData,
        );

        // Convert to hex string
        return Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } else {
        // React Native or Node.js fallback
        // For React Native, signature MUST be generated on backend
        logger.error('[PayriffService] Crypto not available - signature generation failed');
        throw new Error('Signature generation not supported in this environment. Use backend.');
      }
    } catch (error) {
      logger.error('[PayriffService] Signature generation error:', error);
      throw new Error('Failed to generate signature');
    }
  }

  async createPayment(request: PayriffPaymentRequest): Promise<PayriffPaymentResponse> {
    try {
      // ===== VALIDATION START =====

      // 1. Amount validation
      if (!request.amount || typeof request.amount !== 'number') {
        throw new Error('Amount must be a valid number');
      }

      if (request.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (request.amount > 100000) {
        throw new Error('Amount exceeds maximum limit (100,000 AZN)');
      }

      if (isNaN(request.amount) || !isFinite(request.amount)) {
        throw new Error('Amount must be a finite number');
      }

      // 2. OrderId validation
      if (!request.orderId || typeof request.orderId !== 'string') {
        throw new Error('OrderId is required');
      }

      if (request.orderId.trim().length === 0) {
        throw new Error('OrderId cannot be empty');
      }

      if (request.orderId.length > 255) {
        throw new Error('OrderId is too long (max 255 characters)');
      }

      // 3. Description validation
      if (!request.description || typeof request.description !== 'string') {
        throw new Error('Description is required');
      }

      if (request.description.trim().length === 0) {
        throw new Error('Description cannot be empty');
      }

      if (request.description.length > 500) {
        throw new Error('Description is too long (max 500 characters)');
      }

      // 4. Currency validation
      const validCurrencies = ['AZN', 'USD', 'EUR'];
      const currency = request.currency || 'AZN';
      if (!validCurrencies.includes(currency)) {
        throw new Error(`Invalid currency. Must be one of: ${validCurrencies.join(', ')}`);
      }

      // 5. Language validation
      const validLanguages = ['az', 'en', 'ru'];
      const language = request.language || 'az';
      if (!validLanguages.includes(language)) {
        throw new Error(`Invalid language. Must be one of: ${validLanguages.join(', ')}`);
      }

      // ===== VALIDATION END =====

      const frontendUrl = config.FRONTEND_URL || 'https://1r36dhx42va8pxqbqz5ja.rork.app';

      const paymentData = {
        merchant: this.merchantId,
        amount: Math.round(request.amount * 100), // Convert to qepik
        currency: currency,
        description: request.description.trim(),
        order_id: request.orderId.trim(),
        language: language,
        success_url: request.successUrl || `${frontendUrl}/payment/success`,
        error_url: request.errorUrl || `${frontendUrl}/payment/error`,
        cancel_url: request.cancelUrl || `${frontendUrl}/payment/cancel`,
      };

      const signature = await this.generateSignature(paymentData);

      // ===== NETWORK REQUEST WITH RETRY =====

      const maxRetries = 3;
      const timeout = 30000; // 30 seconds
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.debug(`[PayriffService] Payment creation attempt ${attempt}/${maxRetries}`);

          // Create AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const response = await fetch(`${this.baseUrl}/api/v1/payment/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.secretKey}`,
            },
            body: JSON.stringify({
              ...paymentData,
              signature,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Check HTTP status
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));

            // Don't retry on client errors (4xx)
            if (response.status >= 400 && response.status < 500) {
              throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            // Retry on server errors (5xx)
            if (attempt === maxRetries) {
              throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            // Wait before retry (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            logger.debug(`[PayriffService] Retrying after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          // Parse response
          const data = await response.json();

          // Validate response data
          if (!data) {
            throw new Error('Empty response from payment gateway');
          }

          const paymentUrl = data.payment_url || data.paymentUrl;
          if (!paymentUrl) {
            throw new Error('Payment URL not received from gateway');
          }

          logger.info('[PayriffService] Payment created successfully:', {
            orderId: request.orderId,
            transactionId: data.transaction_id || data.transactionId,
          });

          return {
            success: true,
            paymentUrl: paymentUrl,
            transactionId: data.transaction_id || data.transactionId,
            orderId: request.orderId,
          };

        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');

          // Handle abort (timeout)
          if (error instanceof Error && error.name === 'AbortError') {
            logger.error(`[PayriffService] Request timeout on attempt ${attempt}`);
            lastError = new Error('Request timeout - please try again');

            if (attempt === maxRetries) {
              break;
            }

            // Retry on timeout
            const delay = 1000 * attempt;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          // Handle network errors
          if (error instanceof TypeError && error.message.includes('fetch')) {
            logger.error(`[PayriffService] Network error on attempt ${attempt}`);
            lastError = new Error('Network error - please check your connection');

            if (attempt === maxRetries) {
              break;
            }

            const delay = 1000 * attempt;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          // Don't retry on validation or auth errors
          if (lastError.message.includes('validation') ||
              lastError.message.includes('authentication') ||
              lastError.message.includes('Amount') ||
              lastError.message.includes('OrderId') ||
              lastError.message.includes('Description')) {
            break;
          }

          // Last attempt failed
          if (attempt === maxRetries) {
            break;
          }

          // Wait before retry
          const delay = 1000 * attempt;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // All retries failed
      logger.error('[PayriffService] Payment creation failed after all retries:', lastError);
      return {
        success: false,
        error: lastError?.message || 'Payment creation failed - please try again',
      };

    } catch (error) {
      logger.error('[PayriffService] Unexpected payment creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async cardSave(request: PayriffCardSaveRequest): Promise<PayriffCardSaveResponse> {
    try {
      const frontendUrl = config.FRONTEND_URL || 'https://1r36dhx42va8pxqbqz5ja.rork.app';

      const requestBody = {
        body: {
          amount: request.amount,
          approveURL: request.approveURL || `${frontendUrl}/payment/success`,
          cancelURL: request.cancelURL || `${frontendUrl}/payment/cancel`,
          declineURL: request.declineURL || `${frontendUrl}/payment/error`,
          currencyType: request.currencyType || 'AZN',
          description: request.description,
          directPay: request.directPay !== undefined ? request.directPay : true,
          language: request.language || 'AZ',
        },
        merchant: this.merchantId,
      };

      // Avoid logging sensitive request bodies

      const response = await fetch(`${this.baseUrl}/api/v2/cardSave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.secretKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Card save error:', errorData);
        throw new Error(errorData.message || 'Failed to save card');
      }

      const data = await response.json();
      logger.debug('Card save response:', JSON.stringify(data, null, 2));

      return data;
    } catch (error) {
      logger.error('Payriff card save failed:', error);
      throw error;
    }
  }

  async autoPay(request: PayriffAutoPayRequest): Promise<PayriffCardSaveResult> {
    try {
      const frontendUrl = config.FRONTEND_URL || 'https://1r36dhx42va8pxqbqz5ja.rork.app';

      const requestBody = {
        body: {
          amount: request.amount,
          approveURL: `${frontendUrl}/payment/success`,
          cancelURL: `${frontendUrl}/payment/cancel`,
          declineURL: `${frontendUrl}/payment/error`,
          cardUuid: request.cardUuid,
          description: request.description,
          orderId: request.orderId,
          sessionId: '',
        },
        merchant: this.merchantId,
      };

      // Avoid logging sensitive request bodies

      const response = await fetch(`${this.baseUrl}/api/v2/autoPay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.secretKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Auto pay error:', errorData);
        throw new Error(errorData.message || 'Failed to process auto payment');
      }

      const data = await response.json();
      logger.debug('Auto pay response:', JSON.stringify(data, null, 2));

      return data;
    } catch (error) {
      logger.error('Payriff auto pay failed:', error);
      throw error;
    }
  }

  async createInvoice(request: PayriffInvoiceRequest): Promise<PayriffInvoiceResponse> {
    try {
      const frontendUrl = config.FRONTEND_URL || 'https://1r36dhx42va8pxqbqz5ja.rork.app';

      const requestBody = {
        body: {
          amount: request.amount,
          approveURL: request.approveURL || `${frontendUrl}/payment/success`,
          cancelURL: request.cancelURL || `${frontendUrl}/payment/cancel`,
          currencyType: request.currencyType || 'AZN',
          customMessage: request.customMessage,
          declineURL: request.declineURL || `${frontendUrl}/payment/error`,
          description: request.description,
          email: request.email,
          expireDate: request.expireDate,
          fullName: request.fullName,
          installmentPeriod: request.installmentPeriod,
          installmentProductType: request.installmentProductType,
          languageType: request.languageType || 'AZ',
          phoneNumber: request.phoneNumber,
          sendSms: request.sendSms !== undefined ? request.sendSms : true,
          sendWhatsapp: request.sendWhatsapp,
          sendEmail: request.sendEmail,
          amountDynamic: request.amountDynamic,
          directPay: request.directPay,
          metadata: request.metadata,
        },
        merchant: this.merchantId,
      };

      // Avoid logging sensitive request bodies

      const response = await fetch(`${this.baseUrl}/api/v2/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.secretKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Create invoice error:', errorData);
        throw new Error(errorData.message || 'Failed to create invoice');
      }

      const data = await response.json();
      logger.debug('Create invoice response:', JSON.stringify(data, null, 2));

      return data;
    } catch (error) {
      logger.error('Payriff create invoice failed:', error);
      throw error;
    }
  }

  async transfer(request: PayriffTransferRequest): Promise<PayriffTransferResponse> {
    try {
      const requestBody = {
        merchant: this.merchantId,
        body: {
          toMerchant: request.toMerchant,
          amount: request.amount,
          description: request.description,
        },
      };

      // Avoid logging sensitive request bodies

      const response = await fetch(`${this.baseUrl}/api/v2/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.secretKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Transfer error:', errorData);
        throw new Error(errorData.message || 'Failed to transfer money');
      }

      const data = await response.json();
      logger.debug('Transfer response:', JSON.stringify(data, null, 2));

      return data;
    } catch (error) {
      logger.error('Payriff transfer failed:', error);
      throw error;
    }
  }

  async topup(request: PayriffTopupRequest): Promise<PayriffTopupResponse> {
    try {
      const requestBody = {
        merchant: this.merchantId,
        body: {
          phoneNumber: request.phoneNumber,
          amount: request.amount,
          description: request.description,
        },
      };

      // Avoid logging sensitive request bodies

      const response = await fetch(`${this.baseUrl}/api/v2/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.secretKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Topup error:', errorData);
        throw new Error(errorData.message || 'Failed to topup MPAY wallet');
      }

      const data = await response.json();
      logger.debug('Topup response:', JSON.stringify(data, null, 2));

      return data;
    } catch (error) {
      logger.error('Payriff topup failed:', error);
      throw error;
    }
  }

  async getWallet(): Promise<PayriffWalletResponse> {
    try {
      logger.debug('Fetching wallet data...');

      const response = await fetch(`${this.baseUrl}/api/v2/wallet`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.secretKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Get wallet error:', errorData);
        throw new Error(errorData.message || 'Failed to get wallet data');
      }

      const data = await response.json();
      logger.debug('Get wallet response:', JSON.stringify(data, null, 2));

      return data;
    } catch (error) {
      logger.error('Payriff get wallet failed:', error);
      throw error;
    }
  }

  async getWalletById(id: number): Promise<PayriffWalletByIdResponse> {
    try {
      logger.debug('Fetching wallet by ID:', id);

      const response = await fetch(`${this.baseUrl}/api/v2/wallet/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.secretKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Get wallet by ID error:', errorData);
        throw new Error(errorData.message || 'Failed to get wallet by ID');
      }

      const data = await response.json();
      logger.debug('Get wallet by ID response:', JSON.stringify(data, null, 2));

      return data;
    } catch (error) {
      logger.error('Payriff get wallet by ID failed:', error);
      throw error;
    }
  }

  async createOrder(request: PayriffCreateOrderRequest): Promise<PayriffCreateOrderResponse> {
    try {
      const frontendUrl = config.FRONTEND_URL || 'https://1r36dhx42va8pxqbqz5ja.rork.app';

      const requestBody = {
        amount: request.amount,
        language: request.language || 'EN',
        currency: request.currency || 'AZN',
        description: request.description,
        callbackUrl: request.callbackUrl || `${frontendUrl}/payment/success`,
        cardSave: request.cardSave || false,
        operation: request.operation || 'PURCHASE',
        metadata: request.metadata,
      };

      logger.debug('Create order request:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.baseUrl}/api/v3/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.secretKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Create order error:', errorData);
        throw new Error(errorData.message || 'Failed to create order');
      }

      const data = await response.json();
      logger.debug('Create order response:', JSON.stringify(data, null, 2));

      return data;
    } catch (error) {
      logger.error('Payriff create order failed:', error);
      throw error;
    }
  }

  async getOrderInfo(orderId: string): Promise<PayriffOrderInfoResponse> {
    try {
      logger.debug('Fetching order info:', orderId);

      const response = await fetch(`${this.baseUrl}/api/v3/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.secretKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Get order info error:', errorData);
        throw new Error(errorData.message || 'Failed to get order information');
      }

      const data = await response.json();
      logger.debug('Get order info response:', JSON.stringify(data, null, 2));

      return data;
    } catch (error) {
      logger.error('Payriff get order info failed:', error);
      throw error;
    }
  }

  async checkPaymentStatus(orderId: string): Promise<PayriffPaymentStatus> {
    try {
      const requestData = {
        merchant: this.merchantId,
        order_id: orderId,
      };

      const signature = this.generateSignature(requestData);

      const response = await fetch(`${this.baseUrl}/api/v1/payment/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.secretKey}`,
        },
        body: JSON.stringify({
          ...requestData,
          signature,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check payment status');
      }

      const data = await response.json();

      return {
        orderId: data.order_id || orderId,
        status: this.mapPaymentStatus(data.status),
        amount: data.amount / 100,
        currency: data.currency || 'AZN',
        transactionId: data.transaction_id,
        paymentDate: data.payment_date,
      };
    } catch (error) {
      logger.error('Failed to check payment status:', error);
      throw error;
    }
  }

  private mapPaymentStatus(status: string): 'pending' | 'success' | 'failed' | 'cancelled' {
    const statusMap: Record<string, 'pending' | 'success' | 'failed' | 'cancelled'> = {
      'pending': 'pending',
      'processing': 'pending',
      'success': 'success',
      'completed': 'success',
      'failed': 'failed',
      'error': 'failed',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
    };

    return statusMap[status.toLowerCase()] || 'pending';
  }

  async refundPayment(transactionId: string, amount?: number): Promise<boolean> {
    try {
      const requestData = {
        merchant: this.merchantId,
        transaction_id: transactionId,
        ...(amount && { amount: Math.round(amount * 100) }),
      };

      const signature = this.generateSignature(requestData);

      const response = await fetch(`${this.baseUrl}/api/v1/payment/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.secretKey}`,
        },
        body: JSON.stringify({
          ...requestData,
          signature,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refund payment');
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      logger.error('Failed to refund payment:', error);
      return false;
    }
  }

  isConfigured(): boolean {
    const hasMerchantId = Boolean(this.merchantId) && !this.merchantId.includes('your-');
    const hasSecretKey = Boolean(this.secretKey) && !this.secretKey.includes('your-');
    return hasMerchantId && hasSecretKey;
  }

  openPaymentPage(paymentUrl: string) {
    if (Platform.OS === 'web') {
      window.open(paymentUrl, '_blank');
    } else {
      logger.debug('Opening payment URL:', paymentUrl);
    }
  }
}

export const payriffService = new PayriffService();

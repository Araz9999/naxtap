import crypto from 'crypto';
import { logger } from '../utils/logger';
import { PayriffResponse, isPayriffSuccess, getPayriffErrorMessage } from '../constants/payriffCodes';
export interface PayriffPaymentData {
  amount: number;
  orderId: string;
  description: string;
  language?: 'az' | 'en' | 'ru';
  customerEmail?: string;
  customerPhone?: string;
}

export interface PayriffPaymentResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  error?: string;
}

export interface PayriffTransactionStatus {
  transactionId: string;
  orderId: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  amount: number;
  currency: string;
  createdAt: string;
  approvedAt?: string;
}

class PayriffService {
  private merchantId: string;
  private secretKey: string;
  private apiUrl: string;
  private environment: string;

  constructor() {
    this.merchantId = process.env.PAYRIFF_MERCHANT_ID || '';
    this.secretKey = process.env.PAYRIFF_SECRET_KEY || '';
    this.apiUrl = process.env.PAYRIFF_API_URL || 'https://api.payriff.com/api/v2';
    this.environment = process.env.PAYRIFF_ENVIRONMENT || 'production';

    if (!this.merchantId || !this.secretKey) {
      logger.warn('Payriff credentials not configured');
    }
  }

  private generateSignature(data: string): string {
    // Use HMAC-SHA256 with the merchant secret to prevent forgery
    return crypto.createHmac('sha256', this.secretKey).update(data).digest('hex');
  }

  private getCallbackUrls() {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
    return {
      successUrl: `${baseUrl}/payment/success`,
      errorUrl: `${baseUrl}/payment/error`,
      callbackUrl: `${baseUrl}/api/payriff-callback`,
    };
  }

  async createPayment(data: PayriffPaymentData): Promise<PayriffPaymentResponse> {
    try {
      // ===== BACKEND VALIDATION START =====
      
      // 1. Check credentials
      if (!this.merchantId || !this.secretKey) {
        throw new Error('Payriff credentials not configured');
      }
      
      // 2. Amount validation (backend double-check)
      if (!data.amount || typeof data.amount !== 'number' || isNaN(data.amount) || !isFinite(data.amount)) {
        throw new Error('Invalid amount');
      }
      
      if (data.amount <= 0) {
        throw new Error('Amount must be positive');
      }
      
      if (data.amount > 100000) {
        throw new Error('Amount exceeds maximum limit');
      }
      
      // 3. OrderId validation
      if (!data.orderId || typeof data.orderId !== 'string' || data.orderId.trim().length === 0) {
        throw new Error('Invalid orderId');
      }
      
      if (data.orderId.length > 255) {
        throw new Error('OrderId too long');
      }
      
      // 4. Description validation
      if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
        throw new Error('Invalid description');
      }
      
      if (data.description.length > 500) {
        throw new Error('Description too long');
      }
      
      // 5. Language validation
      const validLanguages = ['az', 'en', 'ru'];
      if (data.language && !validLanguages.includes(data.language)) {
        throw new Error('Invalid language');
      }
      
      // ===== BACKEND VALIDATION END =====

      const urls = this.getCallbackUrls();

      // Use Payriff v3 API format (same as createOrder)
      const paymentData = {
        amount: data.amount, // v3 API expects amount in main currency, not qepik
        currency: 'AZN',
        description: data.description,
        language: (data.language || 'az').toUpperCase() as 'AZ' | 'EN' | 'RU',
        callbackUrl: urls.callbackUrl,
        operation: 'PURCHASE' as const,
        cardSave: false,
      };

      logger.info('Creating Payriff payment (v3):', {
        orderId: data.orderId,
        amount: data.amount,
        merchantId: this.merchantId,
      });

      // Use v3 orders endpoint - construct base URL properly
      const baseUrl = this.apiUrl.includes('/api/') 
        ? this.apiUrl.replace('/api/v2', '/api/v3')
        : `${this.apiUrl}/api/v3`;
      
      const response = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.secretKey, // v3 API uses secretKey directly, not Bearer token
        },
        body: JSON.stringify(paymentData),
      });

      const responseText = await response.text();
      logger.debug('[Payriff] API Response:', { 
        status: response.status, 
        statusText: response.statusText,
        responseLength: responseText.length 
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText || 'Unknown error' };
        }
        
        logger.error('[Payriff] API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        const errorMessage = errorData.message || 
                            errorData.error || 
                            errorData.internalMessage ||
                            `Payriff API error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      let result: PayriffResponse;
      try {
        result = JSON.parse(responseText) as PayriffResponse;
      } catch {
        logger.error('[Payriff] Failed to parse response:', responseText);
        throw new Error('Invalid response from Payriff API');
      }

      // Check if response indicates success
      if (!isPayriffSuccess(result)) {
        const errorMessage = getPayriffErrorMessage(result, 'Failed to create payment');
        logger.error('[Payriff] Payment creation failed:', {
          code: result.code,
          message: result.message,
          internalMessage: result.internalMessage,
        });
        throw new Error(errorMessage);
      }

      // v3 API response format: { code, message, payload: { orderId, paymentUrl, transactionId } }
      const paymentUrl = result.payload?.paymentUrl || result.route;
      const transactionId = result.payload?.transactionId || result.payload?.orderId;
      
      if (!paymentUrl) {
        logger.error('[Payriff] No payment URL in response:', result);
        throw new Error('Payment URL not received from Payriff');
      }

      logger.info('[Payriff] Payment created successfully:', {
        paymentUrl,
        transactionId,
        orderId: result.payload?.orderId || data.orderId,
      });

      return {
        success: true,
        paymentUrl,
        transactionId: transactionId?.toString() || result.payload?.orderId || data.orderId,
      };
    } catch (error) {
      logger.error('Payriff payment creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getTransactionStatus(transactionId: string): Promise<PayriffTransactionStatus | null> {
    try {
      if (!this.merchantId || !this.secretKey) {
        throw new Error('Payriff credentials not configured');
      }

      const signString = `${this.merchantId}${transactionId}${this.secretKey}`;
      const signature = this.generateSignature(signString);

      const url = new URL(`${this.apiUrl}/transactions/${transactionId}`);
      url.searchParams.append('merchantId', this.merchantId);
      url.searchParams.append('signature', signature);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get transaction status');
      }

      const result = await response.json() as PayriffTransactionStatus;
      return result;
    } catch (error) {
      logger.error('Payriff transaction status error:', error);
      return null;
    }
  }

  verifyWebhookSignature(body: Record<string, unknown>, receivedSignature: string): boolean {
    try {
      // Provider signs the raw payload with the shared secret
      const computedSignature = this.generateSignature(JSON.stringify(body));
      
      // SECURITY: Use constant-time comparison to prevent timing attacks
      return this.constantTimeCompare(receivedSignature, computedSignature);
    } catch (error) {
      logger.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * SECURITY: Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  isConfigured(): boolean {
    return Boolean(
      this.merchantId &&
      this.secretKey &&
      !this.merchantId.includes('your-') &&
      !this.secretKey.includes('your-')
    );
  }

  /**
   * Compatibility wrapper used by legacy HTTP routes.
   * Creates an order and returns a payment URL using createPayment under the hood.
   */
  async createOrder(orderData: {
    amount: number;
    currency?: string;
    description: string;
    orderId: string;
    callbackUrl?: string;
    cancelUrl?: string;
  }): Promise<{ success: boolean; orderId?: string; paymentUrl?: string; error?: string }>{
    const result = await this.createPayment({
      amount: orderData.amount,
      orderId: orderData.orderId,
      description: orderData.description,
      language: 'az',
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      orderId: orderData.orderId,
      paymentUrl: result.paymentUrl,
    };
  }

  /**
   * Compatibility wrapper to verify webhook/callback signatures.
   */
  verifyCallback(body: Record<string, unknown>, signature: string): boolean {
    return this.verifyWebhookSignature(body, signature);
  }

  /**
   * Attempts to map an orderId to a transaction status by querying
   * the transaction status endpoint with the provided identifier.
   * If the API expects a transactionId, this will work only when
   * orderId equals transactionId; otherwise returns 'unknown'.
   */
  async getPaymentStatus(orderId: string): Promise<'pending' | 'approved' | 'declined' | 'cancelled' | 'unknown'> {
    const status = await this.getTransactionStatus(orderId);
    return status?.status ?? 'unknown';
  }

  /**
   * Refunds are not implemented against the upstream API in this project.
   * Provided for compatibility with existing routes; returns false.
   */
  async refundPayment(_orderId: string, _amount?: number): Promise<boolean> {
    logger.warn('refundPayment is not implemented');
    return false;
  }
}

export const payriffService = new PayriffService();

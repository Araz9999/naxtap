import config from '@/constants/config';
import { Platform } from 'react-native';

import { logger } from '@/utils/logger';
export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'canceled';
  clientSecret?: string;
}

class PaymentService {
  private stripeKey: string;
  private paypalClientId: string;

  constructor() {
    this.stripeKey = config.STRIPE_PUBLISHABLE_KEY as string;
    this.paypalClientId = config.PAYPAL_CLIENT_ID as string;
  }

  async initializeStripe() {
    if (Platform.OS === 'web') {
      // Web Stripe initialization
      if (typeof window !== 'undefined' && !(window as any).Stripe) {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        document.head.appendChild(script);

        return new Promise((resolve) => {
          script.onload = () => {
            (window as any).Stripe = (window as any).Stripe(this.stripeKey);
            resolve((window as any).Stripe);
          };
        });
      }
      return (window as any).Stripe;
    } else {
      // Mobile Stripe initialization would require expo-stripe or similar
      logger.debug('Mobile Stripe initialization - requires expo-stripe package');
      return null;
    }
  }

  async createPaymentIntent(amount: number, currency: string = 'usd'): Promise<PaymentIntent> {
    try {
      const response = await fetch(`${config.BASE_URL}/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      return await response.json();
    } catch (error) {
      logger.error('Payment intent creation failed:', error);
      throw error;
    }
  }

  async confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<PaymentIntent> {
    try {
      const response = await fetch(`${config.BASE_URL}/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          paymentMethodId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm payment');
      }

      return await response.json();
    } catch (error) {
      logger.error('Payment confirmation failed:', error);
      throw error;
    }
  }

  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      const response = await fetch(`${config.BASE_URL}/payments/methods/${customerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to fetch payment methods:', error);
      throw error;
    }
  }

  async processPayPalPayment(amount: number, currency: string = 'USD') {
    try {
      const response = await fetch(`${config.BASE_URL}/payments/paypal/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create PayPal payment');
      }

      return await response.json();
    } catch (error) {
      logger.error('PayPal payment failed:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return !this.stripeKey.includes('your-') && !this.paypalClientId.includes('your-');
  }
}

export const paymentService = new PaymentService();

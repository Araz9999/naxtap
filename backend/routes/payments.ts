// @ts-ignore - TypeScript module resolution issue with Hono
import { Hono } from 'hono';
import { logger } from '../utils/logger';
import { payriffService } from '../services/payriff';
import { z } from 'zod';
import crypto from 'crypto';
import { secureHeaders } from 'hono/secure-headers';

const payments = new Hono();
payments.use('*', secureHeaders());

payments.post('/payriff/create-order', async (c) => {
  try {
    const body = await c.req.json();
    const schema = z.object({
      amount: z.number().positive(),
      currency: z.enum(['AZN', 'USD', 'EUR']).default('AZN').optional(),
      description: z.string().min(1).optional(),
      userId: z.string().min(1),
    });
    const { amount, currency = 'AZN', description, userId } = schema.parse(body);

    if (!amount || amount <= 0) {
      return c.json({ error: 'Invalid amount' }, 400);
    }

    const orderId = `ORDER-${userId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';

    const orderData = {
      amount,
      currency,
      description: description || 'Wallet top-up',
      orderId,
      callbackUrl: `${frontendUrl}/api/payments/payriff/callback`,
      cancelUrl: `${frontendUrl}/wallet?payment=canceled`,
    };

    const result = await payriffService.createOrder(orderData);

    if (!result.success) {
      return c.json({ error: result.error || 'Failed to create order' }, 500);
    }

    return c.json({
      success: true,
      orderId: result.orderId,
      paymentUrl: result.paymentUrl,
    });
  } catch (error) {
    logger.error('[Payments] Create Payriff order error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

payments.post('/payriff/callback', async (c) => {
  try {
    logger.info('[Payments] Payriff callback received');

    const body = await c.req.json();
    const signature = c.req.header('X-Signature') || '';

    const isValid = payriffService.verifyCallback(body, signature);

    if (!isValid) {
      logger.error('[Payments] Invalid Payriff callback signature');
      return c.json({ error: 'Invalid signature' }, 400);
    }

    const { orderId, status, amount, currency } = body;
    logger.info('[Payments] Payment callback:', { orderId, status });
    // Never include PAN or card details in logs

    if (status === 'APPROVED') {
      logger.info('[Payments] Payment approved:', { orderId, amount: amount / 100 });
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
      logger.info('[Payments] Redirecting to success page:', { orderId });
      return c.redirect(`${frontendUrl}/wallet?payment=success&orderId=${orderId}&amount=${amount / 100}`);
    } else {
      logger.warn('[Payments] Payment failed:', { orderId, status });
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
      return c.redirect(`${frontendUrl}/wallet?payment=failed&orderId=${orderId}`);
    }
  } catch (error) {
    logger.error('[Payments] Payriff callback error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

payments.get('/payriff/status/:orderId', async (c) => {
  try {
    const orderId = c.req.param('orderId');
    logger.info('[Payments] Get payment status requested:', { orderId });

    if (!orderId) {
      logger.warn('[Payments] Missing orderId in status request');
      return c.json({ error: 'Order ID is required' }, 400);
    }

    const status = await payriffService.getPaymentStatus(orderId);
    logger.info('[Payments] Payment status retrieved:', { orderId, status });

    return c.json({
      success: true,
      status,
    });
  } catch (error) {
    logger.error('[Payments] Get payment status error:', error);
    return c.json({ error: 'Failed to get payment status' }, 500);
  }
});

payments.post('/payriff/refund', async (c) => {
  try {
    const body = await c.req.json();
    const schema = z.object({
      orderId: z.string().min(1),
      amount: z.number().positive().optional(),
    });
    const { orderId, amount } = schema.parse(body);

    logger.info('[Payments] Refund requested:', { orderId, amount });

    if (!orderId) {
      logger.warn('[Payments] Missing orderId in refund request');
      return c.json({ error: 'Order ID is required' }, 400);
    }

    const success = await payriffService.refundPayment(orderId, amount);

    if (!success) {
      logger.error('[Payments] Refund failed:', { orderId, amount });
      return c.json({ error: 'Refund failed' }, 500);
    }

    logger.info('[Payments] Refund processed successfully:', { orderId, amount });
    return c.json({
      success: true,
      message: 'Refund processed successfully',
    });
  } catch (error) {
    logger.error('[Payments] Refund error:', error);
    return c.json({ error: 'Failed to process refund' }, 500);
  }
});

export default payments;

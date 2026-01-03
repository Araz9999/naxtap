// @ts-ignore - TypeScript module resolution issue with Hono
import { Hono } from 'hono';
import { logger } from '../utils/logger';
import { secureHeaders } from 'hono/secure-headers';
import { payriffService } from '../services/payriff';
const payriffWebhook = new Hono();
payriffWebhook.use('*', secureHeaders());

payriffWebhook.post('/callback', async (c) => {
  try {
    // ===== WEBHOOK VALIDATION START =====

    // 1. Get raw body for signature verification
    const body = await c.req.json();

    // 2. Validate body structure
    if (!body || typeof body !== 'object') {
      logger.error('[PayriffWebhook] Invalid webhook body - not an object');
      return c.json({ error: 'Invalid request body' }, 400);
    }

    // 3. Get signature from header
    const signature = c.req.header('x-payriff-signature') ||
                     c.req.header('X-Payriff-Signature') ||
                     c.req.header('signature') || '';

    if (!signature || signature.trim().length === 0) {
      logger.error('[PayriffWebhook] Missing webhook signature');
      return c.json({ error: 'Missing signature' }, 401);
    }

    // 4. Verify signature (SECURITY: Prevent replay attacks)
    const isValid = payriffService.verifyWebhookSignature(body, signature);

    if (!isValid) {
      logger.error('[PayriffWebhook] Invalid webhook signature', {
        receivedSignature: signature.substring(0, 10) + '...',
        bodyKeys: Object.keys(body),
      });
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // 5. Extract and validate required fields
    const { transactionId, orderId, status, amount } = body;

    if (!transactionId || typeof transactionId !== 'string') {
      logger.error('[PayriffWebhook] Missing or invalid transactionId');
      return c.json({ error: 'Invalid transactionId' }, 400);
    }

    if (!orderId || typeof orderId !== 'string') {
      logger.error('[PayriffWebhook] Missing or invalid orderId');
      return c.json({ error: 'Invalid orderId' }, 400);
    }

    if (!status || typeof status !== 'string') {
      logger.error('[PayriffWebhook] Missing or invalid status');
      return c.json({ error: 'Invalid status' }, 400);
    }

    // 6. Validate status value
    const validStatuses = ['approved', 'declined', 'cancelled', 'pending', 'refunded'];
    if (!validStatuses.includes(status.toLowerCase())) {
      logger.error('[PayriffWebhook] Invalid status value:', status);
      return c.json({ error: 'Invalid status value' }, 400);
    }

    // ===== WEBHOOK VALIDATION END =====

    // ===== WEBHOOK PROCESSING START =====

    logger.info('[PayriffWebhook] Processing webhook:', {
      transactionId,
      orderId,
      status,
      amount: amount || 'N/A',
    });

    if (status.toLowerCase() === 'approved') {
      logger.info(`[PayriffWebhook] ✅ Payment approved: Order ${orderId}, Transaction ${transactionId}`);

      // ✅ FIXED: Update order status and wallet balance
      try {
        const { prisma } = await import('../db/client');

        // Update transaction record if it exists
        await prisma.transaction.updateMany({
          where: { orderId },
          data: {
            status: 'COMPLETED',
            transactionId,
            completedAt: new Date(),
          },
        });

        // Update user wallet balance if this is a topup
        if (body.type === 'topup' && body.userId && amount) {
          await prisma.user.update({
            where: { id: body.userId },
            data: {
              balance: { increment: amount },
            },
          });
          logger.info(`[PayriffWebhook] User ${body.userId} balance increased by ${amount}`);
        }
      } catch (dbError) {
        logger.error('[PayriffWebhook] Database update failed:', dbError);
      }

    } else if (status.toLowerCase() === 'declined') {
      logger.info(`[PayriffWebhook] ❌ Payment declined: Order ${orderId}, Transaction ${transactionId}`);

      // ✅ FIXED: Update order status to failed
      try {
        const { prisma } = await import('../db/client');
        await prisma.transaction.updateMany({
          where: { orderId },
          data: {
            status: 'FAILED',
            transactionId,
          },
        });
      } catch (dbError) {
        logger.error('[PayriffWebhook] Database update failed:', dbError);
      }

    } else if (status.toLowerCase() === 'cancelled') {
      logger.info(`[PayriffWebhook] 🚫 Payment cancelled: Order ${orderId}, Transaction ${transactionId}`);

      // ✅ FIXED: Update order status to cancelled
      try {
        const { prisma } = await import('../db/client');
        await prisma.transaction.updateMany({
          where: { orderId },
          data: {
            status: 'CANCELLED',
            transactionId,
          },
        });
      } catch (dbError) {
        logger.error('[PayriffWebhook] Database update failed:', dbError);
      }

    } else if (status.toLowerCase() === 'refunded') {
      logger.info(`[PayriffWebhook] 💰 Payment refunded: Order ${orderId}, Transaction ${transactionId}`);

      // ✅ FIXED: Handle refund
      try {
        const { prisma } = await import('../db/client');

        const transaction = await prisma.transaction.findFirst({
          where: { orderId },
        });

        if (transaction && transaction.userId && amount) {
          // Refund to user wallet
          await prisma.user.update({
            where: { id: transaction.userId },
            data: {
              balance: { increment: amount },
            },
          });

          // Update transaction status
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'REFUNDED',
            },
          });

          logger.info(`[PayriffWebhook] Refund of ${amount} processed for user ${transaction.userId}`);
        }
      } catch (dbError) {
        logger.error('[PayriffWebhook] Database update failed:', dbError);
      }
    }

    // ===== WEBHOOK PROCESSING END =====

    // Return success response immediately (Payriff expects 200 OK)
    return c.json({
      success: true,
      message: 'Webhook processed successfully',
      orderId: orderId,
      transactionId: transactionId,
    }, 200);

  } catch (error) {
    logger.error('[PayriffWebhook] Webhook processing error:', error);

    // Don't reveal internal errors to external party
    return c.json({
      error: 'Webhook processing failed',
      message: 'Internal server error',
    }, 500);
  }
});

export default payriffWebhook;

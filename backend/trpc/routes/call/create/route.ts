import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { createPendingCall } from '../../../../backend/call/callRegistry';
import { prisma } from '../../../../db/client';
import { logger } from '../../../../utils/logger';

async function sendExpoPush(to: string, payload: { title: string; body: string; data?: Record<string, unknown> }) {
  if (!to || !to.startsWith('ExponentPushToken[')) return;
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: 'default',
      }),
    });
    if (!res.ok) {
      logger.warn('[Call] Push send failed', { status: res.status });
    }
  } catch (e) {
    logger.warn('[Call] Push send error', e);
  }
}

export const createCallProcedure = publicProcedure
  .input(z.object({
    callerId: z.string().min(1),
    receiverId: z.string().min(1),
    listingId: z.string().min(1),
    type: z.enum(['voice', 'video']),
  }))
  .mutation(async ({ input }) => {
    const callId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await createPendingCall({
      callId,
      callerId: input.callerId,
      receiverId: input.receiverId,
      listingId: input.listingId,
      type: input.type,
      createdAt: new Date().toISOString(),
    });

    // Push notify receiver if they have an Expo push token
    try {
      const receiver = await prisma.user.findUnique({
        where: { id: input.receiverId },
        select: { expoPushToken: true },
      });
      if (receiver?.expoPushToken) {
        await sendExpoPush(receiver.expoPushToken, {
          title: input.type === 'video' ? 'Gələn video zəng' : 'Gələn zəng',
          body: 'Zəngi qəbul etmək üçün tətbiqi açın',
          data: {
            type: 'incoming_call',
            callId,
          },
        });
      }
    } catch (e) {
      // Don't fail call creation if push fails / prisma isn't configured
      logger.debug?.('[Call] Receiver push lookup/send failed', e);
    }

    return {
      callId,
      roomName: `call_${callId}`,
    };
  });


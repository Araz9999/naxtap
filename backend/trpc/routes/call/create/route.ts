import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { createPendingCall } from '../../../../backend/call/callRegistry';

export const createCallProcedure = publicProcedure
  .input(z.object({
    callerId: z.string().min(1),
    receiverId: z.string().min(1),
    listingId: z.string().min(1),
    type: z.enum(['voice', 'video']),
  }))
  .mutation(({ input }) => {
    const callId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    createPendingCall({
      callId,
      callerId: input.callerId,
      receiverId: input.receiverId,
      listingId: input.listingId,
      type: input.type,
      createdAt: new Date().toISOString(),
    });
    return {
      callId,
      roomName: `call_${callId}`,
    };
  });


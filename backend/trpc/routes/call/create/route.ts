import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { createPendingCall } from '../../../../call/callRegistry';

export const createCallProcedure = publicProcedure
  .input(z.object({
    callerId: z.string().min(1),
    receiverId: z.string().min(1),
    // Calls may be initiated outside of listing context (e.g., profile/conversation).
    // Keep it optional; empty string is allowed and handled by clients as "no listing".
    listingId: z.string().optional(),
    type: z.enum(['voice', 'video']),
  }))
  .mutation(({ input }) => {
    const callId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    createPendingCall({
      callId,
      callerId: input.callerId,
      receiverId: input.receiverId,
      listingId: input.listingId ?? '',
      type: input.type,
      createdAt: new Date().toISOString(),
    });
    return {
      callId,
      roomName: `call_${callId}`,
    };
  });


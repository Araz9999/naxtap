import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { removePendingCall } from '../../../../call/callRegistry';

export const declineCallProcedure = publicProcedure
  .input(z.object({ callId: z.string().min(1) }))
  .mutation(({ input }) => {
    removePendingCall(input.callId);
    return { ok: true };
  });


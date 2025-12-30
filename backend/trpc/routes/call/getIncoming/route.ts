import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { getPendingCallsForReceiver } from '../../../../backend/call/callRegistry';

export const getIncomingCallsProcedure = publicProcedure
  .input(z.object({ userId: z.string().min(1) }))
  .query(async ({ input }) => {
    return {
      calls: await getPendingCallsForReceiver(input.userId),
    };
  });


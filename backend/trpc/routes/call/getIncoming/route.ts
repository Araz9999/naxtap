import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { getPendingCallsForReceiver } from '../../../../call/callRegistry';

export const getIncomingCallsProcedure = publicProcedure
  .input(z.object({ userId: z.string().min(1) }))
  .query(({ input }) => {
    return {
      calls: getPendingCallsForReceiver(input.userId),
    };
  });


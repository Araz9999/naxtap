import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';
import { TRPCError } from '@trpc/server';

export default protectedProcedure
  .input(
    z.object({
      agentId: z.string(),
      status: z.enum(['online', 'offline', 'busy']),
    }),
  )
  .mutation(({ ctx, input }) => {
    if (ctx.user.userId !== input.agentId && ctx.user.role !== 'admin' && ctx.user.role !== 'moderator') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot update another agent status' });
    }
    return liveChatDb.agents.updateStatus(input.agentId, input.status);
  });


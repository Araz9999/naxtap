import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';
import { realtimeServer } from '../../../../realtime/server';
import { TRPCError } from '@trpc/server';

export default protectedProcedure
  .input(
    z.object({
      conversationId: z.string(),
      agentId: z.string(),
    }),
  )
  .mutation(({ ctx, input }) => {
    if (ctx.user.userId !== input.agentId && ctx.user.role !== 'admin' && ctx.user.role !== 'moderator') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot assign another agent' });
    }
    const result = liveChatDb.conversations.assignAgent(input.conversationId, input.agentId);
    if (result) {
      const agent = liveChatDb.agents.getById(input.agentId);
      realtimeServer.broadcastSupportAssigned(input.conversationId, {
        agentId: input.agentId,
        agentName: agent?.name ?? 'Support',
      });
    }
    return result;
  });


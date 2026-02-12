import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';
import { realtimeServer } from '../../../../realtime/server';

export default publicProcedure
  .input(
    z.object({
      conversationId: z.string(),
      agentId: z.string(),
    }),
  )
  .mutation(({ input }) => {
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


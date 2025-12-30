import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';

export default publicProcedure
  .input(
    z.object({
      conversationId: z.string(),
      agentId: z.string(),
    }),
  )
  .mutation(({ input }) => {
    return liveChatDb.conversations.assignAgent(input.conversationId, input.agentId);
  });


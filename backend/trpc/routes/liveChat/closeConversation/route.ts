import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';

export default publicProcedure
  .input(z.object({
    conversationId: z.string(),
  }))
  .mutation(({ input }) => {
    const conversation = liveChatDb.conversations.getById(input.conversationId);

    if (conversation && conversation.supportAgentId) {
      liveChatDb.agents.decrementActiveChats(conversation.supportAgentId);
    }

    const updated = liveChatDb.conversations.update(input.conversationId, {
      status: 'closed',
    });

    return updated;
  });

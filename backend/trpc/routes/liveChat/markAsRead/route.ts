import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';

export default publicProcedure
  .input(z.object({
    conversationId: z.string(),
  }))
  .mutation(({ input }) => {
    const messages = liveChatDb.messages.getByConversationId(input.conversationId);

    messages.forEach(msg => {
      if (msg.status !== 'seen') {
        liveChatDb.messages.updateStatus(msg.id, 'seen');
      }
    });

    liveChatDb.conversations.update(input.conversationId, {
      unreadCount: 0,
    });

    return { success: true };
  });

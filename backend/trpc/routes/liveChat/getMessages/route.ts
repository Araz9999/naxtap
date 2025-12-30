import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';

export default publicProcedure
  .input(z.object({
    conversationId: z.string(),
    // Who is viewing these messages? Used to mark the opposite side as "seen".
    // Defaults to "user" for backwards compatibility.
    viewerType: z.enum(['user', 'support']).optional(),
  }))
  .query(({ input }) => {
    const list = liveChatDb.messages.getByConversationId(input.conversationId);

    // Realistic status transition:
    // - "seen" only when the opposite side actually views/reads messages
    const viewerType = input.viewerType ?? 'user';
    if (list.length > 0) {
      liveChatDb.messages.markAsRead(input.conversationId, viewerType);
    }

    return liveChatDb.messages.getByConversationId(input.conversationId);
  });

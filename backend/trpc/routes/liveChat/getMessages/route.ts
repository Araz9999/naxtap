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
    // Don't mark as read on every query fetch - it's called too frequently by refetchInterval (every 2 seconds)
    // Mark as read should be handled explicitly via markAsRead mutation when conversation opens
    // This prevents infinite loops and 404 errors for closed/non-existent conversations
    return liveChatDb.messages.getByConversationId(input.conversationId);
  });

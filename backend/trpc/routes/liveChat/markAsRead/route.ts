import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';

export default publicProcedure
  .input(z.object({
    conversationId: z.string(),
    // Defaults to "user" for backwards compatibility.
    viewerType: z.enum(['user', 'support']).optional(),
  }))
  .mutation(({ input }) => {
    const updatedCount = liveChatDb.messages.markAsRead(input.conversationId, input.viewerType ?? 'user');
    return { success: true, updatedCount };
  });

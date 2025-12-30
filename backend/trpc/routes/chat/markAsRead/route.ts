import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../../create-context';
import { chatDb } from '../../../../db/chat';

export default protectedProcedure
  .input(
    z.object({
      conversationId: z.string().min(1),
    }),
  )
  .mutation(({ ctx, input }) => {
    const userId = ctx.user.userId;
    const conv = chatDb.conversations.getById(input.conversationId);
    if (!conv) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
    }
    if (!conv.participants.includes(userId)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a participant' });
    }
    const updatedCount = chatDb.messages.markReadForUser(conv.id, userId);
    return { updatedCount };
  });


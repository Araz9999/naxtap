import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../../create-context';
import { chatDb } from '../../../../db/chat';

export default protectedProcedure
  .input(
    z.object({
      conversationId: z.string().min(1),
      messageId: z.string().min(1),
    })
  )
  .mutation(({ ctx, input }) => {
    const userId = ctx.user.userId;
    const conv = chatDb.conversations.getById(input.conversationId);
    if (!conv) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
    if (!conv.participants.includes(userId)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a participant' });

    const list = chatDb.messages.getByConversationId(conv.id);
    const msg = list.find((m) => m.id === input.messageId);
    if (!msg) throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found' });
    if (msg.senderId !== userId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot delete other user message' });

    const ok = chatDb.messages.delete(conv.id, input.messageId);
    return { ok };
  });


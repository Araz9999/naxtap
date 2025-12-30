import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../../create-context';
import { chatDb } from '../../../../db/chat';
import { prisma } from '../../../../db/client';

export default protectedProcedure
  .input(
    z.object({
      conversationId: z.string().min(1),
    }),
  )
  .query(async ({ ctx, input }) => {
    const userId = ctx.user.userId;
    const conv = chatDb.conversations.getById(input.conversationId);
    if (!conv) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
    }
    if (!conv.participants.includes(userId)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a participant' });
    }

    const otherId = conv.participants.find((p) => p !== userId) || '';
    const other = otherId
      ? await prisma.user.findUnique({
        where: { id: otherId },
        select: { id: true, name: true, avatar: true, email: true, phone: true },
      })
      : null;

    return {
      conversation: {
        id: conv.id,
        participants: conv.participants,
        listingId: conv.listingId,
        otherUser: other
          ? {
            id: other.id,
            name: other.name,
            avatar: other.avatar,
            email: other.email,
            phone: other.phone,
          }
          : {
            id: otherId,
            name: 'Unknown',
            avatar: null,
            email: null,
            phone: null,
          },
      },
      messages: chatDb.messages.getByConversationId(conv.id),
      unreadCount: conv.unreadByUserId[userId] || 0,
    };
  });


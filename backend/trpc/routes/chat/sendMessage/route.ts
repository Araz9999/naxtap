import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../../create-context';
import { chatDb, ChatMessageType } from '../../../../db/chat';
import { prisma } from '../../../../db/client';

const attachmentSchema = z.object({
  id: z.string(),
  type: z.enum(['image', 'audio', 'file']),
  uri: z.string(),
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
  duration: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export default protectedProcedure
  .input(
    z.object({
      conversationId: z.string().optional(),
      receiverId: z.string().min(1),
      listingId: z.string().min(1),
      text: z.string().max(1000).default(''),
      type: z.enum(['text', 'image', 'audio', 'file']).default('text') as z.ZodType<ChatMessageType>,
      attachments: z.array(attachmentSchema).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const senderId = ctx.user.userId;

    if (senderId === input.receiverId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot message yourself' });
    }

    const receiver = await prisma.user.findUnique({ where: { id: input.receiverId }, select: { id: true } });
    if (!receiver) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Receiver not found' });
    }

    const hasText = (input.text || '').trim().length > 0;
    const hasAttachments = (input.attachments?.length || 0) > 0;
    if (!hasText && !hasAttachments) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Empty message' });
    }

    let conv = input.conversationId ? chatDb.conversations.getById(input.conversationId) : null;
    if (conv) {
      if (!conv.participants.includes(senderId) || !conv.participants.includes(input.receiverId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a participant' });
      }
    } else {
      conv = chatDb.conversations.findBetweenUsers(senderId, input.receiverId, input.listingId);
    }

    if (!conv) {
      conv = chatDb.conversations.create([senderId, input.receiverId], input.listingId);
    }

    const message = chatDb.messages.create(conv.id, {
      senderId,
      receiverId: input.receiverId,
      listingId: conv.listingId,
      text: input.text,
      type: input.type,
      attachments: input.attachments,
    });

    return {
      conversationId: conv.id,
      message,
    };
  });


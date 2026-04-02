import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';
import { LiveChatMessage } from '../../../../types/liveChat';
import { TRPCError } from '@trpc/server';
import { realtimeServer } from '../../../../realtime/server';
import { logger } from '../../../../utils/logger';
export default protectedProcedure
  .input(z.object({
    conversationId: z.string(),
    senderId: z.string(),
    senderName: z.string(),
    senderAvatar: z.string().optional(),
    message: z.string(),
    attachments: z.array(z.string()).optional(),
    isSupport: z.boolean(),
  }))
  .mutation(({ ctx, input }) => {
    if (ctx.user.userId !== input.senderId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'senderId mismatch' });
    }
    logger.debug('[SendMessage] Creating message:', {
      conversationId: input.conversationId,
      senderId: input.senderId,
      isSupport: input.isSupport,
      messageLength: input.message.length,
    });

    const conv = liveChatDb.conversations.getById(input.conversationId);
    if (!conv) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
    }
    if (input.isSupport) {
      if (conv.supportAgentId !== ctx.user.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not assigned to this support conversation' });
      }
    } else if (conv.userId !== ctx.user.userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not owner of this support conversation' });
    }

    const message: LiveChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      conversationId: input.conversationId,
      senderId: input.senderId,
      senderName: input.senderName,
      senderAvatar: input.senderAvatar,
      message: input.message,
      attachments: input.attachments,
      timestamp: new Date().toISOString(),
      // "delivered" means accepted & stored by server (real, immediate).
      // "seen" will only be set when the opposite side fetches/marks messages as read.
      status: 'delivered',
      isSupport: input.isSupport,
    };

    const created = liveChatDb.messages.create(message);
    logger.debug('[SendMessage] Message created:', created.id);

    const updated = liveChatDb.conversations.update(input.conversationId, {
      lastMessage: input.message,
      lastMessageTime: message.timestamp,
    });
    logger.debug('[SendMessage] Conversation updated:', updated?.id);

    // Realtime: broadcast only after save (socket never writes to DB)
    realtimeServer.broadcastSupportMessage(input.conversationId, created);

    return created;
  });

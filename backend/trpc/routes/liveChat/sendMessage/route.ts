import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';
import { LiveChatMessage } from '../../../../types/liveChat';
import { TRPCError } from '@trpc/server';

import { logger } from '../../../../utils/logger';
export default publicProcedure
  .input(z.object({
    conversationId: z.string(),
    senderId: z.string(),
    senderName: z.string(),
    senderAvatar: z.string().optional(),
    message: z.string(),
    attachments: z.array(z.string()).optional(),
    isSupport: z.boolean(),
  }))
  .mutation(({ input }) => {
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

    return created;
  });

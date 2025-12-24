import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';
import { LiveChatMessage } from '../../../../types/liveChat';

import { logger } from '../../../../utils/logger';
export default publicProcedure
  .input(z.object({
    conversationId: z.string(),
    senderId: z.string(),
    senderName: z.string(),
    senderAvatar: z.string().optional(),
    message: z.string(),
    isSupport: z.boolean(),
  }))
  .mutation(({ input }) => {
    logger.debug('[SendMessage] Creating message:', {
      conversationId: input.conversationId,
      senderId: input.senderId,
      isSupport: input.isSupport,
      messageLength: input.message.length
    });

    const message: LiveChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      conversationId: input.conversationId,
      senderId: input.senderId,
      senderName: input.senderName,
      senderAvatar: input.senderAvatar,
      message: input.message,
      timestamp: new Date().toISOString(),
      status: 'sent',
      isSupport: input.isSupport,
    };
    
    const created = liveChatDb.messages.create(message);
    logger.debug('[SendMessage] Message created:', created.id);
    
    const updated = liveChatDb.conversations.update(input.conversationId, {
      lastMessage: input.message,
      lastMessageTime: message.timestamp,
    });
    logger.debug('[SendMessage] Conversation updated:', updated?.id);
    
    setTimeout(() => {
      logger.debug('[SendMessage] Updating status to delivered:', message.id);
      liveChatDb.messages.updateStatus(message.id, 'delivered');
    }, 500);
    
    setTimeout(() => {
      logger.debug('[SendMessage] Updating status to seen:', message.id);
      liveChatDb.messages.updateStatus(message.id, 'seen');
    }, 2000);
    
    return created;
  });

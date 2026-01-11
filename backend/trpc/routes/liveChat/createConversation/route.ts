import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';
import { LiveChatConversation, LiveChatMessage } from '../../../../types/liveChat';

export default publicProcedure
  .input(z.object({
    userId: z.string(),
    userName: z.string(),
    userAvatar: z.string().optional(),
    subject: z.string().trim().min(1).max(100).optional(),
    category: z.string().trim().min(1).max(50).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  }))
  .mutation(({ input }) => {
    const existingConversation = liveChatDb.conversations
      .getByUserId(input.userId)
      .find(c => c.status !== 'closed');

    if (existingConversation) {
      return existingConversation;
    }

    const availableAgents = liveChatDb.agents.getAvailable();
    const agent = availableAgents[0];

    const conversation: LiveChatConversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      userId: input.userId,
      userName: input.userName,
      userAvatar: input.userAvatar,
      supportAgentId: agent?.id,
      supportAgentName: agent?.name,
      subject: input.subject,
      category: input.category,
      priority: input.priority,
      status: agent ? 'assigned' : 'open',
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = liveChatDb.conversations.create(conversation);

    if (agent) {
      liveChatDb.agents.incrementActiveChats(agent.id);
    }

    // Create initial message with subject if provided
    if (input.subject && input.subject.trim()) {
      const initialMessage: LiveChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        conversationId: created.id,
        senderId: input.userId,
        senderName: input.userName,
        senderAvatar: input.userAvatar,
        message: input.subject.trim(),
        attachments: undefined,
        timestamp: new Date().toISOString(),
        status: 'delivered',
        isSupport: false,
      };
      liveChatDb.messages.create(initialMessage);
      
      // Update conversation with last message
      liveChatDb.conversations.update(created.id, {
        lastMessage: input.subject.trim(),
        lastMessageTime: initialMessage.timestamp,
      });
    }

    return created;
  });

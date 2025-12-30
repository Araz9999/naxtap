import { LiveChatMessage, LiveChatConversation, SupportAgent } from '../types/liveChat';
import { logger } from '../utils/logger';

const conversations: Map<string, LiveChatConversation> = new Map();
const messages: Map<string, LiveChatMessage[]> = new Map();
const messageIndex: Map<string, LiveChatMessage> = new Map();

export type LiveChatViewerType = 'user' | 'support';

const supportAgents: SupportAgent[] = [
  {
    id: 'agent-1',
    name: 'Support Agent',
    avatar: 'https://i.pravatar.cc/150?img=1',
    status: 'online',
    activeChats: 0,
  },
  {
    id: 'agent-2',
    name: 'Admin Support',
    avatar: 'https://i.pravatar.cc/150?img=2',
    status: 'online',
    activeChats: 0,
  },
];

export const liveChatDb = {
  conversations: {
    getAll: () => Array.from(conversations.values()).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
    getById: (id: string) => conversations.get(id) || null,
    getByUserId: (userId: string) => {
      logger.info('[LiveChatDB] Getting conversations for user:', userId);
      return Array.from(conversations.values()).filter(c => c.userId === userId);
    },
    create: (conversation: LiveChatConversation) => {
      logger.info('[LiveChatDB] Creating conversation:', conversation.id);
      conversations.set(conversation.id, conversation);
      messages.set(conversation.id, []);
      return conversation;
    },
    update: (id: string, updates: Partial<LiveChatConversation>) => {
      logger.info('[LiveChatDB] Updating conversation:', id, updates);
      const conversation = conversations.get(id);
      if (conversation) {
        const updated = { ...conversation, ...updates, updatedAt: new Date().toISOString() };
        conversations.set(id, updated);
        return updated;
      }
      logger.warn('[LiveChatDB] Conversation not found:', id);
      return null;
    },
    delete: (id: string) => {
      logger.info('[LiveChatDB] Deleting conversation:', id);
      const deleted = conversations.delete(id);
      messages.delete(id);
      return deleted;
    },
    assignAgent: (conversationId: string, agentId: string) => {
      logger.info('[LiveChatDB] Assigning agent:', agentId, 'to conversation:', conversationId);
      const conversation = conversations.get(conversationId);
      if (conversation) {
        const agent = supportAgents.find(a => a.id === agentId);
        if (agent) {
          const updated = {
            ...conversation,
            supportAgentId: agentId,
            supportAgentName: agent.name,
            status: 'assigned' as const,
            updatedAt: new Date().toISOString(),
          };
          conversations.set(conversationId, updated);
          agent.activeChats++;
          return updated;
        }
      }
      logger.warn('[LiveChatDB] Failed to assign agent');
      return null;
    },
    close: (conversationId: string) => {
      logger.info('[LiveChatDB] Closing conversation:', conversationId);
      const conversation = conversations.get(conversationId);
      if (conversation) {
        const updated = {
          ...conversation,
          status: 'closed' as const,
          updatedAt: new Date().toISOString(),
        };
        conversations.set(conversationId, updated);
        return updated;
      }
      logger.warn('[LiveChatDB] Conversation not found:', conversationId);
      return null;
    },
  },

  messages: {
    getByConversationId: (conversationId: string) => {
      return messages.get(conversationId) || [];
    },
    getById: (id: string) => messageIndex.get(id) || null,
    create: (message: LiveChatMessage) => {
      logger.info('[LiveChatDB] Creating message in conversation:', message.conversationId);

      const convMessages = messages.get(message.conversationId) || [];
      convMessages.push(message);
      messages.set(message.conversationId, convMessages);
      messageIndex.set(message.id, message);

      // Update conversation's last message
      const conversation = conversations.get(message.conversationId);
      if (conversation) {
        const updated = {
          ...conversation,
          lastMessage: message.message,
          lastMessageTime: message.timestamp,
          updatedAt: new Date().toISOString(),
        };
        conversations.set(message.conversationId, updated);
      }

      logger.info('[LiveChatDB] Message created. Total messages in conversation:', convMessages.length);
      return message;
    },
    updateStatus: (id: string, status: LiveChatMessage['status']) => {
      logger.info('[LiveChatDB] Updating message status:', id, 'to', status);
      const message = messageIndex.get(id);
      if (message) {
        message.status = status;
        messageIndex.set(id, message);

        const convMessages = messages.get(message.conversationId);
        if (convMessages) {
          const index = convMessages.findIndex(m => m.id === id);
          if (index !== -1) {
            convMessages[index] = message;
            messages.set(message.conversationId, convMessages);
          }
        }
        return message;
      }
      logger.warn('[LiveChatDB] Message not found:', id);
      return null;
    },
    delete: (id: string) => {
      logger.info('[LiveChatDB] Deleting message:', id);
      const message = messageIndex.get(id);
      if (message) {
        messageIndex.delete(id);
        const convMessages = messages.get(message.conversationId);
        if (convMessages) {
          const filtered = convMessages.filter(m => m.id !== id);
          messages.set(message.conversationId, filtered);
        }
        return true;
      }
      logger.warn('[LiveChatDB] Message not found:', id);
      return false;
    },
    markAsRead: (conversationId: string, viewerType: LiveChatViewerType = 'user') => {
      logger.info('[LiveChatDB] Marking messages as read for conversation:', { conversationId, viewerType });
      const convMessages = messages.get(conversationId);
      if (convMessages) {
        const shouldMarkSeen = (msg: LiveChatMessage) => {
          // Viewer marks the opposite side's messages as seen.
          // - user sees support messages
          // - support sees user messages
          return viewerType === 'user' ? msg.isSupport : !msg.isSupport;
        };

        let updatedCount = 0;
        convMessages.forEach(msg => {
          if (shouldMarkSeen(msg) && msg.status !== 'seen') {
            msg.status = 'seen';
            messageIndex.set(msg.id, msg);
            updatedCount += 1;
          }
        });
        messages.set(conversationId, convMessages);

        // Update conversation unread count
        const conversation = conversations.get(conversationId);
        if (conversation && conversation.unreadCount > 0) {
          const updated = { ...conversation, unreadCount: 0 };
          conversations.set(conversationId, updated);
        }
        return updatedCount;
      }
      logger.warn('[LiveChatDB] Conversation not found:', conversationId);
      return 0;
    },
  },

  agents: {
    getAll: () => supportAgents,
    getById: (id: string) => supportAgents.find(a => a.id === id) || null,
    getAvailable: () => supportAgents.filter(a => a.status === 'online').sort((a, b) => a.activeChats - b.activeChats),
    updateStatus: (id: string, status: SupportAgent['status']) => {
      logger.info('[LiveChatDB] Updating agent status:', id, 'to', status);
      const agent = supportAgents.find(a => a.id === id);
      if (agent) {
        agent.status = status;
        return agent;
      }
      logger.warn('[LiveChatDB] Agent not found:', id);
      return null;
    },
    incrementActiveChats: (id: string) => {
      logger.info('[LiveChatDB] Incrementing active chats for agent:', id);
      const agent = supportAgents.find(a => a.id === id);
      if (agent) {
        agent.activeChats++;
        return agent;
      }
      logger.warn('[LiveChatDB] Agent not found:', id);
      return null;
    },
    decrementActiveChats: (id: string) => {
      logger.info('[LiveChatDB] Decrementing active chats for agent:', id);
      const agent = supportAgents.find(a => a.id === id);
      if (agent && agent.activeChats > 0) {
        agent.activeChats--;
        return agent;
      }
      logger.warn('[LiveChatDB] Agent not found or no active chats:', id);
      return null;
    },
  },
};

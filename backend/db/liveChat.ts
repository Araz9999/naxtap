import fs from 'fs';
import path from 'path';
import { LiveChatMessage, LiveChatConversation, SupportAgent } from '../types/liveChat';
import { logger } from '../utils/logger';

const conversations: Map<string, LiveChatConversation> = new Map();
const messages: Map<string, LiveChatMessage[]> = new Map();
const messageIndex: Map<string, LiveChatMessage> = new Map();

export type LiveChatViewerType = 'user' | 'support';

const DEFAULT_AGENTS: SupportAgent[] = [
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

const supportAgents: SupportAgent[] = DEFAULT_AGENTS.map((a) => ({ ...a }));

const DATA_FILE = path.join(__dirname, '..', 'data', 'live-chat.json');

type LiveChatSnapshotV1 = {
  version: 1;
  conversations: Record<string, LiveChatConversation>;
  messagesByConversation: Record<string, LiveChatMessage[]>;
  agents: SupportAgent[];
};

function ensureDataDir(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function rebuildMessageIndex(): void {
  messageIndex.clear();
  for (const list of messages.values()) {
    for (const m of list) {
      messageIndex.set(m.id, m);
    }
  }
}

function persist(): void {
  try {
    ensureDataDir();
    const snapshot: LiveChatSnapshotV1 = {
      version: 1,
      conversations: Object.fromEntries(conversations),
      messagesByConversation: Object.fromEntries(messages),
      agents: supportAgents.map((a) => ({ ...a })),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
  } catch (error) {
    logger.error('[LiveChatDB] Failed to persist:', error);
  }
}

function hydrate(): void {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    if (!raw.trim()) return;
    const data = JSON.parse(raw) as Partial<LiveChatSnapshotV1>;

    const nextConversations = new Map<string, LiveChatConversation>();
    for (const [k, v] of Object.entries(data.conversations ?? {})) {
      if (v && typeof v === 'object') nextConversations.set(k, v as LiveChatConversation);
    }

    const nextMessages = new Map<string, LiveChatMessage[]>();
    for (const [k, v] of Object.entries(data.messagesByConversation ?? {})) {
      nextMessages.set(k, Array.isArray(v) ? (v as LiveChatMessage[]) : []);
    }

    conversations.clear();
    messages.clear();
    messageIndex.clear();
    for (const [k, v] of nextConversations) conversations.set(k, v);
    for (const [k, v] of nextMessages) messages.set(k, v);
    rebuildMessageIndex();

    supportAgents.length = 0;
    if (Array.isArray(data.agents) && data.agents.length > 0) {
      supportAgents.push(...data.agents.map((a) => ({ ...a })));
    } else {
      supportAgents.push(...DEFAULT_AGENTS.map((a) => ({ ...a })));
    }

    logger.info('[LiveChatDB] Hydrated from disk:', DATA_FILE);
  } catch (error) {
    logger.error('[LiveChatDB] Failed to hydrate:', error);
  }
}

hydrate();

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
      persist();
      return conversation;
    },
    update: (id: string, updates: Partial<LiveChatConversation>) => {
      logger.info('[LiveChatDB] Updating conversation:', id, updates);
      const conversation = conversations.get(id);
      if (conversation) {
        const updated = { ...conversation, ...updates, updatedAt: new Date().toISOString() };
        conversations.set(id, updated);
        persist();
        return updated;
      }
      logger.warn('[LiveChatDB] Conversation not found:', id);
      return null;
    },
    delete: (id: string) => {
      logger.info('[LiveChatDB] Deleting conversation:', id);
      const deleted = conversations.delete(id);
      messages.delete(id);
      if (deleted) persist();
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
          persist();
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
        persist();
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
      persist();
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
        persist();
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
        persist();
        return true;
      }
      logger.warn('[LiveChatDB] Message not found:', id);
      return false;
    },
    markAsRead: (conversationId: string, viewerType: LiveChatViewerType = 'user') => {
      const conversation = conversations.get(conversationId);
      if (!conversation) {
        logger.debug('[LiveChatDB] Conversation not found for markAsRead (may be closed):', conversationId);
        return 0;
      }

      logger.debug('[LiveChatDB] Marking messages as read for conversation:', { conversationId, viewerType });
      const convMessages = messages.get(conversationId);
      if (!convMessages || convMessages.length === 0) {
        return 0;
      }

      const shouldMarkSeen = (msg: LiveChatMessage) =>
        viewerType === 'user' ? msg.isSupport : !msg.isSupport;

      let updatedCount = 0;
      convMessages.forEach(msg => {
        if (shouldMarkSeen(msg) && msg.status !== 'seen') {
          msg.status = 'seen';
          messageIndex.set(msg.id, msg);
          updatedCount += 1;
        }
      });
      messages.set(conversationId, convMessages);

      if (conversation.unreadCount > 0) {
        const updated = { ...conversation, unreadCount: 0 };
        conversations.set(conversationId, updated);
      }

      if (updatedCount > 0) {
        persist();
      }
      return updatedCount;
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
        persist();
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
        persist();
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
        persist();
        return agent;
      }
      logger.warn('[LiveChatDB] Agent not found or no active chats:', id);
      return null;
    },
  },
};

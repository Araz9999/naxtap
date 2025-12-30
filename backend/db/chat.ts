import { logger } from '../utils/logger';

export type ChatMessageType = 'text' | 'image' | 'audio' | 'file';

export type ChatAttachment = {
  id: string;
  type: 'image' | 'audio' | 'file';
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  duration?: number;
  width?: number;
  height?: number;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  listingId: string;
  text: string;
  type: ChatMessageType;
  attachments?: ChatAttachment[];
  createdAt: string;
  isRead: boolean;
  isDelivered: boolean;
};

export type ChatConversation = {
  id: string;
  participants: [string, string];
  listingId: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  lastMessageDate?: string;
  unreadByUserId: Record<string, number>;
};

const conversations = new Map<string, ChatConversation>();
const messagesByConversationId = new Map<string, ChatMessage[]>();
const messageIndex = new Map<string, ChatMessage>();

const normalizePairKey = (a: string, b: string) => [a, b].sort().join(':');

function computeLastMessagePreview(msg: ChatMessage) {
  const t = (msg.text || '').trim();
  if (t) return t;
  const first = msg.attachments?.[0];
  if (!first) return '';
  if (first.type === 'audio') return 'Səs mesajı';
  if (first.type === 'image') return 'Şəkil göndərildi';
  return 'Fayl göndərildi';
}

export const chatDb = {
  conversations: {
    getById: (id: string) => conversations.get(id) || null,
    getForUser: (userId: string) =>
      Array.from(conversations.values())
        .filter((c) => c.participants.includes(userId))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    findBetweenUsers: (userA: string, userB: string, listingId?: string) => {
      const key = normalizePairKey(userA, userB);
      const all = Array.from(conversations.values()).filter((c) => normalizePairKey(c.participants[0], c.participants[1]) === key);
      if (!listingId) return all[0] || null;
      return all.find((c) => c.listingId === listingId) || null;
    },
    create: (participants: [string, string], listingId: string) => {
      const now = new Date().toISOString();
      const id = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const conv: ChatConversation = {
        id,
        participants,
        listingId,
        createdAt: now,
        updatedAt: now,
        unreadByUserId: {
          [participants[0]]: 0,
          [participants[1]]: 0,
        },
      };
      conversations.set(id, conv);
      messagesByConversationId.set(id, []);
      logger.info('[ChatDB] Conversation created', { id, listingId, participants });
      return conv;
    },
    // If value is:
    // - undefined: keep existing
    // - null: clear field
    // - string: set field
    bump: (conversationId: string, lastMessage?: string | null, lastMessageDate?: string | null) => {
      const c = conversations.get(conversationId);
      if (!c) return null;
      const updatedAt = new Date().toISOString();
      const updated: ChatConversation = {
        ...c,
        updatedAt,
        lastMessage: lastMessage === undefined ? c.lastMessage : lastMessage ?? undefined,
        lastMessageDate: lastMessageDate === undefined ? c.lastMessageDate : lastMessageDate ?? undefined,
      };
      conversations.set(conversationId, updated);
      return updated;
    },
    incrementUnreadFor: (conversationId: string, userId: string) => {
      const c = conversations.get(conversationId);
      if (!c) return null;
      const next = {
        ...c,
        unreadByUserId: {
          ...c.unreadByUserId,
          [userId]: (c.unreadByUserId[userId] || 0) + 1,
        },
        updatedAt: new Date().toISOString(),
      };
      conversations.set(conversationId, next);
      return next;
    },
    clearUnreadFor: (conversationId: string, userId: string) => {
      const c = conversations.get(conversationId);
      if (!c) return null;
      const next = {
        ...c,
        unreadByUserId: {
          ...c.unreadByUserId,
          [userId]: 0,
        },
        updatedAt: new Date().toISOString(),
      };
      conversations.set(conversationId, next);
      return next;
    },
  },
  messages: {
    getByConversationId: (conversationId: string) => messagesByConversationId.get(conversationId) || [],
    create: (
      conversationId: string,
      msg: Pick<ChatMessage, 'senderId' | 'receiverId' | 'listingId' | 'text' | 'type' | 'attachments'>
    ) => {
      const id = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const createdAt = new Date().toISOString();
      const message: ChatMessage = {
        ...msg,
        id,
        createdAt,
        conversationId,
        isRead: false,
        isDelivered: true,
      };
      const list = messagesByConversationId.get(conversationId) || [];
      list.push(message);
      messagesByConversationId.set(conversationId, list);
      messageIndex.set(id, message);

      const preview = computeLastMessagePreview(message);
      chatDb.conversations.bump(conversationId, preview, createdAt);
      chatDb.conversations.incrementUnreadFor(conversationId, msg.receiverId);

      return message;
    },
    markReadForUser: (conversationId: string, userId: string) => {
      const list = messagesByConversationId.get(conversationId);
      if (!list) return 0;
      let updatedCount = 0;
      const updated = list.map((m) => {
        if (m.receiverId === userId && !m.isRead) {
          updatedCount += 1;
          const next = { ...m, isRead: true };
          messageIndex.set(next.id, next);
          return next;
        }
        return m;
      });
      messagesByConversationId.set(conversationId, updated);
      chatDb.conversations.clearUnreadFor(conversationId, userId);
      return updatedCount;
    },
    delete: (conversationId: string, messageId: string) => {
      const list = messagesByConversationId.get(conversationId);
      if (!list) return false;
      const exists = list.some((m) => m.id === messageId);
      if (!exists) return false;
      const next = list.filter((m) => m.id !== messageId);
      messagesByConversationId.set(conversationId, next);
      messageIndex.delete(messageId);

      const last = next[next.length - 1];
      if (last) {
        const preview = computeLastMessagePreview(last);
        chatDb.conversations.bump(conversationId, preview, last.createdAt);
      } else {
        chatDb.conversations.bump(conversationId, null, null);
      }
      return true;
    },
    deleteAllFromUser: (currentUserId: string, otherUserId: string) => {
      let totalDeleted = 0;
      for (const conv of conversations.values()) {
        if (!conv.participants.includes(currentUserId)) continue;
        if (!conv.participants.includes(otherUserId)) continue;
        const list = messagesByConversationId.get(conv.id) || [];
        const filtered = list.filter((m) => m.senderId !== otherUserId);
        totalDeleted += list.length - filtered.length;
        messagesByConversationId.set(conv.id, filtered);
        for (const m of list) {
          if (m.senderId === otherUserId) messageIndex.delete(m.id);
        }

        const last = filtered[filtered.length - 1];
        if (last) {
          const preview = computeLastMessagePreview(last);
          chatDb.conversations.bump(conv.id, preview, last.createdAt);
        } else {
          chatDb.conversations.bump(conv.id, null, null);
          chatDb.conversations.clearUnreadFor(conv.id, currentUserId);
          chatDb.conversations.clearUnreadFor(conv.id, otherUserId);
        }
      }
      return totalDeleted;
    },
  },
};


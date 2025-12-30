import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { LiveChatMessage, LiveChatConversation, MessageStatus } from '@/types/liveChat';

interface LiveChatState {
  conversations: LiveChatConversation[];
  messages: Record<string, LiveChatMessage[]>;
  activeConversationId: string | null;
  isTyping: Record<string, boolean>;
  unreadTotal: number;

  setConversations: (conversations: LiveChatConversation[]) => void;
  addConversation: (conversation: LiveChatConversation) => void;
  updateConversation: (id: string, updates: Partial<LiveChatConversation>) => void;

  setMessages: (conversationId: string, messages: LiveChatMessage[]) => void;
  addMessage: (message: LiveChatMessage) => void;
  updateMessageStatus: (messageId: string, status: MessageStatus) => void;

  setActiveConversation: (id: string | null) => void;
  setTyping: (conversationId: string, isTyping: boolean) => void;

  markAsRead: (conversationId: string) => void;
  calculateUnreadTotal: () => void;

  clearChat: (conversationId: string) => void;
  closeConversation: (conversationId: string) => void;
}

export const useLiveChatStore = create<LiveChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      messages: {},
      activeConversationId: null,
      isTyping: {},
      unreadTotal: 0,

      setConversations: (conversations) => {
        set({ conversations });
        get().calculateUnreadTotal();
      },

      addConversation: (conversation) => {
        const { conversations } = get();
        const exists = conversations.find(c => c.id === conversation.id);
        if (!exists) {
          set({ conversations: [conversation, ...conversations] });
          get().calculateUnreadTotal();
        }
      },

      updateConversation: (id, updates) => {
        const { conversations } = get();
        set({
          conversations: conversations.map(c =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c,
          ),
        });
        get().calculateUnreadTotal();
      },

      setMessages: (conversationId, messages) => {
        const { messages: allMessages } = get();
        set({
          messages: {
            ...allMessages,
            [conversationId]: messages,
          },
        });
      },

      addMessage: (message) => {
        const { messages, conversations, activeConversationId } = get();
        const conversationMessages = messages[message.conversationId] || [];

        const exists = conversationMessages.find(m => m.id === message.id);
        if (!exists) {
          set({
            messages: {
              ...messages,
              [message.conversationId]: [...conversationMessages, message],
            },
          });

          const isActiveChat = activeConversationId === message.conversationId;
          const unreadIncrement = !message.isSupport && !isActiveChat ? 1 : 0;
          const existingUnread = (conversations.find(c => c.id === message.conversationId)?.unreadCount ?? 0);
          const nextUnread = existingUnread + unreadIncrement;

          get().updateConversation(message.conversationId, {
            lastMessage: message.message,
            lastMessageTime: message.timestamp,
            unreadCount: nextUnread,
          });
        }
      },

      updateMessageStatus: (messageId, status) => {
        const { messages } = get();
        const updatedMessages = { ...messages };

        Object.keys(updatedMessages).forEach(conversationId => {
          updatedMessages[conversationId] = updatedMessages[conversationId].map(msg =>
            msg.id === messageId ? { ...msg, status } : msg,
          );
        });

        set({ messages: updatedMessages });
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
        if (id) {
          get().markAsRead(id);
        }
      },

      setTyping: (conversationId, isTyping) => {
        const { isTyping: typing } = get();
        set({
          isTyping: {
            ...typing,
            [conversationId]: isTyping,
          },
        });
      },

      markAsRead: (conversationId) => {
        const { conversations, messages } = get();
        const conversation = conversations.find(c => c.id === conversationId);

        if (conversation && conversation.unreadCount > 0) {
          get().updateConversation(conversationId, { unreadCount: 0 });

          const conversationMessages = messages[conversationId] || [];
          const updatedMessages = conversationMessages.map(msg =>
            !msg.isSupport && msg.status !== 'seen' ? { ...msg, status: 'seen' as MessageStatus } : msg,
          );

          set({
            messages: {
              ...messages,
              [conversationId]: updatedMessages,
            },
          });
        }
      },

      calculateUnreadTotal: () => {
        const { conversations } = get();
        const total = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
        set({ unreadTotal: total });
      },

      clearChat: (conversationId) => {
        const { messages } = get();
        const updatedMessages = { ...messages };
        delete updatedMessages[conversationId];
        set({ messages: updatedMessages });
      },

      closeConversation: (conversationId) => {
        get().updateConversation(conversationId, { status: 'closed' });
      },
    }),
    {
      name: 'live-chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

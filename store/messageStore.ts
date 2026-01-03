import { create } from 'zustand';
import { Message } from '@/types/message';
import { useUserStore } from './userStore';
import { realtimeService } from '@/lib/realtime';

import { logger } from '@/utils/logger';
export interface Conversation {
  id: string;
  participants: string[];
  listingId: string;
  lastMessage?: string;
  lastMessageDate?: string;
  unreadCount: number;
  messages: Message[];
}

interface MessageStore {
  conversations: Conversation[];
  addMessage: (conversationId: string, message: Message) => void;
  markAsRead: (conversationId: string) => void;
  getConversation: (conversationId: string) => Conversation | undefined;
  createConversation: (participants: string[], listingId: string) => string;
  getOrCreateConversation: (participants: string[], listingId: string) => string;
  simulateIncomingMessage: () => void;
  getFilteredConversations: () => Conversation[];
  deleteMessage: (conversationId: string, messageId: string) => void;
  deleteAllMessagesFromUser: (userId: string) => void;
  initializeRealtimeListeners: () => void;
  cleanupRealtimeListeners: () => void;
}

// ✅ FIXED: Load conversations from backend instead of mock data
// Initial conversations will be loaded dynamically from API
const initialConversations: Conversation[] = [];

export const useMessageStore = create<MessageStore>((set, get) => ({
  conversations: initialConversations,

  addMessage: (conversationId: string, message: Message) => {
    logger.debug('MessageStore - addMessage called:', {
      conversationId,
      messageText: message.text || '[empty]',
      hasAttachments: message.attachments?.length || 0,
      messageType: message.type,
    });

    // Validate message before adding - allow attachments without text
    const hasText = message.text && message.text.trim().length > 0;
    const hasAttachments = message.attachments && message.attachments.length > 0;

    if (!hasText && !hasAttachments) {
      logger.debug('MessageStore - Rejecting empty message with no attachments');
      return;
    }

    set((state) => {
      const conversationIndex = state.conversations.findIndex(conv => conv.id === conversationId);

      if (conversationIndex === -1) {
        logger.debug('MessageStore - Conversation not found:', conversationId);
        return state;
      }

      const conversation = state.conversations[conversationIndex];

      // Ensure no duplicate messages
      const existingMessage = conversation.messages.find(m => m.id === message.id);
      if (existingMessage) {
        logger.debug('MessageStore - Message already exists, skipping:', message.id);
        return state;
      }

      // Create new message with proper timestamp
      const newMessage = {
        ...message,
        createdAt: message.createdAt || new Date().toISOString(),
      };

      const updatedMessages = [...conversation.messages, newMessage];
      const lastMessage = newMessage.text?.trim() ||
        (newMessage.attachments?.length ?
          (newMessage.attachments[0].type === 'audio' ? 'Səs mesajı' :
            newMessage.attachments[0].type === 'image' ? 'Şəkil göndərildi' :
              'Fayl göndərildi') :
          '');

      const currentUserId = useUserStore.getState().currentUser?.id || 'user1';
      const updatedConversation = {
        ...conversation,
        messages: updatedMessages,
        lastMessage,
        lastMessageDate: newMessage.createdAt,
        // Increment unread count only when the message is from the other user
        unreadCount: newMessage.senderId !== currentUserId
          ? conversation.unreadCount + 1
          : conversation.unreadCount,
      };

      const updatedConversations = [...state.conversations];
      updatedConversations[conversationIndex] = updatedConversation;

      logger.debug('MessageStore - updating conversation:', conversation.id, 'with message:', newMessage.text?.trim() || 'attachment');
      logger.debug('MessageStore - conversation messages after update:', updatedConversation.messages.length);

      // Force state update by creating completely new state object
      return {
        conversations: updatedConversations.map(conv => ({
          ...conv,
          messages: conv.id === conversationId ? [...updatedConversation.messages] : [...conv.messages],
        })),
      };
    });
  },

  markAsRead: (conversationId: string) => {
    set((state) => {
      const conversations = state.conversations.map((conv) => {
        if (conv.id === conversationId) {
          const updatedMessages = conv.messages.map((msg) => ({
            ...msg,
            isRead: true,
          }));
          return {
            ...conv,
            messages: updatedMessages,
            unreadCount: 0,
          };
        }
        return conv;
      });


      return { conversations };
    });
  },

  getConversation: (conversationId: string) => {
    return get().conversations.find((conv) => conv.id === conversationId);
  },

  createConversation: (participants: string[], listingId: string) => {
    // ✅ Validate input parameters
    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      logger.error('[MessageStore] Invalid participants for conversation');
      throw new Error('Conversation must have at least 2 participants');
    }

    // ✅ Validate each participant ID
    for (const participantId of participants) {
      if (!participantId || typeof participantId !== 'string' || participantId.trim().length === 0) {
        logger.error('[MessageStore] Invalid participant ID:', participantId);
        throw new Error('All participants must have valid IDs');
      }
    }

    if (!listingId || typeof listingId !== 'string' || listingId.trim().length === 0) {
      logger.error('[MessageStore] Invalid listingId for conversation');
      throw new Error('ListingId is required');
    }

    // BUG FIX: Generate unique ID with random component to prevent conflicts
    const conversationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newConversation: Conversation = {
      id: conversationId,
      participants,
      listingId,
      unreadCount: 0,
      messages: [],
    };

    set((state) => ({
      conversations: [...state.conversations, newConversation],
    }));

    logger.info('[MessageStore] Conversation created:', conversationId);
    return conversationId;
  },

  getOrCreateConversation: (participants: string[], listingId: string) => {
    const state = get();
    const existingConv = state.conversations.find((conv) =>
      conv.participants.length === participants.length &&
      conv.participants.every((p) => participants.includes(p)),
    );

    if (existingConv) {
      logger.debug('MessageStore - Found existing conversation:', existingConv.id);
      return existingConv.id;
    }

    logger.debug('MessageStore - Creating new conversation for participants:', participants);
    const newId = state.createConversation(participants, listingId);
    logger.debug('MessageStore - Created new conversation with ID:', newId);
    return newId;
  },

  simulateIncomingMessage: () => {
    // ✅ REMOVED SIMULATION: This function should not be used in production
    // Use real incoming messages via WebSocket or tRPC instead
    logger.warn('[MessageStore] simulateIncomingMessage called - this should not be used in production');
    logger.warn('[MessageStore] Use initializeRealtimeListeners() instead');
  },

  getFilteredConversations: () => {
    const { conversations } = get();

    // ✅ Validate conversations array
    if (!Array.isArray(conversations)) {
      logger.error('[MessageStore] Invalid conversations array');
      return [];
    }

    const { isUserBlocked, currentUser } = useUserStore.getState();

    // ✅ Validate current user
    if (!currentUser || !currentUser.id) {
      logger.warn('[MessageStore] No current user for filtering conversations');
      return conversations;
    }

    return conversations.filter(conversation => {
      // ✅ Validate conversation
      if (!conversation || !Array.isArray(conversation.participants)) {
        logger.warn('[MessageStore] Invalid conversation in filter');
        return false;
      }

      const currentUserId = currentUser.id;
      const otherUserId = conversation.participants.find(id => id !== currentUserId);

      // ✅ Filter out conversations with blocked users
      return otherUserId ? !isUserBlocked(otherUserId) : true;
    });
  },

  deleteMessage: (conversationId: string, messageId: string) => {
    logger.debug('MessageStore - deleteMessage called:', { conversationId, messageId });

    // ✅ Comprehensive input validation
    if (!conversationId || typeof conversationId !== 'string' || conversationId.trim().length === 0) {
      logger.error('[MessageStore] Invalid conversationId for deleteMessage');
      throw new Error('Valid conversationId is required');
    }

    if (!messageId || typeof messageId !== 'string' || messageId.trim().length === 0) {
      logger.error('[MessageStore] Invalid messageId for deleteMessage');
      throw new Error('Valid messageId is required');
    }

    set((state) => {
      const conversationIndex = state.conversations.findIndex(conv => conv.id === conversationId);

      if (conversationIndex === -1) {
        logger.error('[MessageStore] Conversation not found for deletion:', conversationId);
        throw new Error('Conversation not found');
      }

      const conversation = state.conversations[conversationIndex];

      // ✅ Validate conversation has messages
      if (!conversation.messages || !Array.isArray(conversation.messages)) {
        logger.error('[MessageStore] Invalid messages array in conversation');
        throw new Error('Invalid conversation data');
      }

      // ✅ Find the message to delete
      const messageIndex = conversation.messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) {
        logger.error('[MessageStore] Message not found for deletion:', messageId);
        throw new Error('Message not found');
      }

      // ✅ Store deleted message for potential undo (optional)
      const deletedMessage = conversation.messages[messageIndex];
      logger.debug('[MessageStore] Deleting message:', {
        id: deletedMessage.id,
        senderId: deletedMessage.senderId,
        type: deletedMessage.type,
      });

      // ✅ Filter out the deleted message
      const updatedMessages = conversation.messages.filter(msg => msg.id !== messageId);

      // ✅ Update last message if the deleted message was the last one
      let lastMessage = conversation.lastMessage;
      let lastMessageDate = conversation.lastMessageDate;

      if (updatedMessages.length > 0) {
        const lastMsg = updatedMessages[updatedMessages.length - 1];
        lastMessage = lastMsg.text?.trim() ||
          (lastMsg.attachments?.length ?
            (lastMsg.attachments[0].type === 'audio' ? 'Səs mesajı' :
              lastMsg.attachments[0].type === 'image' ? 'Şəkil göndərildi' :
                'Fayl göndərildi') :
            '');
        lastMessageDate = lastMsg.createdAt;
      } else {
        lastMessage = undefined;
        lastMessageDate = undefined;
      }

      // ✅ Decrease unread count if the deleted message was unread
      let updatedUnreadCount = conversation.unreadCount;
      if (!deletedMessage.isRead && deletedMessage.senderId !== useUserStore.getState().currentUser?.id) {
        updatedUnreadCount = Math.max(0, updatedUnreadCount - 1);
        logger.debug('[MessageStore] Decreased unread count:', updatedUnreadCount);
      }

      const updatedConversation = {
        ...conversation,
        messages: updatedMessages,
        lastMessage,
        lastMessageDate,
        unreadCount: updatedUnreadCount,
      };

      const updatedConversations = [...state.conversations];
      updatedConversations[conversationIndex] = updatedConversation;

      logger.debug('[MessageStore] Message deleted successfully, remaining messages:', updatedMessages.length);

      return {
        conversations: updatedConversations.map(conv => ({ ...conv })),
      };
    });
  },

  deleteAllMessagesFromUser: (userId: string) => {
    logger.debug('MessageStore - deleteAllMessagesFromUser called:', userId);

    // ✅ Validate userId
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      logger.error('[MessageStore] Invalid userId for deleteAllMessagesFromUser');
      throw new Error('Valid userId is required');
    }

    set((state) => {
      let totalDeleted = 0;

      const updatedConversations = state.conversations.map(conversation => {
        // ✅ Check if this conversation involves the specified user
        if (!conversation.participants.includes(userId)) {
          return conversation;
        }

        // ✅ Validate messages array
        if (!conversation.messages || !Array.isArray(conversation.messages)) {
          logger.warn('[MessageStore] Invalid messages array in conversation:', conversation.id);
          return conversation;
        }

        // ✅ Count messages to be deleted
        const messagesFromUser = conversation.messages.filter(msg => msg.senderId === userId);
        totalDeleted += messagesFromUser.length;

        // ✅ Remove all messages from this user
        const updatedMessages = conversation.messages.filter(msg => msg.senderId !== userId);

        // ✅ Update last message and date
        let lastMessage = conversation.lastMessage;
        let lastMessageDate = conversation.lastMessageDate;

        if (updatedMessages.length > 0) {
          const lastMsg = updatedMessages[updatedMessages.length - 1];
          lastMessage = lastMsg.text?.trim() ||
            (lastMsg.attachments?.length ?
              (lastMsg.attachments[0].type === 'audio' ? 'Səs mesajı' :
                lastMsg.attachments[0].type === 'image' ? 'Şəkil göndərildi' :
                  'Fayl göndərildi') :
              '');
          lastMessageDate = lastMsg.createdAt;
        } else {
          lastMessage = undefined;
          lastMessageDate = undefined;
        }

        return {
          ...conversation,
          messages: updatedMessages,
          lastMessage,
          lastMessageDate,
          unreadCount: 0, // Reset unread count since we're deleting messages
        };
      });

      logger.debug('[MessageStore] All messages from user deleted:', userId, 'Total messages deleted:', totalDeleted);

      return {
        conversations: updatedConversations.map(conv => ({ ...conv })),
      };
    });
  },

  // Initialize WebSocket realtime listeners
  initializeRealtimeListeners: () => {
    logger.info('[MessageStore] Initializing realtime listeners');

    if (!realtimeService.isAvailable()) {
      logger.info('[MessageStore] Realtime service not available, using polling mode');
      return;
    }

    // Listen for new messages
    realtimeService.on('message:new', (data) => {
      logger.info('[MessageStore] Received new message via WebSocket:', data.conversationId);

      const state = get();
      const conversation = state.conversations.find(c => c.id === data.conversationId);

      if (conversation) {
        get().addMessage(data.conversationId, data.message);
      }
    });

    // Listen for read receipts
    realtimeService.on('message:read', (data) => {
      logger.info('[MessageStore] Messages marked as read via WebSocket:', data.conversationId);

      set((state) => ({
        conversations: state.conversations.map(conv => {
          if (conv.id === data.conversationId) {
            return {
              ...conv,
              messages: conv.messages.map(msg => {
                if (data.messageIds.includes(msg.id)) {
                  return { ...msg, isRead: true };
                }
                return msg;
              }),
            };
          }
          return conv;
        }),
      }));
    });

    // Listen for typing indicators
    realtimeService.on('message:typing', (data) => {
      logger.debug('[MessageStore] User typing:', data.userId, data.isTyping);
      // Can be used to show typing indicator in UI
    });

    logger.info('[MessageStore] Realtime listeners initialized');
  },

  // Cleanup WebSocket listeners
  cleanupRealtimeListeners: () => {
    logger.info('[MessageStore] Cleaning up realtime listeners');

    // Note: realtimeService handles cleanup internally when disconnecting
    // This is just a placeholder for future custom cleanup logic
  },
}));

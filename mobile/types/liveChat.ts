export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen';

export interface LiveChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  message: string;
  timestamp: string;
  status: MessageStatus;
  isSupport: boolean;
}

export interface LiveChatConversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  supportAgentId?: string;
  supportAgentName?: string;
  status: 'open' | 'assigned' | 'closed';
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupportAgent {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'offline' | 'busy';
  activeChats: number;
}

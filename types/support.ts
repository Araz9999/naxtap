export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  responses: SupportResponse[];

  // Admin/moderator workflow metadata (optional)
  assignedModeratorId?: string;
  moderatorNotes?: string;
  resolution?: string;
}

export interface SupportResponse {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  isAdmin: boolean;
  createdAt: Date;
  attachments?: string[];
}

export interface SupportCategory {
  id: string;
  name: string;
  nameRu: string;
  icon: string;
  description: string;
  descriptionRu: string;
}

export interface SupportStats {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  averageResponseTime: number;
}

export interface LiveChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderType: 'user' | 'operator' | 'system';
  message: string;
  timestamp: Date;
  isRead: boolean;
  attachments?: string[];
}

export interface LiveChat {
  id: string;
  userId: string;
  operatorId?: string;
  status: 'waiting' | 'active' | 'closed';
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  messages: LiveChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  userTyping: boolean;
  operatorTyping: boolean;
}

export interface Operator {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  isAvailable: boolean;
  activeChats: number;
  maxChats: number;
  specialties: string[];
  rating: number;
  totalChats: number;
  responseTime: number;
}

export interface ChatNotification {
  id: string;
  chatId: string;
  type: 'new_message' | 'chat_assigned' | 'chat_closed' | 'user_joined';
  message: string;
  timestamp: Date;
  isRead: boolean;
}

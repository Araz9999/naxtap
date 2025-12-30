export type MessageType = 'text' | 'image' | 'audio' | 'file';

export interface MessageAttachment {
  id: string;
  type: 'image' | 'audio' | 'file';
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  duration?: number;// ✅ Audio duration in seconds (for audio type)
  width?:number ;
  height?:number ;
  filesize?:number ;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  listingId: string;
  text: string;
  type: MessageType;
  attachments?: MessageAttachment[];
  createdAt: string;
  isRead: boolean;
  isDelivered: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  listingId: string;
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
}

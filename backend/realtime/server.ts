/**
 * Socket.io Realtime Server
 *
 * RULES (enforced):
 * 1. Messages are ALWAYS saved first via tRPC (chat.sendMessage / liveChat.sendMessage).
 * 2. Socket layer ONLY broadcasts already-saved messages to rooms — no DB write from socket.
 * 3. Room key is always conversationId; we use prefixes to separate chat vs support.
 *
 * Room naming:
 * - Chat (user-to-user):     room = "chat:" + conversationId
 * - Support (live support):  room = "support:" + conversationId
 *
 * Events:
 * - Chat:    message:new (broadcast by server after tRPC save), message:typing, message:read
 * - Support: support:new (broadcast by server after tRPC save), support:typing, support:read
 *
 * Future: When chatDb/liveChatDb are replaced by PostgreSQL, this file stays the same;
 * validation will use DB lookups instead of in-memory stores.
 */

import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '../utils/logger';
import { chatDb } from '../db/chat';
import { liveChatDb } from '../db/liveChat';

const ROOM_PREFIX = {
  chat: 'chat:',
  support: 'support:',
  user: 'user:', // presence / call target (e.g. user:userId)
} as const;

type RoomType = keyof typeof ROOM_PREFIX;

const CONVERSATION_ID_MAX_LEN = 200;
const CONVERSATION_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function isValidConversationId(roomId: string): boolean {
  return (
    typeof roomId === 'string' &&
    roomId.length > 0 &&
    roomId.length <= CONVERSATION_ID_MAX_LEN &&
    CONVERSATION_ID_REGEX.test(roomId)
  );
}

function toInternalRoom(type: RoomType, conversationId: string): string {
  if (type === 'user') {
    const id = conversationId.startsWith(ROOM_PREFIX.user) ? conversationId.slice(ROOM_PREFIX.user.length) : conversationId;
    return ROOM_PREFIX.user + id;
  }
  return ROOM_PREFIX[type] + conversationId;
}

interface SocketUser {
  userId: string;
  socketId: string;
  rooms: Set<string>; // internal room names (chat:xxx, support:xxx)
}

class RealtimeServer {
  private io: Server | null = null;
  private connectedUsers: Map<string, SocketUser> = new Map();

  initialize(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    logger.info('[Realtime] Socket.io server initialized');
  }

  private requireAuth(socket: Socket): SocketUser | null {
    const user = this.connectedUsers.get(socket.id);
    if (!user) {
      socket.emit('error', { message: 'Not authenticated' });
      return null;
    }
    return user;
  }

  private validateAndJoinRoom(
    socket: Socket,
    user: SocketUser,
    roomId: string,
    type: RoomType
  ): boolean {
    if (type === 'user') {
      const normalized = roomId.startsWith(ROOM_PREFIX.user) ? roomId.slice(ROOM_PREFIX.user.length) : roomId;
      if (!normalized || normalized.length > CONVERSATION_ID_MAX_LEN) {
        socket.emit('error', { message: 'Invalid user room id' });
        return false;
      }
      const internalRoom = ROOM_PREFIX.user + normalized;
      socket.join(internalRoom);
      user.rooms.add(internalRoom);
      logger.info('[Realtime] User joined user room', { userId: user.userId, roomId: normalized });
      return true;
    }

    if (!isValidConversationId(roomId)) {
      socket.emit('error', { message: 'Invalid conversationId format' });
      logger.warn('[Realtime] Invalid roomId format:', { roomId, type });
      return false;
    }

    if (type === 'chat') {
      const conv = chatDb.conversations.getById(roomId);
      if (!conv) {
        socket.emit('error', { message: 'Conversation not found' });
        logger.warn('[Realtime] Chat conversation not found:', roomId);
        return false;
      }
      if (!conv.participants.includes(user.userId)) {
        socket.emit('error', { message: 'Not a participant' });
        logger.warn('[Realtime] User not in chat conversation:', { userId: user.userId, roomId });
        return false;
      }
    } else {
      const conv = liveChatDb.conversations.getById(roomId);
      if (!conv) {
        socket.emit('error', { message: 'Support conversation not found' });
        logger.warn('[Realtime] Support conversation not found:', roomId);
        return false;
      }
    }

    const internalRoom = toInternalRoom(type, roomId);
    socket.join(internalRoom);
    user.rooms.add(internalRoom);
    logger.info('[Realtime] User joined room', { userId: user.userId, roomId, type });
    return true;
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      logger.info('[Realtime] Client connected:', socket.id);

      // --- Authentication ---
      socket.on('authenticate', async (data: { userId?: string; token?: string }) => {
        try {
          const { verifyToken } = await import('../utils/jwt');
          const token = data?.token;
          const userId = data?.userId;
          if (!token || !userId) {
            socket.emit('error', { message: 'Authentication failed' });
            return;
          }
          const decoded = await verifyToken(token);
          if (!decoded || decoded.userId !== userId) {
            logger.error('[Realtime] Invalid token or userId mismatch');
            socket.emit('error', { message: 'Authentication failed' });
            return;
          }
          this.connectedUsers.set(socket.id, {
            userId: decoded.userId,
            socketId: socket.id,
            rooms: new Set(),
          });
          socket.emit('authenticated', { userId: decoded.userId });
          logger.info('[Realtime] User authenticated:', decoded.userId);
          this.broadcastPresence(decoded.userId, 'online');
        } catch (error) {
          logger.error('[Realtime] Authentication failed:', error);
          socket.emit('error', { message: 'Authentication failed' });
        }
      });

      // --- Room management (conversationId-based, validated) ---
      socket.on('room:join', (data: { roomId?: string; type?: RoomType }) => {
        const user = this.requireAuth(socket);
        if (!user) return;
        const roomId = data?.roomId;
        const type = data?.type ?? 'chat';
        if (!roomId) {
          socket.emit('error', { message: 'roomId required' });
          return;
        }
        if (type !== 'chat' && type !== 'support' && type !== 'user') {
          socket.emit('error', { message: 'type must be chat, support, or user' });
          return;
        }
        if (!this.validateAndJoinRoom(socket, user, roomId, type)) return;
        const internalRoom = toInternalRoom(type, roomId);
        socket.to(internalRoom).emit('room:user-joined', {
          userId: user.userId,
          roomId,
          type,
        });
      });

      socket.on('room:leave', (data: { roomId?: string; type?: RoomType }) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) return;
        const roomId = data?.roomId;
        const type = data?.type ?? 'chat';
        if (!roomId) return;
        if (type !== 'user' && !isValidConversationId(roomId)) return;
        const internalRoom = toInternalRoom(type as RoomType, roomId);
        socket.leave(internalRoom);
        user.rooms.delete(internalRoom);
        logger.info('[Realtime] User left room', { userId: user.userId, roomId, type });
        socket.to(internalRoom).emit('room:user-left', {
          userId: user.userId,
          roomId,
          type,
        });
      });

      // --- Chat events (broadcast only; no persistence here) ---
      // message:send from client is NOT used for persistence. Only tRPC chat.sendMessage saves.
      // We no longer accept message:send from client to broadcast; tRPC calls broadcastChatMessage.
      socket.on('message:typing', (data: { conversationId?: string; isTyping?: boolean }) => {
        const user = this.requireAuth(socket);
        if (!user) return;
        const conversationId = data?.conversationId;
        if (!conversationId || !isValidConversationId(conversationId)) return;
        const internalRoom = toInternalRoom('chat', conversationId);
        if (!user.rooms.has(internalRoom)) {
          logger.warn('[Realtime] message:typing from user not in room:', user.userId, conversationId);
          return;
        }
        socket.to(internalRoom).emit('message:typing', {
          conversationId,
          userId: user.userId,
          isTyping: data?.isTyping ?? true,
        });
      });

      socket.on('message:read', (data: { conversationId?: string; messageIds?: string[] }) => {
        const user = this.requireAuth(socket);
        if (!user) return;
        const conversationId = data?.conversationId;
        if (!conversationId || !isValidConversationId(conversationId)) return;
        const internalRoom = toInternalRoom('chat', conversationId);
        if (!user.rooms.has(internalRoom)) {
          logger.warn('[Realtime] message:read from user not in room:', user.userId, conversationId);
          return;
        }
        socket.to(internalRoom).emit('message:read', {
          conversationId,
          messageIds: data?.messageIds ?? [],
          readBy: user.userId,
        });
      });

      // --- Support events ---
      socket.on('support:typing', (data: { conversationId?: string; isTyping?: boolean }) => {
        const user = this.requireAuth(socket);
        if (!user) return;
        const conversationId = data?.conversationId;
        if (!conversationId || !isValidConversationId(conversationId)) return;
        const internalRoom = toInternalRoom('support', conversationId);
        if (!user.rooms.has(internalRoom)) {
          logger.warn('[Realtime] support:typing from user not in room:', user.userId, conversationId);
          return;
        }
        socket.to(internalRoom).emit('support:typing', {
          conversationId,
          userId: user.userId,
          isTyping: data?.isTyping ?? true,
        });
      });

      socket.on('support:read', (data: { conversationId?: string; messageIds?: string[] }) => {
        const user = this.requireAuth(socket);
        if (!user) return;
        const conversationId = data?.conversationId;
        if (!conversationId || !isValidConversationId(conversationId)) return;
        const internalRoom = toInternalRoom('support', conversationId);
        if (!user.rooms.has(internalRoom)) return;
        socket.to(internalRoom).emit('support:read', {
          conversationId,
          messageIds: data?.messageIds ?? [],
          readBy: user.userId,
        });
      });

      // --- Call events ---
      socket.on('call:initiate', (data: {
        callId?: string;
        receiverId?: string;
        type?: 'voice' | 'video';
        listingId?: string;
      }) => {
        const user = this.requireAuth(socket);
        if (!user) return;
        const receiverId = data?.receiverId;
        if (!receiverId) return;
        logger.info('[Realtime] Call initiated:', data?.callId);
        const receiverSocket = this.findUserSocket(receiverId);
        if (receiverSocket) {
          receiverSocket.emit('call:incoming', {
            callId: data?.callId,
            callerId: user.userId,
            type: data?.type ?? 'voice',
            listingId: data?.listingId,
          });
        }
      });

      socket.on('call:answer', (data: { callId?: string; callerId?: string }) => {
        const callerSocket = data?.callerId ? this.findUserSocket(data.callerId) : null;
        if (callerSocket) {
          callerSocket.emit('call:answered', { callId: data?.callId });
        }
      });

      socket.on('call:decline', (data: { callId?: string; callerId?: string }) => {
        const callerSocket = data?.callerId ? this.findUserSocket(data.callerId) : null;
        if (callerSocket) {
          callerSocket.emit('call:declined', { callId: data?.callId });
        }
      });

      socket.on('call:end', (data: { callId?: string; otherUserId?: string }) => {
        const otherSocket = data?.otherUserId ? this.findUserSocket(data.otherUserId) : null;
        if (otherSocket) {
          otherSocket.emit('call:ended', { callId: data?.callId });
        }
      });

      // --- Support lifecycle (broadcast only; assignment/close are done via tRPC, then server can emit) ---
      socket.on('heartbeat', () => {
        socket.emit('heartbeat:ack', { timestamp: Date.now() });
      });

      socket.on('disconnect', () => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          logger.info('[Realtime] User disconnected:', user.userId);
          user.rooms.forEach(internalRoom => {
            let type: RoomType = 'chat';
            let roomId = internalRoom;
            if (internalRoom.startsWith(ROOM_PREFIX.user)) {
              type = 'user';
              roomId = internalRoom.slice(ROOM_PREFIX.user.length);
            } else if (internalRoom.startsWith(ROOM_PREFIX.support)) {
              type = 'support';
              roomId = internalRoom.slice(ROOM_PREFIX.support.length);
            } else {
              roomId = internalRoom.slice(ROOM_PREFIX.chat.length);
            }
            socket.to(internalRoom).emit('room:user-left', {
              userId: user.userId,
              roomId,
              type,
            });
          });
          this.broadcastPresence(user.userId, 'offline');
          this.connectedUsers.delete(socket.id);
        } else {
          logger.info('[Realtime] Client disconnected:', socket.id);
        }
      });
    });
  }

  private findUserSocket(userId: string): Socket | null {
    if (!this.io) return null;
    for (const [socketId, user] of this.connectedUsers.entries()) {
      if (user.userId === userId) {
        return this.io.sockets.sockets.get(socketId) ?? null;
      }
    }
    return null;
  }

  private broadcastPresence(userId: string, status: 'online' | 'offline'): void {
    if (!this.io) return;
    this.io.emit('user:presence', {
      userId,
      status,
      timestamp: Date.now(),
    });
    logger.debug('[Realtime] Broadcasted presence:', userId, status);
  }

  // ========== Server-only broadcast (called from tRPC after save) ==========
  // Socket layer never writes to DB. These methods only broadcast to rooms.

  /** Call from chat.sendMessage tRPC after saving the message. */
  broadcastChatMessage(conversationId: string, message: unknown): void {
    if (!this.io) return;
    if (!isValidConversationId(conversationId)) {
      logger.warn('[Realtime] broadcastChatMessage invalid conversationId:', conversationId);
      return;
    }
    const internalRoom = toInternalRoom('chat', conversationId);
    this.io.to(internalRoom).emit('message:new', {
      conversationId,
      message,
    });
    logger.info('[Realtime] Broadcast chat message to room:', conversationId);
  }

  /** Call from liveChat.sendMessage tRPC after saving the message. */
  broadcastSupportMessage(conversationId: string, message: unknown): void {
    if (!this.io) return;
    if (!isValidConversationId(conversationId)) {
      logger.warn('[Realtime] broadcastSupportMessage invalid conversationId:', conversationId);
      return;
    }
    const internalRoom = toInternalRoom('support', conversationId);
    this.io.to(internalRoom).emit('support:new', {
      conversationId,
      message,
    });
    this.io.to(internalRoom).emit('liveChat:message', { conversationId, message }); // backward compat
    logger.info('[Realtime] Broadcast support message to room:', conversationId);
  }

  /** Emit support conversation assigned (call from tRPC after assign). */
  broadcastSupportAssigned(conversationId: string, data: { agentId: string; agentName: string }): void {
    if (!this.io || !isValidConversationId(conversationId)) return;
    this.io.to(toInternalRoom('support', conversationId)).emit('liveChat:assigned', {
      conversationId,
      ...data,
    });
  }

  /** Emit support conversation closed (call from tRPC after close). */
  broadcastSupportClosed(conversationId: string): void {
    if (!this.io || !isValidConversationId(conversationId)) return;
    this.io.to(toInternalRoom('support', conversationId)).emit('liveChat:closed', { conversationId });
  }

  // Legacy helpers (for backward compat)
  sendMessageNotification(userId: string, data: { conversationId: string; message: unknown }): void {
    const socket = this.findUserSocket(userId);
    if (socket) {
      socket.emit('message:new', data);
      logger.debug('[Realtime] Sent message notification to user:', userId);
    }
  }

  sendCallNotification(userId: string, data: { callId: string; callerId: string; type: 'voice' | 'video' }): void {
    const socket = this.findUserSocket(userId);
    if (socket) {
      socket.emit('call:incoming', data);
      logger.debug('[Realtime] Sent call notification to user:', userId);
    }
  }

  sendLiveChatNotification(conversationId: string, data: unknown): void {
    this.broadcastSupportMessage(conversationId, data);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.values()).map(u => u.userId);
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.values().some(u => u.userId === userId);
  }

  getUserSocketCount(userId: string): number {
    let count = 0;
    for (const u of this.connectedUsers.values()) {
      if (u.userId === userId) count++;
    }
    return count;
  }
}

export const realtimeServer = new RealtimeServer();

/**
 * Socket.io Server Implementation
 * Real-time communication backend
 */

import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from './utils/logger';

interface SocketUser {
  userId: string;
  socketId: string;
  rooms: Set<string>;
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

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      logger.info(`[Realtime] Client connected: ${socket.id}`);

      // Authentication
      socket.on('authenticate', (data: { userId: string; token: string }) => {
        try {
          // TODO: Verify JWT token
          const userId = data.userId;

          this.connectedUsers.set(socket.id, {
            userId,
            socketId: socket.id,
            rooms: new Set(),
          });

          socket.emit('authenticated', { userId });
          logger.info(`[Realtime] User authenticated: ${userId}`);

          // Notify user's presence
          this.broadcastPresence(userId, 'online');
        } catch (error) {
          logger.error('[Realtime] Authentication failed:', error);
          socket.emit('error', { message: 'Authentication failed' });
        }
      });

      // Room management
      socket.on('room:join', (data: { roomId: string }) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        socket.join(data.roomId);
        user.rooms.add(data.roomId);

        logger.info(`[Realtime] User ${user.userId} joined room ${data.roomId}`);

        // Notify room members
        socket.to(data.roomId).emit('room:user-joined', {
          userId: user.userId,
          roomId: data.roomId,
        });
      });

      socket.on('room:leave', (data: { roomId: string }) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) return;

        socket.leave(data.roomId);
        user.rooms.delete(data.roomId);

        logger.info(`[Realtime] User ${user.userId} left room ${data.roomId}`);

        // Notify room members
        socket.to(data.roomId).emit('room:user-left', {
          userId: user.userId,
          roomId: data.roomId,
        });
      });

      // Messaging
      socket.on('message:send', (data: {
        conversationId: string;
        message: any;
      }) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) return;

        logger.info(`[Realtime] Message sent in conversation ${data.conversationId}`);

        // Broadcast to room
        this.io!.to(data.conversationId).emit('message:new', {
          conversationId: data.conversationId,
          message: data.message,
        });
      });

      socket.on('message:typing', (data: {
        conversationId: string;
        isTyping: boolean;
      }) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) return;

        // Broadcast typing indicator to room (except sender)
        socket.to(data.conversationId).emit('message:typing', {
          conversationId: data.conversationId,
          userId: user.userId,
          isTyping: data.isTyping,
        });
      });

      socket.on('message:read', (data: {
        conversationId: string;
        messageIds: string[];
      }) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) return;

        // Broadcast read receipt to room
        socket.to(data.conversationId).emit('message:read', {
          conversationId: data.conversationId,
          messageIds: data.messageIds,
          readBy: user.userId,
        });
      });

      // Call events
      socket.on('call:initiate', (data: {
        callId: string;
        receiverId: string;
        type: 'voice' | 'video';
      }) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) return;

        logger.info(`[Realtime] Call initiated: ${data.callId}`);

        // Find receiver's socket
        const receiverSocket = this.findUserSocket(data.receiverId);
        if (receiverSocket) {
          receiverSocket.emit('call:incoming', {
            callId: data.callId,
            callerId: user.userId,
            type: data.type,
          });
        }
      });

      socket.on('call:answer', (data: { callId: string; callerId: string }) => {
        const callerSocket = this.findUserSocket(data.callerId);
        if (callerSocket) {
          callerSocket.emit('call:answered', { callId: data.callId });
        }
      });

      socket.on('call:decline', (data: { callId: string; callerId: string }) => {
        const callerSocket = this.findUserSocket(data.callerId);
        if (callerSocket) {
          callerSocket.emit('call:declined', { callId: data.callId });
        }
      });

      socket.on('call:end', (data: { callId: string; otherUserId: string }) => {
        const otherSocket = this.findUserSocket(data.otherUserId);
        if (otherSocket) {
          otherSocket.emit('call:ended', { callId: data.callId });
        }
      });

      // Live Chat events
      socket.on('liveChat:message', (data: {
        conversationId: string;
        message: any;
      }) => {
        logger.info(`[Realtime] Live chat message in ${data.conversationId}`);

        this.io!.to(data.conversationId).emit('liveChat:message', {
          conversationId: data.conversationId,
          message: data.message,
        });
      });

      socket.on('liveChat:assigned', (data: {
        conversationId: string;
        agentId: string;
        agentName: string;
      }) => {
        this.io!.to(data.conversationId).emit('liveChat:assigned', data);
      });

      socket.on('liveChat:closed', (data: { conversationId: string }) => {
        this.io!.to(data.conversationId).emit('liveChat:closed', data);
      });

      // Heartbeat
      socket.on('heartbeat', () => {
        socket.emit('heartbeat:ack', { timestamp: Date.now() });
      });

      // Disconnect
      socket.on('disconnect', () => {
        const user = this.connectedUsers.get(socket.id);

        if (user) {
          logger.info(`[Realtime] User disconnected: ${user.userId}`);

          // Leave all rooms
          user.rooms.forEach(roomId => {
            socket.to(roomId).emit('room:user-left', {
              userId: user.userId,
              roomId,
            });
          });

          // Broadcast offline status
          this.broadcastPresence(user.userId, 'offline');

          this.connectedUsers.delete(socket.id);
        } else {
          logger.info(`[Realtime] Client disconnected: ${socket.id}`);
        }
      });
    });
  }

  // Helper methods

  private findUserSocket(userId: string): Socket | null {
    for (const [socketId, user] of this.connectedUsers.entries()) {
      if (user.userId === userId && this.io) {
        return this.io.sockets.sockets.get(socketId) || null;
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

    logger.debug(`[Realtime] Broadcasted presence: ${userId} - ${status}`);
  }

  // Public methods for backend integration

  sendMessageNotification(userId: string, data: {
    conversationId: string;
    message: any;
  }): void {
    const socket = this.findUserSocket(userId);
    if (socket) {
      socket.emit('message:new', data);
      logger.debug(`[Realtime] Sent message notification to ${userId}`);
    }
  }

  sendCallNotification(userId: string, data: {
    callId: string;
    callerId: string;
    type: 'voice' | 'video';
  }): void {
    const socket = this.findUserSocket(userId);
    if (socket) {
      socket.emit('call:incoming', data);
      logger.debug(`[Realtime] Sent call notification to ${userId}`);
    }
  }

  sendLiveChatNotification(conversationId: string, data: any): void {
    if (this.io) {
      this.io.to(conversationId).emit('liveChat:message', data);
      logger.debug(`[Realtime] Sent live chat notification to ${conversationId}`);
    }
  }

  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.values()).map(user => user.userId);
  }

  isUserOnline(userId: string): boolean {
    for (const user of this.connectedUsers.values()) {
      if (user.userId === userId) return true;
    }
    return false;
  }

  getUserSocketCount(userId: string): number {
    let count = 0;
    for (const user of this.connectedUsers.values()) {
      if (user.userId === userId) count++;
    }
    return count;
  }
}

// Singleton instance
export const realtimeServer = new RealtimeServer();

/**
 * Real-Time Communication Layer
 * 
 * Bu modul tətbiqdə real-time əlaqəni təmin edir:
 * - WebSocket connection (socket.io)
 * - Fallback polling mechanism
 * - Auto-reconnection
 * - Event handling
 */

import { Platform } from 'react-native';
import { logger } from '@/utils/logger';

// Socket.io tipləri
type SocketEventHandler = (...args: any[]) => void;

interface RealtimeConfig {
  url: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface RealtimeEvents {
  // Mesajlaşma
  'message:new': (data: { conversationId: string; message: any }) => void;
  'message:read': (data: { conversationId: string; messageIds: string[] }) => void;
  'message:typing': (data: { conversationId: string; userId: string; isTyping: boolean }) => void;
  
  // Zənglər
  'call:incoming': (data: { callId: string; callerId: string; type: 'voice' | 'video' }) => void;
  'call:answered': (data: { callId: string }) => void;
  'call:declined': (data: { callId: string }) => void;
  'call:ended': (data: { callId: string }) => void;
  
  // Canlı Dəstək
  'liveChat:message': (data: { conversationId: string; message: any }) => void;
  'liveChat:assigned': (data: { conversationId: string; agentId: string; agentName: string }) => void;
  'liveChat:closed': (data: { conversationId: string }) => void;
  
  // Sistem
  'connection': () => void;
  'disconnect': () => void;
  'reconnect': (attempt: number) => void;
  'error': (error: Error) => void;
}

class RealtimeService {
  private socket: any = null;
  private isConnected: boolean = false;
  private config: RealtimeConfig | null = null;
  private eventHandlers: Map<keyof RealtimeEvents, Set<SocketEventHandler>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  
  /**
   * WebSocket connection-u initialize edir
   */
  async initialize(config: RealtimeConfig): Promise<void> {
    if (Platform.OS === 'web') {
      logger.info('[Realtime] Initializing WebSocket for web platform');
      await this.initializeWebSocket(config);
    } else {
      logger.info('[Realtime] Initializing Socket.io for native platform');
      await this.initializeSocketIO(config);
    }
  }
  
  /**
   * Socket.io (Native) initialization
   */
  private async initializeSocketIO(config: RealtimeConfig): Promise<void> {
    try {
      // Socket.io yalnız native-də işləyir
      const io = require('socket.io-client');
      
      this.config = config;
      
      this.socket = io.default(config.url, {
        autoConnect: config.autoConnect ?? true,
        reconnection: config.reconnection ?? true,
        reconnectionAttempts: config.reconnectionAttempts ?? 5,
        reconnectionDelay: config.reconnectionDelay ?? 1000,
        transports: ['websocket', 'polling'], // Fallback to polling
      });
      
      this.setupSocketListeners();
      
      logger.info('[Realtime] Socket.io initialized');
    } catch (error) {
      logger.error('[Realtime] Failed to initialize Socket.io:', error);
      logger.info('[Realtime] Falling back to polling mode');
      // Polling mode - tRPC refetchInterval istifadə edəcək
    }
  }
  
  /**
   * WebSocket (Web) initialization
   */
  private async initializeWebSocket(config: RealtimeConfig): Promise<void> {
    try {
      this.config = config;
      
      // Web üçün native WebSocket
      const wsUrl = config.url.replace(/^http/, 'ws');
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        this.isConnected = true;
        logger.info('[Realtime] WebSocket connected');
        this.emit('connection');
        this.startHeartbeat();
      };
      
      this.socket.onclose = () => {
        this.isConnected = false;
        logger.info('[Realtime] WebSocket disconnected');
        this.emit('disconnect');
        this.stopHeartbeat();
        
        if (config.reconnection) {
          this.scheduleReconnect();
        }
      };
      
      this.socket.onerror = (error: Event) => {
        logger.error('[Realtime] WebSocket error:', error);
        this.emit('error', new Error('WebSocket connection failed'));
      };
      
      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          logger.error('[Realtime] Failed to parse message:', error);
        }
      };
      
      logger.info('[Realtime] WebSocket initialized');
    } catch (error) {
      logger.error('[Realtime] Failed to initialize WebSocket:', error);
      logger.info('[Realtime] Falling back to polling mode');
    }
  }
  
  /**
   * Socket.io event listeners setup
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      this.isConnected = true;
      logger.info('[Realtime] Socket.io connected');
      this.emit('connection');
      this.startHeartbeat();
    });
    
    this.socket.on('disconnect', () => {
      this.isConnected = false;
      logger.info('[Realtime] Socket.io disconnected');
      this.emit('disconnect');
      this.stopHeartbeat();
    });
    
    this.socket.on('reconnect', (attempt: number) => {
      logger.info(`[Realtime] Socket.io reconnected after ${attempt} attempts`);
      this.emit('reconnect', attempt);
    });
    
    this.socket.on('error', (error: Error) => {
      logger.error('[Realtime] Socket.io error:', error);
      this.emit('error', error);
    });
    
    // Custom event listeners
    this.socket.onAny((eventName: string, ...args: any[]) => {
      this.handleSocketEvent(eventName, args);
    });
  }
  
  /**
   * Handle incoming socket events
   */
  private handleSocketEvent(eventName: string, args: any[]): void {
    const handlers = this.eventHandlers.get(eventName as keyof RealtimeEvents);
    
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          logger.error(`[Realtime] Error in event handler for ${eventName}:`, error);
        }
      });
    }
  }
  
  /**
   * Handle WebSocket messages
   */
  private handleMessage(data: { event: string; payload: any }): void {
    this.handleSocketEvent(data.event, [data.payload]);
  }
  
  /**
   * Heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send('heartbeat', { timestamp: Date.now() });
      }
    }, 30000); // 30 saniyədə bir heartbeat
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  /**
   * Reconnection logic
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    const delay = this.config?.reconnectionDelay ?? 1000;
    
    this.reconnectTimer = setTimeout(() => {
      logger.info('[Realtime] Attempting to reconnect...');
      
      if (this.config) {
        if (Platform.OS === 'web') {
          this.initializeWebSocket(this.config);
        } else {
          this.socket?.connect();
        }
      }
      
      this.reconnectTimer = null;
    }, delay);
  }
  
  /**
   * Event subscription
   */
  on<K extends keyof RealtimeEvents>(event: K, handler: RealtimeEvents[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    
    this.eventHandlers.get(event)!.add(handler as SocketEventHandler);
    
    logger.debug(`[Realtime] Subscribed to event: ${event}`);
  }
  
  /**
   * Event unsubscription
   */
  off<K extends keyof RealtimeEvents>(event: K, handler: RealtimeEvents[K]): void {
    const handlers = this.eventHandlers.get(event);
    
    if (handlers) {
      handlers.delete(handler as SocketEventHandler);
      
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
      
      logger.debug(`[Realtime] Unsubscribed from event: ${event}`);
    }
  }
  
  /**
   * Emit event (internal)
   */
  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event as keyof RealtimeEvents);
    
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          logger.error(`[Realtime] Error emitting event ${event}:`, error);
        }
      });
    }
  }
  
  /**
   * Send message to server
   */
  send(event: string, data: any): void {
    if (!this.isConnected) {
      logger.warn('[Realtime] Cannot send message - not connected');
      return;
    }
    
    try {
      if (Platform.OS === 'web' && this.socket instanceof WebSocket) {
        this.socket.send(JSON.stringify({ event, data }));
      } else if (this.socket?.emit) {
        this.socket.emit(event, data);
      }
      
      logger.debug(`[Realtime] Sent event: ${event}`);
    } catch (error) {
      logger.error('[Realtime] Failed to send message:', error);
    }
  }
  
  /**
   * Join room (for conversations)
   */
  joinRoom(roomId: string): void {
    this.send('room:join', { roomId });
    logger.info(`[Realtime] Joined room: ${roomId}`);
  }
  
  /**
   * Leave room
   */
  leaveRoom(roomId: string): void {
    this.send('room:leave', { roomId });
    logger.info(`[Realtime] Left room: ${roomId}`);
  }
  
  /**
   * Connection status
   */
  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (!this.socket) return 'disconnected';
    
    if (Platform.OS === 'web') {
      if (this.socket.readyState === WebSocket.OPEN) return 'connected';
      if (this.socket.readyState === WebSocket.CONNECTING) return 'connecting';
      return 'disconnected';
    } else {
      return this.socket.connected ? 'connected' : 'disconnected';
    }
  }
  
  /**
   * Disconnect
   */
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      if (Platform.OS === 'web' && this.socket instanceof WebSocket) {
        this.socket.close();
      } else if (this.socket.disconnect) {
        this.socket.disconnect();
      }
    }
    
    this.isConnected = false;
    this.socket = null;
    
    logger.info('[Realtime] Disconnected');
  }
  
  /**
   * Check if feature is available
   */
  isAvailable(): boolean {
    return this.socket !== null;
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();

// Export types
export type { RealtimeConfig, RealtimeEvents };

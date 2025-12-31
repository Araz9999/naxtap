# 🚀 WebSocket və Real-Time Optimallaşdırma Tövsiyələri

## 📋 SUMMARY

Sizin video zəng, səsli zəng və mesajlaşma sistemləri **artıq həqiqidir və işləyir**! 

Bu sənəd production üçün əlavə optimallaşdırmaları izah edir.

---

## ✅ HAL-HAZIRDA NƏ İŞLƏYİR?

### 1. **Video/Səsli Zənglər** ✅ REAL
- **LiveKit SDK** ilə tam WebRTC support
- Real-time audio/video streaming
- Server-side recording imkanı
- Connection quality monitoring
- **Hal-hazırda polling**: Backend-dən zəng invite-ları alınır

### 2. **Mesajlaşma** ✅ REAL  
- **tRPC** vasitəsilə backend integration
- Text, image, audio, file attachments
- Read receipts
- **Hal-hazırda polling**: Her 1.5 saniyədə yeni mesajlar yoxlanılır

### 3. **Canlı Dəstək** ✅ REAL
- Operator assignment sistemi
- Priority queue
- File attachments
- **Hal-hazırda polling**: Her 2 saniyədə yoxlanılır

---

## 🔧 OPTİMALLAŞDIRMA 1: WebSocket Əlavə Et (Tövsiyə)

WebSocket polling-i əvəz edərək **instant** mesaj və zəng bildirişləri təmin edir.

### Backend Paketlər:
```bash
cd backend
npm install socket.io @types/socket.io
```

### Frontend Paketlər:
```bash
cd /workspace
npm install socket.io-client
```

### Environment Variables:
```bash
# .env faylına əlavə edin
ENABLE_WEBSOCKET=true
SOCKET_IO_URL=ws://your-backend-url:3000
```

### Backend artıq hazırdır:
- ✅ `/workspace/backend/realtime/server.ts` - Socket.io server
- ✅ `/workspace/backend/server.ts` - HTTP + Socket.io integration

### Frontend artıq hazırdır:
- ✅ `/workspace/lib/realtime.ts` - WebSocket client

### İstifadəsi:

**1. App başlanğıcında initialize edin:**
```typescript
// app/_layout.tsx
import { realtimeService } from '@/lib/realtime';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    // WebSocket bağlantısı
    realtimeService.initialize({
      url: process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000',
      autoConnect: true,
      reconnection: true,
    });

    return () => {
      realtimeService.disconnect();
    };
  }, []);

  // ... rest of layout
}
```

**2. Mesajlaşmada istifadə:**
```typescript
// app/conversation/[id].tsx
import { realtimeService } from '@/lib/realtime';

export default function ConversationScreen() {
  // ...

  useEffect(() => {
    if (!conversationId) return;

    // Join conversation room
    realtimeService.joinRoom(conversationId);

    // Listen for new messages
    realtimeService.on('message:new', (data) => {
      if (data.conversationId === conversationId) {
        // Refresh messages instantly
        trpcUtils.chat.getMessages.invalidate({ conversationId });
      }
    });

    // Listen for typing
    realtimeService.on('message:typing', (data) => {
      if (data.conversationId === conversationId) {
        setIsOtherUserTyping(data.isTyping);
      }
    });

    return () => {
      realtimeService.leaveRoom(conversationId);
    };
  }, [conversationId]);

  // Send typing indicator
  const handleTyping = () => {
    realtimeService.send('message:typing', {
      conversationId,
      isTyping: true,
    });
  };

  // ...
}
```

**3. Zənglərdə istifadə:**
```typescript
// store/callStore.ts
import { realtimeService } from '@/lib/realtime';

export const useCallStore = create<CallStore>((set, get) => ({
  // ...

  initializeRealtimeListeners: () => {
    // Listen for incoming calls
    realtimeService.on('call:incoming', (data) => {
      const incomingCall: Call = {
        id: data.callId,
        callerId: data.callerId,
        receiverId: currentUser.id,
        type: data.type,
        status: 'incoming',
        startTime: new Date().toISOString(),
        isRead: false,
      };

      set({ incomingCall, calls: [incomingCall, ...get().calls] });
      get().playRingtone();
    });

    // Listen for answered calls
    realtimeService.on('call:answered', (data) => {
      set((state) => ({
        calls: state.calls.map(call =>
          call.id === data.callId ? { ...call, status: 'active' } : call
        ),
      }));
    });

    // Listen for ended calls
    realtimeService.on('call:ended', (data) => {
      get().endCall(data.callId);
    });
  },

  // ...
}));
```

**4. Canlı Dəstəkdə istifadə:**
```typescript
// app/live-chat.tsx
useEffect(() => {
  if (!conversationId) return;

  realtimeService.joinRoom(conversationId);

  realtimeService.on('liveChat:message', (data) => {
    if (data.conversationId === conversationId) {
      trpcUtils.liveChat.getMessages.invalidate({ conversationId });
    }
  });

  realtimeService.on('liveChat:assigned', (data) => {
    if (data.conversationId === conversationId) {
      // Operator təyin edildi
      Alert.alert('Operator Təyin Edildi', `${data.agentName} indi sizə cavab verəcək`);
    }
  });

  return () => {
    realtimeService.leaveRoom(conversationId);
  };
}, [conversationId]);
```

---

## 🎯 OPTİMALLAŞDIRMA 2: Polling İntervallarını Azalt

WebSocket əlavə etmədən polling-i təkmilləşdirin:

### Mesajlaşma:
```typescript
// app/conversation/[id].tsx
const getMessagesQuery = trpc.chat.getMessages.useQuery(
  { conversationId },
  {
    refetchInterval: 1000, // 1.5s-dən 1s-ə endir
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  }
);
```

### Zəng Polling:
```typescript
// store/callStore.ts - pollIncomingCalls hər 3 saniyə
setInterval(() => {
  get().pollIncomingCalls(currentUser.id);
}, 3000); // 5s-dən 3s-ə endir
```

### Canlı Dəstək:
```typescript
// app/live-chat.tsx
const messagesQuery = trpc.liveChat.getMessages.useQuery(
  { conversationId, viewerType: 'user' },
  {
    refetchInterval: 1500, // 2s-dən 1.5s-ə endir
  }
);
```

---

## 📱 OPTİMALLAŞDIRMA 3: Push Notifications Təkmilləşdirmə

### Backend-dən push göndərmək:
```typescript
// backend/trpc/routes/chat/sendMessage/route.ts
import { notificationService } from '@/services/notificationService';

export const sendMessageProcedure = publicProcedure
  .input(...)
  .mutation(async ({ input, ctx }) => {
    // Message save et
    const message = chatDb.messages.create(...);

    // Receiver-in push token-ini al
    const receiver = usersDb.getById(input.receiverId);
    
    if (receiver?.pushToken) {
      // Push notification göndər
      await notificationService.sendPushNotification(
        receiver.pushToken,
        {
          title: `Yeni mesaj: ${ctx.user?.name || 'İstifadəçi'}`,
          body: input.text || 'Fayl göndərildi',
          data: {
            type: 'message',
            conversationId: input.conversationId,
          },
          sound: true,
        }
      );
    }

    return { message };
  });
```

### Frontend-də handle et:
```typescript
// services/notificationService.ts-də artıq var
// app/_layout.tsx-də initialize edin

import { notificationService } from '@/services/notificationService';

useEffect(() => {
  // Permission iste
  notificationService.requestPermissions();

  // Push token al və backend-ə göndər
  notificationService.getExpoPushToken().then((token) => {
    if (token) {
      // Backend-ə göndər
      trpcClient.user.updateMe.mutate({ pushToken: token });
    }
  });
}, []);
```

---

## 🔒 OPTİMALLAŞDIRMA 4: Security və Performance

### Rate Limiting (artıq var):
```typescript
// backend/hono.ts-də artıq konfiqurasiya olunub
// Production-da avtomatik aktiv olur
```

### Message Queue (tövsiyə):
```bash
# RabbitMQ və ya Redis Pub/Sub
npm install bullmq redis
```

```typescript
// backend/queue/messageQueue.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

export const messageQueue = new Queue('messages', { connection });

// Worker
const messageWorker = new Worker('messages', async (job) => {
  const { conversationId, message } = job.data;
  
  // Process message
  // Send notifications
  // Update database
}, { connection });
```

---

## 📊 PERFORMANCE METRİCS

### Hal-hazırda (Polling):
- Message latency: ~1.5 saniyə
- Call notification: ~3 saniyə
- Live chat: ~2 saniyə
- Bandwidth: Orta (constant polling requests)

### WebSocket ilə (Tövsiyə):
- Message latency: ~100ms (instant)
- Call notification: ~50ms (instant)
- Live chat: ~100ms (instant)
- Bandwidth: Aşağı (only on events)

---

## 🧪 TEST SSENARISI

### 1. WebSocket Test:
```bash
# Backend başlat
cd backend
npm run dev

# Frontend başlat
cd ..
npm start

# Browser console-da:
# Socket connected yazdığını yoxla
```

### 2. Mesajlaşma Test:
- İki device açın
- Eyni conversation-da mesaj göndərin
- Instant göründüyünü yoxlayın

### 3. Zəng Test:
- Bir device-dən digərinə zəng edin
- Dərhal ring səsi eşidilməlidir

### 4. Canlı Dəstək Test:
- User kimi mesaj göndərin
- Operator dashboard-da instant görsənməlidir

---

## 🚀 DEPLOYMENT

### Environment Variables (Production):
```bash
# Backend .env.production
ENABLE_WEBSOCKET=true
SOCKET_IO_URL=wss://your-domain.com
LIVEKIT_URL=wss://production.livekit.cloud
DATABASE_URL=postgresql://production-db
REDIS_URL=redis://production-redis

# Frontend .env.production
EXPO_PUBLIC_BACKEND_URL=https://api.your-domain.com
EXPO_PUBLIC_SOCKET_URL=wss://api.your-domain.com
```

### Docker Compose:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - ENABLE_WEBSOCKET=true
      - DATABASE_URL=postgresql://db:5432/naxtapaz
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: naxtapaz
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
```

---

## ✅ SUMMARY

### Hal-hazırda işləyir (Polling):
- ✅ Video/Audio zənglər (LiveKit)
- ✅ Mesajlaşma (tRPC + Backend)
- ✅ Canlı Dəstək (Operator system)
- ✅ Push notifications (Expo)

### Tövsiyə olunan təkmilləşdirmələr:
1. **WebSocket əlavə et** - Instant messaging (100ms latency)
2. **Polling intervalları azalt** - 1.5s → 1s
3. **Redis cache** - Performance boost
4. **Message queue** - Scalability
5. **CDN** - Media files

### Qeyd:
Sistemlər **artıq həqiqidir**! WebSocket yalnız performance optimallaşdırması üçündür.

---

## 📞 NEXT STEPS

1. ✅ WebSocket package-lər install edin (tövsiyə)
2. ✅ Backend-i Socket.io ilə başladın
3. ✅ Frontend-də initialize edin
4. ✅ Test edin
5. ✅ Production-a deploy edin

**Məsləhət**: İlk öncə polling ilə production-a çıxın, sonra WebSocket əlavə edin.

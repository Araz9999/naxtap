# 🎯 Real-Time Communication Setup Guide

Bu sənəd sizin app-ınızda **həqiqi video zəng, səsli zəng və mesajlaşma** sistemlərinin konfiqurasiyası üçün tam təlimatdır.

## ✅ MÖVCUD DURUM

Sizin sistemlər artıq **həqiqidir**, lakin production üçün düzgün konfiqurasiya lazımdır:

### 1. ✅ Video/Səsli Zənglər (LiveKit)
- **Status**: ✅ Real WebRTC Implementation
- **Texnologiya**: LiveKit SDK
- **Xüsusiyyətlər**:
  - Real-time video/audio streams
  - Server-side recording
  - Screen sharing hazır
  - Connection quality monitoring

### 2. ✅ Mesajlaşma (Chat)
- **Status**: ✅ Real Backend Integration
- **Texnologiya**: tRPC + Backend DB
- **Xüsusiyyətlər**:
  - Text messages
  - Image/File attachments
  - Voice messages
  - Read receipts
  - Typing indicators

### 3. ✅ Canlı Dəstək (Live Chat)
- **Status**: ✅ Real Operator System
- **Texnologiya**: tRPC + Operator Assignment
- **Xüsusiyyətlər**:
  - Operator presence
  - Queue management
  - File attachments
  - Priority levels

---

## 🚀 PRODUCTION SETUP

### ADDIM 1: LiveKit Cloud Konfiqurasiyası

#### 1.1 LiveKit Cloud Hesabı
```bash
# LiveKit Cloud qeydiyyatı
1. https://cloud.livekit.io saytına daxil olun
2. Yeni account yaradın
3. Project yaradın
```

#### 1.2 API Credentials
```bash
# Dashboard-dan alın:
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
LIVEKIT_API_HOST=https://your-project.livekit.cloud
```

#### 1.3 Environment Variables Təyin Edin
```bash
# Backend .env faylınıza əlavə edin:
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-actual-key
LIVEKIT_API_SECRET=your-actual-secret
LIVEKIT_API_HOST=https://your-project.livekit.cloud
```

---

### ADDIM 2: Push Notifications (Expo)

#### 2.1 Expo Push Notifications
```bash
# Expo Dashboard-da project yaradın
# Push Notification Credentials alın
```

#### 2.2 Environment Variables
```bash
# .env faylına əlavə edin:
EXPO_PUSH_TOKEN=ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
```

#### 2.3 FCM (Firebase Cloud Messaging) - Android üçün
```bash
# Firebase Console-da project yaradın
# google-services.json faylını endirin
# FCM Server Key alın

FCM_SERVER_KEY=your-fcm-server-key
```

---

### ADDIM 3: Call Recording (Optional - S3 Storage)

#### 3.1 AWS S3 və ya MinIO
```bash
# AWS S3 Bucket yaradın və ya MinIO server quraşdırın
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-west-1
AWS_BUCKET_NAME=call-recordings

# LiveKit Egress üçün S3 config
CALL_RECORDING_S3_BUCKET=call-recordings
CALL_RECORDING_S3_REGION=eu-west-1
CALL_RECORDING_S3_ACCESS_KEY=your-access-key
CALL_RECORDING_S3_SECRET=your-secret
```

---

### ADDIM 4: Database (PostgreSQL with Prisma)

#### 4.1 Database URL
```bash
# .env faylınıza əlavə edin:
DATABASE_URL="postgresql://user:password@localhost:5432/naxtapaz?schema=public"
```

#### 4.2 Prisma Migration
```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

---

### ADDIM 5: SMS və Email (Optional)

#### 5.1 Twilio SMS
```bash
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+994xxxxxxxxx
```

#### 5.2 Resend Email
```bash
# https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
EMAIL_FROM=naxtapaz@gmail.com
EMAIL_FROM_NAME=NaxtaPaz
```

---

## 🔧 DEVELOPMENT vs PRODUCTION

### Development (.env.development)
```bash
# Local development
FRONTEND_URL=http://localhost:8081
LIVEKIT_URL=wss://your-project.livekit.cloud  # Test project
DATABASE_URL=postgresql://localhost:5432/naxtapaz_dev
```

### Production (.env.production)
```bash
# Production deployment
FRONTEND_URL=https://naxtapaz.app
LIVEKIT_URL=wss://production-project.livekit.cloud
DATABASE_URL=postgresql://production-db:5432/naxtapaz
```

---

## 📱 REAL-TIME FEATURES İZAHAT

### 1. Video/Audio Zənglər Necə İşləyir?

```
User A                 Backend                 LiveKit Cloud         User B
  |                       |                          |                  |
  |--[İnitiate Call]----->|                          |                  |
  |                       |--[Create Room]---------->|                  |
  |                       |<-[Room Token]------------|                  |
  |<--[Token]-------------|                          |                  |
  |                       |                          |                  |
  |--[Connect to Room]---------------------------->  |                  |
  |                       |                          |                  |
  |                       |--[Notify User B]---------|--------[Ring]--->|
  |                       |                          |                  |
  |                       |                          |<-[Answer]--------|
  |                       |                          |                  |
  |<-----------[Real-time WebRTC P2P Connection]---------------->     |
```

### 2. Mesajlaşma Necə İşləyir?

```
User A                 Backend DB              User B
  |                       |                      |
  |--[Send Message]------>|                      |
  |                       |--[Store in DB]       |
  |<--[Message ID]--------|                      |
  |                       |                      |
  |                       |<--[Poll Every 1.5s]--|
  |                       |--[New Messages]----->|
  |                       |                      |
```

### 3. Canlı Dəstək Necə İşləyir?

```
User              Backend              Operator Dashboard
  |                  |                          |
  |--[Start Chat]--->|                          |
  |                  |--[Assign Operator]------>|
  |                  |<--[Accept]---------------|
  |                  |                          |
  |<--[Connected]----|                          |
  |                  |                          |
  |--[Message]------>|--[Forward]-------------->|
  |<--[Reply]--------|<--[Send]-----------------|
```

---

## ⚡ OPTIMIZATIONS

### 1. Polling Intervals (Hal-hazırda)
```typescript
// Conversation Messages - her 1.5 saniyə
refetchInterval: 1500

// Live Chat - her 2 saniyə
refetchInterval: 2000

// Operator Presence - her 10 saniyə
refetchInterval: 10000
```

### 2. WebSocket Upgrade (Tövsiyə edilir)
Daha yaxşı real-time üçün WebSocket əlavə edin:

```bash
npm install socket.io socket.io-client
```

Backend:
```typescript
// backend/server.ts
import { Server } from 'socket.io';

const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Mesaj göndər
  socket.on('sendMessage', (data) => {
    io.to(data.conversationId).emit('newMessage', data);
  });
  
  // Typing indicator
  socket.on('typing', (data) => {
    socket.to(data.conversationId).emit('userTyping', data);
  });
});
```

Frontend:
```typescript
// lib/socket.ts
import io from 'socket.io-client';

export const socket = io(process.env.EXPO_PUBLIC_BACKEND_URL);

socket.on('newMessage', (message) => {
  // Yeni mesaj aldıqda store-u update et
  messageStore.addMessage(message);
});
```

---

## 🧪 TESTING

### 1. Local Development Test
```bash
# Backend başlat
cd backend
npm run dev

# Frontend başlat
cd ..
npm start
```

### 2. Video/Audio Test
```bash
# 2 device və ya emulator açın
# İki fərqli istifadəçi ilə login edin
# Bir istifadəçidən digərinə zəng edin
# Video və audio stream yoxlayın
```

### 3. Mesajlaşma Test
```bash
# Eyni conversation-da mesaj göndərin
# File və image attachment yoxlayın
# Səs mesajı yoxlayın
# Read receipts yoxlayın
```

---

## 🐛 TROUBLESHOOTING

### Problem 1: "LIVEKIT_URL not configured"
**Həll:**
```bash
# Backend .env faylında düzgün təyin edin:
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-key
LIVEKIT_API_SECRET=your-secret
```

### Problem 2: Zəng qoşulmuř
**Həll:**
```bash
# 1. LiveKit dashboard-da Project status yoxlayın
# 2. Browser console-da WebRTC errors yoxlayın
# 3. Network firewall/VPN yoxlayın
# 4. TURN server konfiqurasiyasını yoxlayın (LiveKit auto)
```

### Problem 3: Mesajlar gecikmə ilə gəlir
**Həll:**
```bash
# 1. refetchInterval azaldın (1.5s-dən 1s-ə)
# 2. WebSocket-ə keçin (yuxarıda izah)
# 3. Backend response time yoxlayın
```

### Problem 4: Push Notifications işləmir
**Həll:**
```bash
# 1. Expo push token düzgündür?
# 2. Device notifications izni verib?
# 3. FCM credentials düzgündür? (Android)
# 4. APNs certificates düzgündür? (iOS)
```

---

## 📊 MONITORING

### 1. LiveKit Dashboard
- Active calls
- Call quality metrics
- Bandwidth usage
- Connection failures

### 2. Backend Logs
```typescript
// backend/utils/logger.ts istifadə edin
logger.info('[Call] User joined room:', roomName);
logger.error('[Chat] Failed to send message:', error);
```

### 3. Frontend Metrics
```typescript
// Real-time call quality
room.on('connectionQualityChanged', (quality) => {
  console.log('Connection quality:', quality);
});

// Message delivery tracking
messageStore.messageSentCount++;
messageStore.messageFailedCount++;
```

---

## 🔐 SECURITY

### 1. LiveKit Token Security
```typescript
// Backend generates short-lived tokens (1 saat)
const token = new AccessToken(apiKey, apiSecret, {
  identity: userId,
  ttl: 3600, // 1 hour
});
```

### 2. Message Encryption (Optional)
```typescript
// End-to-end encryption üçün crypto-js
import CryptoJS from 'crypto-js';

const encrypted = CryptoJS.AES.encrypt(message, secretKey).toString();
const decrypted = CryptoJS.AES.decrypt(encrypted, secretKey).toString(CryptoJS.enc.Utf8);
```

### 3. Rate Limiting
```typescript
// Backend-də rate limit əlavə edin
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

---

## 📚 NEXT STEPS

### Tövsiyə olunan təkmilləşdirmələr:

1. ✅ **WebSocket Integration** - Real-time bidirectional communication
2. ✅ **Push Notifications** - Zəng və mesaj bildirişləri
3. ✅ **Message Queue** - RabbitMQ və ya Redis Pub/Sub
4. ✅ **Call History DB** - Prisma ilə database-də saxla
5. ✅ **Media Storage** - S3 və ya MinIO üçün recordings
6. ✅ **Analytics** - Call duration, message count, user engagement
7. ✅ **Load Balancing** - Multiple backend instances
8. ✅ **CDN** - Media files üçün CloudFront və ya CloudFlare

---

## 📞 SUPPORT

Suallarınız üçün:
- LiveKit Documentation: https://docs.livekit.io
- Expo Push Notifications: https://docs.expo.dev/push-notifications
- tRPC Documentation: https://trpc.io

---

**Əlavə qeyd**: Bu sistemlər artıq **həqiqidir** və işləyir. Yuxarıdakı setup-lar production deployment üçün lazımdır.

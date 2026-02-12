# Realtime Layer & Database Migration Planning

## Realtime layer (current)

- **File:** `realtime/server.ts`
- **Rules enforced:**
  1. Messages are **always** saved first via tRPC (`chat.sendMessage` / `liveChat.sendMessage`). Socket layer **never** writes to DB.
  2. Socket only **broadcasts** already-saved messages to rooms (called from tRPC after save).
  3. Room key is always **conversationId**; prefixes separate chat vs support:
     - Chat: `chat:` + conversationId
     - Support: `support:` + conversationId
     - User (presence): `user:` + userId
- **Events:** Chat = `message:new`, `message:typing`, `message:read`. Support = `support:new`, `support:typing`, `support:read` (+ `liveChat:message` / `liveChat:assigned` / `liveChat:closed` for backward compat).
- **Room join:** Validated by conversationId format and by existence in `chatDb` / `liveChatDb` (participant check for chat). When you move to a real DB, replace these lookups with Prisma (or your DB client); the realtime server API stays the same.

## Database migration (when you add PostgreSQL)

You said you will add the database yourself. When you do:

1. **Replace in-memory stores**
   - `db/chat.ts` (chatDb) → Prisma (or similar): tables for conversations and messages (e.g. `Conversation`, `ChatMessage`).
   - `db/liveChat.ts` (liveChatDb) → Prisma: tables for live-support conversations, messages, agents.

2. **Realtime server**
   - No change to `realtime/server.ts` logic.
   - Only change: where we validate room join, replace `chatDb.conversations.getById(roomId)` and `liveChatDb.conversations.getById(roomId)` with your DB service (e.g. `await prisma.conversation.findUnique({ where: { id: roomId } })`). Same for participant check in chat (user in conversation).
   - tRPC routes `chat.sendMessage` and `liveChat.sendMessage` will write to Prisma instead of chatDb/liveChatDb; they will still call `realtimeServer.broadcastChatMessage` / `broadcastSupportMessage` after save. Socket layer continues to do **no** DB writes.

3. **Benefits**
   - No data loss on server restart.
   - Realtime system remains production-ready: single source of truth (DB), socket only for delivery.

## Summary

| Layer        | Responsibility                          | DB write? |
|-------------|------------------------------------------|-----------|
| tRPC routes | Save message (chat / liveChat)          | Yes (today: in-memory; later: PostgreSQL) |
| Realtime    | Broadcast saved message to room          | No        |

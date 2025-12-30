import type { CallType } from '../../types/call';
import { getRedisClient } from '../redis/client';

export type PendingCall = {
  callId: string;
  callerId: string;
  receiverId: string;
  listingId: string;
  type: CallType;
  createdAt: string;
};

// Fallback for environments without Redis
const memoryPendingCallsById = new Map<string, PendingCall>();

const INVITE_TTL_SECONDS = 60; // auto-expire stale incoming calls

const callKey = (callId: string) => `call:pending:${callId}`;
const receiverZSetKey = (receiverId: string) => `calls:receiver:${receiverId}`;

export async function createPendingCall(call: PendingCall) {
  const redis = await getRedisClient();
  if (!redis) {
    memoryPendingCallsById.set(call.callId, call);
    return;
  }

  // Store call payload in a hash and reference from receiver ZSET for quick "oldest first"
  await redis.hSet(callKey(call.callId), {
    callId: call.callId,
    callerId: call.callerId,
    receiverId: call.receiverId,
    listingId: call.listingId,
    type: call.type,
    createdAt: call.createdAt,
  });
  await redis.expire(callKey(call.callId), INVITE_TTL_SECONDS);
  await redis.zAdd(receiverZSetKey(call.receiverId), {
    score: new Date(call.createdAt).getTime(),
    value: call.callId,
  });
  // keep receiver index tidy too
  await redis.expire(receiverZSetKey(call.receiverId), INVITE_TTL_SECONDS);
}

export async function getPendingCallsForReceiver(receiverId: string): Promise<PendingCall[]> {
  const redis = await getRedisClient();
  if (!redis) {
    const res: PendingCall[] = [];
    for (const c of memoryPendingCallsById.values()) {
      if (c.receiverId === receiverId) res.push(c);
    }
    res.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return res;
  }

  // Fetch up to a few oldest pending call ids
  const ids = await redis.zRange(receiverZSetKey(receiverId), 0, 4);
  const calls: PendingCall[] = [];
  for (const id of ids) {
    const data = await redis.hGetAll(callKey(id));
    // If the hash is missing/expired, prune the zset entry
    if (!data?.callId) {
      await redis.zRem(receiverZSetKey(receiverId), id);
      continue;
    }
    calls.push({
      callId: data.callId,
      callerId: data.callerId,
      receiverId: data.receiverId,
      listingId: data.listingId,
      type: data.type as CallType,
      createdAt: data.createdAt,
    });
  }
  calls.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return calls;
}

export async function removePendingCall(callId: string) {
  const redis = await getRedisClient();
  if (!redis) {
    memoryPendingCallsById.delete(callId);
    return;
  }
  const data = await redis.hGetAll(callKey(callId));
  if (data?.receiverId) {
    await redis.zRem(receiverZSetKey(data.receiverId), callId);
  }
  await redis.del(callKey(callId));
}

export async function getPendingCall(callId: string): Promise<PendingCall | undefined> {
  const redis = await getRedisClient();
  if (!redis) return memoryPendingCallsById.get(callId);
  const data = await redis.hGetAll(callKey(callId));
  if (!data?.callId) return undefined;
  return {
    callId: data.callId,
    callerId: data.callerId,
    receiverId: data.receiverId,
    listingId: data.listingId,
    type: data.type as CallType,
    createdAt: data.createdAt,
  };
}


import type { CallType } from '../../types/call';

export type PendingCall = {
  callId: string;
  callerId: string;
  receiverId: string;
  listingId: string;
  type: CallType;
  createdAt: string;
};

// NOTE: In-memory registry (suitable for single-instance deployments).
// For production multi-instance, move this to Redis/DB.
const pendingCallsById = new Map<string, PendingCall>();

export function createPendingCall(call: PendingCall) {
  pendingCallsById.set(call.callId, call);
}

export function getPendingCallsForReceiver(receiverId: string): PendingCall[] {
  const res: PendingCall[] = [];
  for (const c of pendingCallsById.values()) {
    if (c.receiverId === receiverId) res.push(c);
  }
  // oldest first
  res.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return res;
}

export function removePendingCall(callId: string) {
  pendingCallsById.delete(callId);
}

export function getPendingCall(callId: string): PendingCall | undefined {
  return pendingCallsById.get(callId);
}


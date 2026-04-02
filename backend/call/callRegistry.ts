import type { CallType } from '../types/call';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export type PendingCall = {
  callId: string;
  callerId: string;
  receiverId: string;
  listingId: string;
  type: CallType;
  createdAt: string;
};

// File-backed registry (survives process restarts on the same instance).
// For production multi-instance, move this to Redis/DB.
const pendingCallsById = new Map<string, PendingCall>();
const REGISTRY_FILE_PATH = path.resolve(process.cwd(), 'backend', 'data', 'pending-calls.json');
const MAX_CALL_AGE_MS = 10 * 60 * 1000; // 10 minutes

function ensureRegistryDir(): void {
  const dir = path.dirname(REGISTRY_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function persistRegistry(): void {
  try {
    ensureRegistryDir();
    const items = Array.from(pendingCallsById.values());
    fs.writeFileSync(REGISTRY_FILE_PATH, JSON.stringify(items, null, 2), 'utf8');
  } catch (error) {
    logger.error('[CallRegistry] Failed to persist pending calls:', error);
  }
}

function hydrateRegistry(): void {
  try {
    if (!fs.existsSync(REGISTRY_FILE_PATH)) return;
    const raw = fs.readFileSync(REGISTRY_FILE_PATH, 'utf8');
    if (!raw.trim()) return;
    const parsed = JSON.parse(raw) as PendingCall[];
    for (const item of parsed) {
      if (!item?.callId || !item.receiverId || !item.callerId) continue;
      pendingCallsById.set(item.callId, item);
    }
    cleanupExpiredCalls();
  } catch (error) {
    logger.error('[CallRegistry] Failed to hydrate pending calls:', error);
  }
}

function cleanupExpiredCalls(): void {
  const now = Date.now();
  let removed = 0;
  for (const [callId, call] of pendingCallsById.entries()) {
    const createdAtMs = new Date(call.createdAt).getTime();
    if (Number.isNaN(createdAtMs) || now - createdAtMs > MAX_CALL_AGE_MS) {
      pendingCallsById.delete(callId);
      removed++;
    }
  }
  if (removed > 0) {
    persistRegistry();
    logger.info(`[CallRegistry] Cleaned up ${removed} expired pending calls`);
  }
}

hydrateRegistry();

export function createPendingCall(call: PendingCall) {
  cleanupExpiredCalls();
  pendingCallsById.set(call.callId, call);
  persistRegistry();
}

export function getPendingCallsForReceiver(receiverId: string): PendingCall[] {
  cleanupExpiredCalls();
  const res: PendingCall[] = [];
  for (const c of pendingCallsById.values()) {
    if (c.receiverId === receiverId) res.push(c);
  }
  // oldest first
  res.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return res;
}

export function removePendingCall(callId: string) {
  const deleted = pendingCallsById.delete(callId);
  if (deleted) {
    persistRegistry();
  }
}

export function getPendingCall(callId: string): PendingCall | undefined {
  cleanupExpiredCalls();
  return pendingCallsById.get(callId);
}


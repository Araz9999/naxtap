/**
 * Simple in-memory throttling (cooldown + rolling window limit).
 *
 * NOTE: This is process-local. In production, prefer a shared store (Redis/DB)
 * to enforce limits across multiple server instances.
 */
export type ThrottleState = {
  lastActionAt: number;
  windowStartAt: number;
  windowCount: number;
};

const store = new Map<string, ThrottleState>();

function nowMs() {
  return Date.now();
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export type ThrottleConfig = {
  /** Minimum time between actions for the same key. */
  cooldownMs: number;
  /** Max actions allowed during the rolling window. */
  maxInWindow: number;
  /** Rolling window duration. */
  windowMs: number;
};

export type ThrottleResult = {
  allowed: true;
  /** Seconds the client should wait before trying again. */
  retryAfterSeconds: number;
};

export type ThrottleError = {
  allowed: false;
  retryAfterSeconds: number;
  reason: 'cooldown' | 'window';
};

export function checkThrottle(key: string, config: ThrottleConfig): ThrottleResult | ThrottleError {
  const now = nowMs();
  const cooldownMs = clampInt(config.cooldownMs, 0, 24 * 60 * 60 * 1000);
  const windowMs = clampInt(config.windowMs, 1000, 24 * 60 * 60 * 1000);
  const maxInWindow = clampInt(config.maxInWindow, 1, 1000);

  const existing = store.get(key);
  if (!existing) {
    store.set(key, { lastActionAt: now, windowStartAt: now, windowCount: 1 });
    return { allowed: true, retryAfterSeconds: Math.ceil(cooldownMs / 1000) };
  }

  // Cooldown check
  const nextAllowedAt = existing.lastActionAt + cooldownMs;
  if (cooldownMs > 0 && now < nextAllowedAt) {
    return {
      allowed: false,
      reason: 'cooldown',
      retryAfterSeconds: Math.max(1, Math.ceil((nextAllowedAt - now) / 1000)),
    };
  }

  // Window check (rolling window starting from first request in window)
  const windowEndAt = existing.windowStartAt + windowMs;
  if (now >= windowEndAt) {
    // Reset window
    store.set(key, { lastActionAt: now, windowStartAt: now, windowCount: 1 });
    return { allowed: true, retryAfterSeconds: Math.ceil(cooldownMs / 1000) };
  }

  if (existing.windowCount >= maxInWindow) {
    return {
      allowed: false,
      reason: 'window',
      retryAfterSeconds: Math.max(1, Math.ceil((windowEndAt - now) / 1000)),
    };
  }

  // Allowed: update state
  store.set(key, {
    lastActionAt: now,
    windowStartAt: existing.windowStartAt,
    windowCount: existing.windowCount + 1,
  });

  return { allowed: true, retryAfterSeconds: Math.ceil(cooldownMs / 1000) };
}

export function purgeThrottleKey(key: string) {
  store.delete(key);
}

export function purgeAllThrottle() {
  store.clear();
}


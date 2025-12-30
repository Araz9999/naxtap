// @ts-ignore - TypeScript module resolution issue with Hono
import type { Context, Next } from 'hono';
import { logger } from '../utils/logger';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
}

interface RequestInfo {
  count: number;
  resetTime: number;
}

/**
 * SECURITY: Simple in-memory rate limiter
 * For production, consider using Redis or similar distributed storage
 */
class RateLimiter {
  private requests: Map<string, RequestInfo> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, info] of this.requests.entries()) {
        if (now > info.resetTime) {
          this.requests.delete(key);
        }
      }
    }, 60000);
  }

  /**
   * Check if request should be allowed
   * @returns true if request is allowed, false if rate limited
   */
  checkLimit(identifier: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const info = this.requests.get(identifier);

    if (!info || now > info.resetTime) {
      // First request or window expired
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return true;
    }

    if (info.count >= config.maxRequests) {
      // Rate limit exceeded
      return false;
    }

    // Increment counter
    info.count++;
    this.requests.set(identifier, info);
    return true;
  }

  /**
   * Get remaining requests for an identifier
   */
  getRemaining(identifier: string, maxRequests: number): number {
    const info = this.requests.get(identifier);
    if (!info) return maxRequests;
    return Math.max(0, maxRequests - info.count);
  }

  /**
   * Get reset time for an identifier
   */
  getResetTime(identifier: string): number | null {
    const info = this.requests.get(identifier);
    return info?.resetTime ?? null;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

const rateLimiter = new RateLimiter();

/**
 * Create rate limiting middleware
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (c: Context, next: Next) => {
    // Get identifier (IP address or user ID)
    const identifier = c.req.header('x-forwarded-for') ||
                       c.req.header('x-real-ip') ||
                       'unknown';

    const isAllowed = rateLimiter.checkLimit(identifier, config);

    // Set rate limit headers
    const remaining = rateLimiter.getRemaining(identifier, config.maxRequests);
    const resetTime = rateLimiter.getResetTime(identifier);

    c.header('X-RateLimit-Limit', config.maxRequests.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    if (resetTime) {
      c.header('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
    }

    if (!isAllowed) {
      logger.warn(`[RateLimit] Request blocked from ${identifier}`);
      return c.json(
        {
          error: config.message || 'Too many requests, please try again later',
          retryAfter: resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : config.windowMs / 1000,
        },
        429,
      );
    }

    await next();
  };
}

// Pre-configured rate limiters for common use cases
export const authRateLimit = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later',
});

export const apiRateLimit = createRateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: 'Too many requests, please slow down',
});

export const strictRateLimit = createRateLimitMiddleware({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 requests per hour
  message: 'Too many requests, please try again later',
});

// @ts-ignore - TypeScript module resolution issue with Hono
import { Hono } from 'hono';
// @ts-ignore - TypeScript module resolution issue with Hono
import type { Context, Next } from 'hono';
import { trpcServer } from '@hono/trpc-server';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { appRouter } from './trpc/app-router';
import { createContext } from './trpc/create-context';
import authRoutes from './routes/auth';
import paymentsRoutes from './routes/payments';
import { logger } from './utils/logger';

// Simple in-memory rate limiter (per IP per window)
type RateRecord = { count: number; resetAt: number };
const rateBucket = new Map<string, RateRecord>();
function rateLimit(limit: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const now = Date.now();
    const headerIp = c.req.header('x-forwarded-for') || c.req.header('X-Forwarded-For');
    const ip = headerIp?.split(',')[0]?.trim() || c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || 'unknown';

    const record = rateBucket.get(ip);
    if (!record || record.resetAt <= now) {
      rateBucket.set(ip, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    if (record.count >= limit) {
      logger.warn('[RateLimit] Request limit exceeded:', {
        ip,
        limit,
        count: record.count,
        path: c.req.path,
      });
      return c.text('Too Many Requests', 429);
    }
    record.count += 1;
    rateBucket.set(ip, record);
    await next();
  };
}

const app = new Hono();

// Security headers
app.use('*', secureHeaders());

// SECURITY: Configure CORS with allowed origins
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  process.env.EXPO_PUBLIC_FRONTEND_URL,
  'https://naxtap.az',
  'http://localhost:8081',
  'http://localhost:19006',
].filter(Boolean);

app.use('*', cors({
  origin: (origin) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return origin;

    // Check if origin is in allowed list
    if (ALLOWED_ORIGINS.includes(origin)) return origin;

    // Always allow localhost with any port for local development flows
    if (origin.startsWith('http://localhost')) return origin;

    logger.warn(`[CORS] Rejected origin: ${origin}`);
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400,
}));

// Rate limiting (disabled for development)
if (process.env.NODE_ENV === 'production') {
  const apiRateLimit = Number(process.env.API_RATE_LIMIT || 100);
  app.use('/api/*', rateLimit(apiRateLimit, 60_000));
  app.use('/auth/*', rateLimit(Math.max(20, Math.floor(apiRateLimit / 2)), 60_000));
} else {
  logger.info('[RateLimit] Rate limiting disabled for development - you can test freely');
}

app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    createContext,
  }),
);

// Mount REST routes under /api
app.route('/api/auth', authRoutes);
app.route('/api/payments', paymentsRoutes);

// SECURITY: Add security headers
app.use('*', async (c, next) => {
  await next();

  // Prevent clickjacking
  c.header('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  c.header('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  c.header('X-XSS-Protection', '1; mode=block');

  // Strict Transport Security (HSTS) for HTTPS
  if (process.env.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Content Security Policy
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://cdn.mxpnl.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;");

  // Referrer Policy
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
});

app.get('/', (c) => {
  logger.info('[API] Health check requested');
  return c.json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default app;

import { logger } from './logger';
import jwt, { type JwtPayload } from 'jsonwebtoken';

// SECURITY: JWT_SECRET must be set in production
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = 'marketplace-app';
const JWT_AUDIENCE = 'marketplace-users';

if (!JWT_SECRET) {
  logger.error('[JWT] CRITICAL: JWT_SECRET environment variable is not set!');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  logger.warn('[JWT] Using fallback secret for development only');
}

const secretString = JWT_SECRET || 'dev-only-fallback-secret-change-immediately';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  exp?: number;
}

export async function generateAccessToken(payload: JWTPayload): Promise<string> {
  return jwt.sign(
    { userId: payload.userId, email: payload.email, role: payload.role },
    secretString,
    {
      algorithm: 'HS256',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: '15m',
    },
  );
}

export async function generateRefreshToken(payload: JWTPayload): Promise<string> {
  return jwt.sign(
    { userId: payload.userId, email: payload.email, role: payload.role },
    secretString,
    {
      algorithm: 'HS256',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: '30d',
    },
  );
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = jwt.verify(token, secretString, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtPayload | string;

    // BUG FIX: Validate payload fields before using
    if (typeof decoded === 'string') {
      logger.error('[JWT] Invalid payload (string)');
      return null;
    }

    const userId = (decoded as any).userId;
    const email = (decoded as any).email;
    const role = (decoded as any).role;
    const exp = (decoded as any).exp;

    if (typeof userId !== 'string' || typeof email !== 'string' || typeof role !== 'string') {
      logger.error('[JWT] Invalid payload structure');
      return null;
    }

    return {
      userId,
      email,
      role,
      exp: typeof exp === 'number' ? exp : undefined,
    };
  } catch (error) {
    logger.error('[JWT] Token verification failed:', error);
    return null;
  }
}

export async function generateTokenPair(payload: JWTPayload) {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken(payload),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}

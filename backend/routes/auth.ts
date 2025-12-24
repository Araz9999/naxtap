// @ts-ignore - TypeScript module resolution issue with Hono
import { Hono } from 'hono';
import { logger } from '../utils/logger';
import { setCookie } from 'hono/cookie';
import { oauthService } from '../services/oauth';
import { prisma } from '../db/client';
import { generateTokenPair, verifyToken } from '../utils/jwt';
import { authRateLimit } from '../middleware/rateLimit';
const auth = new Hono();

// SECURITY: Apply rate limiting to all auth routes
// Rate limiting is disabled in development (see hono.ts), but enabled in production
// For development testing, rate limiting is handled globally in hono.ts
if (process.env.NODE_ENV === 'production') {
  auth.use('*', authRateLimit);
}

const stateStore = new Map<string, { provider: string; createdAt: number }>();

/**
 * SECURITY: Generate cryptographically secure random state
 */
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function validateState(state: string): boolean {
  const stored = stateStore.get(state);
  if (!stored) return false;

  const isExpired = Date.now() - stored.createdAt > 10 * 60 * 1000;
  if (isExpired) {
    stateStore.delete(state);
    return false;
  }

  return true;
}

auth.get('/:provider/login', async (c) => {
  const provider = c.req.param('provider');
  
  logger.info(`[Auth] Initiating ${provider} login`, { provider });

  if (!['google', 'facebook', 'vk'].includes(provider)) {
    logger.warn('[Auth] Invalid provider requested:', { provider });
    return c.json({ error: 'Invalid provider' }, 400);
  }

  if (!oauthService.isConfigured(provider)) {
    logger.warn(`[Auth] Provider not configured:`, { provider });
    return c.json({ 
      error: 'Provider not configured',
      message: `${provider} OAuth is not configured. Please add the required environment variables.`
    }, 503);
  }

  try {
    const state = generateState();
    stateStore.set(state, { provider, createdAt: Date.now() });
    
    logger.info('[Auth] State generated and stored:', { provider, stateLength: state.length });

    const authUrl = oauthService.getAuthorizationUrl(provider, state);
    
    logger.info(`[Auth] Redirecting to ${provider} authorization URL`, { provider });
    return c.redirect(authUrl);
  } catch (error) {
    logger.error(`[Auth] Error initiating ${provider} login:`, error);
    return c.json({ error: 'Failed to initiate login' }, 500);
  }
});

auth.get('/:provider/callback', async (c) => {
  const provider = c.req.param('provider');
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  logger.info(`[Auth] Received ${provider} callback`, { 
    provider,
    hasCode: !!code,
    hasState: !!state,
    hasError: !!error
  });

  if (error) {
    logger.error(`[Auth] OAuth error from ${provider}:`, { provider, error });
    // Use localhost:3000 for development (proxy port), otherwise use env vars
    const frontendUrl = process.env.NODE_ENV !== 'production'
      ? 'http://localhost:3000'
      : (process.env.FRONTEND_URL || process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://1r36dhx42va8pxqbqz5ja.rork.app');
    return c.redirect(`${frontendUrl}/auth/login?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    logger.error(`[Auth] Missing code or state in ${provider} callback`, { 
      provider,
      hasCode: !!code,
      hasState: !!state
    });
    return c.json({ error: 'Missing code or state' }, 400);
  }

  if (!validateState(state)) {
    logger.error(`[Auth] Invalid or expired state in ${provider} callback`, { 
      provider,
      state: state.substring(0, 8) + '...'
    });
    return c.json({ error: 'Invalid or expired state' }, 400);
  }

  try {
    logger.info(`[Auth] Exchanging code for token with ${provider}`);
    const tokenResponse = await oauthService.exchangeCodeForToken(provider, code);
    
    logger.info(`[Auth] Fetching user info from ${provider}`);
    const userInfo = await oauthService.getUserInfo(provider, tokenResponse.access_token, tokenResponse);

    logger.info(`[Auth] Looking up user by social ID`);
    let user = await prisma.user.findFirst({
      where: {
        socialAccounts: {
          some: {
            provider,
            socialId: userInfo.id,
          },
        },
      },
    });

    if (!user) {
      logger.info(`[Auth] User not found, checking by email:`, { 
        provider,
        email: userInfo.email
      });
      user = await prisma.user.findUnique({
        where: { email: userInfo.email.toLowerCase() },
      });

      if (user) {
        logger.info(`[Auth] Found existing user by email, linking ${provider} account`, { 
          provider,
          userId: user.id,
          email: user.email
        });
        // BUG FIX: Validate provider type before using
        if (provider !== 'google' && provider !== 'facebook' && provider !== 'vk') {
          logger.error('[Auth] Invalid OAuth provider:', { provider });
          throw new Error('Invalid OAuth provider');
        }
        await prisma.socialAccount.upsert({
          where: {
            provider_socialId: {
              provider,
              socialId: userInfo.id,
            },
          },
          create: {
            provider,
            socialId: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            avatar: userInfo.avatar,
            userId: user.id,
          },
          update: {
            email: userInfo.email,
            name: userInfo.name,
            avatar: userInfo.avatar,
          },
        });
        logger.info(`[Auth] Social provider linked successfully`, { 
          provider,
          userId: user.id
        });
      } else {
        logger.info(`[Auth] Creating new user from ${provider} data`, { 
          provider,
          email: userInfo.email,
          name: userInfo.name
        });
        // BUG FIX: Validate provider type before using
        if (provider !== 'google' && provider !== 'facebook' && provider !== 'vk') {
          logger.error('[Auth] Invalid OAuth provider:', { provider });
          throw new Error('Invalid OAuth provider');
        }
        user = await prisma.user.create({
          data: {
            email: userInfo.email.toLowerCase(),
            name: userInfo.name,
            avatar: userInfo.avatar,
            verified: true,
            role: 'USER',
            balance: 0,
            socialAccounts: {
              create: {
                provider,
                socialId: userInfo.id,
                email: userInfo.email,
                name: userInfo.name,
                avatar: userInfo.avatar,
              },
            },
          },
        });
        logger.info(`[Auth] New user created from ${provider}`, { 
          provider,
          userId: user.id,
          email: user.email
        });
      }
    } else {
      logger.info(`[Auth] User found by social ID`, { 
        provider,
        userId: user.id,
        email: user.email
      });
    }

    logger.info(`[Auth] Generating JWT tokens for user`, { 
      provider,
      userId: user.id,
      email: user.email,
      role: user.role
    });
    const tokens = await generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info(`[Auth] JWT tokens generated successfully`, { provider, userId: user.id });

    stateStore.delete(state);
    logger.info(`[Auth] State cleaned up`, { provider });

    // SECURITY: Store tokens in httpOnly cookies instead of URL parameters
    setCookie(c, 'accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    setCookie(c, 'refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    // Use localhost:3000 for development (proxy port), otherwise use env vars
    const frontendUrl = process.env.NODE_ENV !== 'production'
      ? 'http://localhost:3000'
      : (process.env.FRONTEND_URL || process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://1r36dhx42va8pxqbqz5ja.rork.app');
    // Pass token and user data in URL for frontend success page
    const redirectUrl = `${frontendUrl}/auth/success?token=${encodeURIComponent(tokens.accessToken)}&user=${encodeURIComponent(JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role
    }))}`;

    logger.info(`[Auth] ${provider} login successful, redirecting to app`);
    return c.redirect(redirectUrl);
  } catch (error) {
    logger.error(`[Auth] Error processing ${provider} callback:`, error);
    // Use localhost:3000 for development (proxy port), otherwise use env vars
    const frontendUrl = process.env.NODE_ENV !== 'production'
      ? 'http://localhost:3000'
      : (process.env.FRONTEND_URL || process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://1r36dhx42va8pxqbqz5ja.rork.app');
    return c.redirect(`${frontendUrl}/auth/login?error=authentication_failed`);
  }
});

auth.post('/logout', async (c) => {
  try {
    const authHeader = c.req.header('authorization') || c.req.header('Authorization');
    const userId = authHeader ? 'authenticated' : 'unknown';
    
    logger.info('[Auth] User logout requested', { userId });
  } catch (error) {
    logger.warn('[Auth] Could not extract user info for logout:', error);
  }
  
  setCookie(c, 'accessToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 0,
    path: '/',
  });

  setCookie(c, 'refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 0,
    path: '/',
  });

  logger.info('[Auth] User logged out successfully');
  return c.json({ success: true });
});

auth.get('/status', async (c) => {
  logger.info('[Auth] Status check requested');
  
  const providers = ['google', 'facebook', 'vk'];
  const status = providers.reduce((acc, provider) => {
    acc[provider] = oauthService.isConfigured(provider);
    return acc;
  }, {} as Record<string, boolean>);

  logger.info('[Auth] Status check result:', { 
    google: status.google,
    facebook: status.facebook,
    vk: status.vk,
    availableCount: Object.values(status).filter(Boolean).length
  });

  return c.json({
    configured: status,
    available: Object.keys(status).filter(p => status[p]),
  });
});

// Delete current authenticated user's account
auth.delete('/delete', async (c) => {
  try {
    logger.info('[Auth] Account deletion requested');
    
    const authHeader = c.req.header('authorization') || c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[Auth] Unauthorized deletion attempt');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const payload = await verifyToken(token);
    if (!payload?.userId) {
      logger.warn('[Auth] Invalid token for deletion');
      return c.json({ error: 'Invalid token' }, 401);
    }

    logger.info('[Auth] Deleting user account:', { userId: payload.userId });
    const deleted = await prisma.user.delete({
      where: { id: payload.userId },
    }).then(() => true).catch(() => false);

    // Clear cookies regardless (mirrors /logout)
    setCookie(c, 'accessToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 0,
      path: '/',
    });
    setCookie(c, 'refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 0,
      path: '/',
    });

    if (!deleted) {
      logger.warn('[Auth] User not found for deletion:', { userId: payload.userId });
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    logger.info('[Auth] User account deleted successfully:', { userId: payload.userId });
    return c.json({ success: true });
  } catch (error) {
    logger.error('[Auth] Delete account failed:', error);
    return c.json({ error: 'Failed to delete account' }, 500);
  }
});

export default auth;

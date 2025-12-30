import { logger } from '../utils/logger';

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
}

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

class OAuthService {
  private configs: Record<string, OAuthConfig> = {};

  constructor() {
    this.initializeConfigs();
  }

  private initializeConfigs() {
    // In development, always use localhost:3000 (proxy port)
    const frontendUrl = process.env.NODE_ENV !== 'production'
      ? 'http://localhost:3000'
      : (process.env.FRONTEND_URL || process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://1r36dhx42va8pxqbqz5ja.rork.app');
    logger.info('[OAuth] Frontend URL:', frontendUrl);

    this.configs.google = {
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || '',
      redirectUri: `${frontendUrl}/api/auth/google/callback`,
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scope: 'openid email profile',
    };

    this.configs.facebook = {
      clientId: process.env.FACEBOOK_APP_ID || process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || '',
      clientSecret: process.env.FACEBOOK_APP_SECRET || process.env.EXPO_PUBLIC_FACEBOOK_APP_SECRET || '',
      redirectUri: `${frontendUrl}/api/auth/facebook/callback`,
      authorizationUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
      userInfoUrl: 'https://graph.facebook.com/me',
      scope: 'email,public_profile',
    };

    this.configs.vk = {
      clientId: process.env.VK_CLIENT_ID || process.env.EXPO_PUBLIC_VK_CLIENT_ID || '',
      clientSecret: process.env.VK_CLIENT_SECRET || process.env.EXPO_PUBLIC_VK_CLIENT_SECRET || '',
      redirectUri: `${frontendUrl}/api/auth/vk/callback`,
      authorizationUrl: 'https://oauth.vk.com/authorize',
      tokenUrl: 'https://oauth.vk.com/access_token',
      userInfoUrl: 'https://api.vk.com/method/users.get',
      scope: 'email',
    };
  }

  getAuthorizationUrl(provider: string, state: string): string {
    logger.info('[OAuth] Generating authorization URL', { provider });

    const config = this.configs[provider];
    if (!config) {
      logger.error('[OAuth] Unknown provider requested:', { provider });
      throw new Error(`Unknown OAuth provider: ${provider}`);
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope,
      state,
    });

    if (provider === 'google') {
      params.append('access_type', 'offline');
      params.append('prompt', 'consent');
      logger.debug('[OAuth] Added Google-specific params');
    }

    if (provider === 'vk') {
      params.append('v', '5.131');
      params.append('display', 'page');
      logger.debug('[OAuth] Added VK-specific params');
    }

    const authUrl = `${config.authorizationUrl}?${params.toString()}`;
    logger.info('[OAuth] Authorization URL generated', {
      provider,
      urlLength: authUrl.length,
    });

    return authUrl;
  }

  async exchangeCodeForToken(provider: string, code: string): Promise<OAuthTokenResponse> {
    logger.info('[OAuth] Starting token exchange', { provider });

    const config = this.configs[provider];
    if (!config) {
      logger.error('[OAuth] Unknown provider for token exchange:', { provider });
      throw new Error(`Unknown OAuth provider: ${provider}`);
    }

    logger.info(`[OAuth] Exchanging code for token with ${provider}`, {
      provider,
      codeLength: code.length,
    });

    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    });

    try {
      logger.info('[OAuth] Sending token exchange request', {
        provider,
        tokenUrl: config.tokenUrl,
      });

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[OAuth] Token exchange failed for ${provider}:`, {
          provider,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const data = await response.json() as any;
      logger.info(`[OAuth] Successfully exchanged code for token with ${provider}`, {
        provider,
        hasAccessToken: !!data.access_token,
        hasRefreshToken: !!data.refresh_token,
        expiresIn: data.expires_in,
      });
      return data as OAuthTokenResponse;
    } catch (error) {
      logger.error(`[OAuth] Error exchanging code for token with ${provider}:`, error);
      throw error;
    }
  }

  async getUserInfo(provider: string, accessToken: string, tokenResponse?: OAuthTokenResponse): Promise<OAuthUserInfo> {
    logger.info('[OAuth] Starting user info fetch', { provider });

    const config = this.configs[provider];
    if (!config) {
      logger.error('[OAuth] Unknown provider for user info:', { provider });
      throw new Error(`Unknown OAuth provider: ${provider}`);
    }

    logger.info(`[OAuth] Fetching user info from ${provider}`, {
      provider,
      tokenLength: accessToken.length,
    });

    try {
      let url = config.userInfoUrl;
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      };

      if (provider === 'facebook') {
        url = `${config.userInfoUrl}?fields=id,name,email,picture&access_token=${accessToken}`;
        delete headers.Authorization;
      }

      if (provider === 'vk') {
        url = `${config.userInfoUrl}?access_token=${accessToken}&v=5.131&fields=photo_200`;
        delete headers.Authorization;
      }

      logger.info('[OAuth] Sending user info request', {
        provider,
        url,
      });

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[OAuth] User info fetch failed for ${provider}:`, {
          provider,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Failed to fetch user info: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info(`[OAuth] Successfully fetched user info from ${provider}`, { provider });

      const normalizedInfo = this.normalizeUserInfo(provider, data, tokenResponse);
      logger.info('[OAuth] User info normalized', {
        provider,
        userId: normalizedInfo.id,
        email: normalizedInfo.email,
        hasAvatar: !!normalizedInfo.avatar,
      });

      return normalizedInfo;
    } catch (error) {
      logger.error(`[OAuth] Error fetching user info from ${provider}:`, error);
      throw error;
    }
  }

  private normalizeUserInfo(provider: string, data: any, tokenResponse?: OAuthTokenResponse): OAuthUserInfo {
    logger.debug('[OAuth] Normalizing user info', { provider });

    switch (provider) {
      case 'google':
        logger.debug('[OAuth] Normalizing Google user data');
        return {
          id: data.id,
          email: data.email,
          name: data.name,
          avatar: data.picture,
        };

      case 'facebook':
        logger.debug('[OAuth] Normalizing Facebook user data', {
          hasEmail: !!data.email,
        });
        return {
          id: data.id,
          email: data.email || `fb_${data.id}@facebook.placeholder`,
          name: data.name,
          avatar: data.picture?.data?.url,
        };

      case 'vk':
        logger.debug('[OAuth] Normalizing VK user data');
        const user = data.response?.[0];
        // VK email handling with proper typing
        interface VKTokenResponse {
          email?: string;
        }
        interface VKUserData {
          email?: string;
        }
        const vkEmail =
          (tokenResponse as VKTokenResponse)?.email ||
          (data as VKUserData)?.email ||
          `vk_${user?.id}@vk.placeholder`;

        logger.debug('[OAuth] VK email resolved:', {
          hasTokenEmail: !!(tokenResponse as VKTokenResponse)?.email,
          hasDataEmail: !!(data as VKUserData)?.email,
          usingPlaceholder: vkEmail.includes('@vk.placeholder'),
        });

        return {
          id: user?.id?.toString() || '',
          email: vkEmail,
          name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
          avatar: user?.photo_200,
        };

      default:
        logger.error('[OAuth] Unknown provider in normalizeUserInfo:', { provider });
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  isConfigured(provider: string): boolean {
    const config = this.configs[provider];
    if (!config) {
      logger.debug('[OAuth] Config check: provider not found', { provider });
      return false;
    }

    const isConfigured = !!(
      config.clientId &&
      config.clientSecret &&
      !config.clientId.includes('your-') &&
      !config.clientSecret.includes('your-')
    );

    logger.debug('[OAuth] Config check:', {
      provider,
      isConfigured,
      hasClientId: !!config.clientId,
      hasClientSecret: !!config.clientSecret,
    });

    return isConfigured;
  }

  getAllConfiguredProviders(): string[] {
    const configured = Object.keys(this.configs).filter(provider => this.isConfigured(provider));
    logger.info('[OAuth] Getting all configured providers:', {
      total: Object.keys(this.configs).length,
      configured: configured.length,
      providers: configured,
    });
    return configured;
  }
}

export const oauthService = new OAuthService();

import { Platform, Alert, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { logger } from '@/utils/logger';
export interface SocialAuthResult {
  success: boolean;
  token?: string;
  user?: Record<string, unknown>;
  error?: string;
}

export interface SocialAuthConfig {
  google: boolean;
  facebook: boolean;
  vk: boolean;
}

// A robust function to get the API base URL, respecting environment variables.
function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL ||
                 process.env.EXPO_PUBLIC_BACKEND_URL ||
                 process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) {
    logger.debug(`[getApiBaseUrl] Using base URL from environment: ${envUrl}`);
    return envUrl;
  }

  // ✅ In development, always use localhost:3000 for backend
  if (__DEV__ || process.env.NODE_ENV === 'development') {
    const devUrl = 'http://localhost:3000';
    logger.debug(`[getApiBaseUrl] Using development backend URL: ${devUrl}`);
    return devUrl;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    logger.debug(`[getApiBaseUrl] Using base URL from window.location.origin: ${window.location.origin}`);
    return window.location.origin;
  }

  // Fallback for native development or when other methods fail
  const fallbackUrl = 'http://localhost:3000';
  logger.debug(`[getApiBaseUrl] Using fallback base URL: ${fallbackUrl}`);
  return fallbackUrl;
}

export async function checkSocialAuthStatus(): Promise<SocialAuthConfig> {
  logger.info('[SocialAuth] Checking social auth status');

  try {
    const baseUrl = getApiBaseUrl();

    logger.info('[SocialAuth] Fetching status from:', `${baseUrl}/api/auth/status`);
    const response = await fetch(`${baseUrl}/api/auth/status`);

    if (!response.ok) {
      logger.warn('[SocialAuth] Failed to check auth status:', {
        status: response.status,
        statusText: response.statusText,
      });
      return { google: false, facebook: false, vk: false };
    }

    const data = await response.json();
    const config = data.configured || { google: false, facebook: false, vk: false };

    logger.info('[SocialAuth] Auth status retrieved:', {
      google: config.google,
      facebook: config.facebook,
      vk: config.vk,
    });

    return config;
  } catch (error) {
    logger.error('[SocialAuth] Error checking auth status:', error);
    return { google: false, facebook: false, vk: false };
  }
}

export async function initiateSocialLogin(
  provider: 'google' | 'facebook' | 'vk',
  onSuccess: (result: SocialAuthResult) => void,
  onError: (error: string) => void,
): Promise<void> {
  logger.info(`[SocialAuth] Initiating ${provider} login`, {
    provider,
    platform: Platform.OS,
  });

  try {
    const baseUrl = getApiBaseUrl();
    const authUrl = `${baseUrl}/api/auth/${provider}/login`;

    logger.info('[SocialAuth] Opening auth URL:', { provider, authUrl });

    if (Platform.OS === 'web') {
      logger.info(`[SocialAuth] Redirecting to ${provider} (web)`);
      window.location.href = authUrl;
    } else {
      logger.info('[SocialAuth] Opening auth session (mobile)', { provider });
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        `${baseUrl}/auth/success`,
      );

      logger.info('[SocialAuth] Auth session result:', {
        provider,
        type: result.type,
        hasUrl: 'url' in result,
      });

      if (result.type === 'success' && 'url' in result) {
        logger.info('[SocialAuth] Auth session successful', { provider });

        const url = new URL(result.url);
        const token = url.searchParams.get('token');
        const userData = url.searchParams.get('user');

        if (token && userData) {
          logger.info('[SocialAuth] Retrieved token and user data', { provider });

          let user;
          try {
            user = JSON.parse(userData);
            logger.info('[SocialAuth] User data parsed successfully:', {
              provider,
              userId: user.id,
              email: user.email,
            });
          } catch (error) {
            logger.error('[SocialAuth] Failed to parse user data:', { provider, error });
            onError?.('Invalid user data received');
            return;
          }

          logger.info(`[SocialAuth] Login successful via ${provider}`, {
            userId: user.id,
            email: user.email,
          });

          onSuccess({
            success: true,
            token,
            user,
          });
        } else {
          logger.error('[SocialAuth] Missing token or user data', {
            provider,
            hasToken: !!token,
            hasUserData: !!userData,
          });
          onError('Failed to retrieve authentication data');
        }
      } else if (result.type === 'cancel') {
        logger.info(`[SocialAuth] User cancelled ${provider} OAuth flow`);
        onError('Login cancelled');
      } else {
        logger.error('[SocialAuth] Auth session failed:', {
          provider,
          type: result.type,
        });
        onError('Login failed');
      }
    }
  } catch (error) {
    logger.error(`[SocialAuth] ${provider} login error:`, error);
    onError(`Failed to login with ${provider}. Please try again.`);
  }
}

export function showSocialLoginError(provider: string, error: string): void {
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

  logger.warn(`[SocialAuth] Showing error alert for ${provider}:`, { error });

  Alert.alert(
    `${providerName} Login Failed`,
    error || `Failed to login with ${providerName}. Please try again or use a different method.`,
    [{
      text: 'OK',
      onPress: () => {
        logger.info(`[SocialAuth] User dismissed error alert for ${provider}`);
      },
    }],
  );
}

export function getSocialLoginButtonConfig(provider: 'google' | 'facebook' | 'vk') {
  const configs = {
    google: {
      name: 'Google',
      color: '#DB4437',
      icon: 'Chrome',
    },
    facebook: {
      name: 'Facebook',
      color: '#1877F2',
      icon: 'Facebook',
    },
    vk: {
      name: 'VK',
      color: '#0077FF',
      icon: 'MessageCircle',
    },
  };

  logger.debug(`[SocialAuth] Getting button config for ${provider}`);
  return configs[provider];
}

export async function openSocialAuthSetupGuide(): Promise<void> {
  const guideUrl = 'https://github.com/yourusername/yourrepo/blob/main/SOCIAL_LOGIN_SETUP.md';

  try {
    const canOpen = await Linking.canOpenURL(guideUrl);
    if (canOpen) {
      await Linking.openURL(guideUrl);
    } else {
      Alert.alert(
        'Setup Guide',
        'Please check SOCIAL_LOGIN_SETUP.md in the project root for detailed setup instructions.',
        [{ text: 'OK' }],
      );
    }
  } catch (error) {
    logger.error('[SocialAuth] Error opening setup guide:', error);
  }
}

import config from '@/constants/config';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '@/utils/logger';
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  verified: boolean;
  createdAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

class AuthService {
  private googleClientId: string;
  private facebookAppId: string;
  private currentUser: AuthUser | null = null;
  private tokens: AuthTokens | null = null;

  constructor() {
    this.googleClientId = config.GOOGLE_CLIENT_ID as string;
    this.facebookAppId = config.FACEBOOK_APP_ID as string;
  }

  async initialize(): Promise<void> {
    try {
      const storedTokens = await AsyncStorage.getItem('auth_tokens');
      const storedUser = await AsyncStorage.getItem('auth_user');

      if (storedTokens && storedUser) {
        try {
          this.tokens = JSON.parse(storedTokens);
          this.currentUser = JSON.parse(storedUser);
        } catch {
          // Invalid stored data, logout
          await this.logout();
        }

        if (this.tokens && new Date() > new Date(this.tokens.expiresAt)) {
          await this.refreshAccessToken();
        }
      }
    } catch (error) {
      logger.error('Failed to initialize auth service:', error);
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthUser> {
    try {
      const response = await fetch(`${config.BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      await this.setAuthData(data.user, data.tokens);

      return data.user;
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  async register(userData: RegisterData): Promise<AuthUser> {
    try {
      const response = await fetch(`${config.BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();
      await this.setAuthData(data.user, data.tokens);

      return data.user;
    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  async loginWithSocial(provider: 'google' | 'facebook' | 'vk'): Promise<AuthUser> {
    try {
      logger.debug(`[AuthService] Initiating ${provider} login`);

      const baseUrl = config.BASE_URL?.replace('/api', '') || 'http://localhost:8081';
      const authUrl = `${baseUrl}/api/auth/${provider}/login`;

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.location) {
          window.location.href = authUrl;
        }
        throw new Error('Redirecting to OAuth provider...');
      } else {
        const WebBrowser = await import('expo-web-browser');
        const result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          `${baseUrl}/auth/success`,
        );

        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const token = url.searchParams.get('token');
          const userData = url.searchParams.get('user');

          if (token && userData) {
            try {
              const user = JSON.parse(userData);
              const tokens = {
                accessToken: token,
                refreshToken: token,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              };

              await this.setAuthData(user, tokens);
              return user;
            } catch {
              // Invalid user data, will throw error below
            }
          }
        }

        throw new Error('OAuth flow was cancelled or failed');
      }
    } catch (error) {
      logger.error(`[AuthService] ${provider} login failed:`, error);
      throw error;
    }
  }

  async loginWithGoogle(): Promise<AuthUser> {
    return this.loginWithSocial('google');
  }

  async loginWithFacebook(): Promise<AuthUser> {
    return this.loginWithSocial('facebook');
  }

  async loginWithVK(): Promise<AuthUser> {
    return this.loginWithSocial('vk');
  }

  async logout(): Promise<void> {
    try {
      if (this.tokens) {
        await fetch(`${config.BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.tokens.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      logger.error('Logout request failed:', error);
    } finally {
      await this.clearAuthData();
    }
  }

  async deleteAccount(): Promise<void> {
    // ✅ Validate authentication
    if (!this.tokens?.accessToken) {
      logger.error('[deleteAccount] Not authenticated');
      throw new Error('Not authenticated');
    }

    // ✅ Validate current user
    if (!this.currentUser || !this.currentUser.id) {
      logger.error('[deleteAccount] No current user');
      throw new Error('No user data available');
    }

    logger.debug('[deleteAccount] Starting account deletion for user:', this.currentUser.id);

    try {
      // ✅ Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(`${config.BASE_URL}/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // ✅ Better error handling
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        logger.error('[deleteAccount] Server error:', errorData);
        throw new Error(errorData.message || 'Failed to delete account');
      }

      logger.debug('[deleteAccount] Account deleted successfully');
    } catch (error) {
      // ✅ Differentiate between network and server errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          logger.error('[deleteAccount] Request timeout');
          throw new Error('Request timeout - please try again');
        }
        logger.error('[deleteAccount] Delete account request failed:', error.message);
      }
      throw error;
    } finally {
      logger.debug('[deleteAccount] Clearing auth data');
      await this.clearAuthData();
    }
  }

  async refreshAccessToken(): Promise<void> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${config.BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.tokens.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.tokens = data.tokens;
      await AsyncStorage.setItem('auth_tokens', JSON.stringify(this.tokens));
    } catch (error) {
      logger.error('Token refresh failed:', error);
      await this.clearAuthData();
      throw error;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      const response = await fetch(`${config.BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send reset email');
      }
    } catch (error) {
      logger.error('Forgot password failed:', error);
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const response = await fetch(`${config.BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password reset failed');
      }
    } catch (error) {
      logger.error('Password reset failed:', error);
      throw error;
    }
  }

  private async setAuthData(user: AuthUser, tokens: AuthTokens): Promise<void> {
    this.currentUser = user;
    this.tokens = tokens;

    await AsyncStorage.setItem('auth_user', JSON.stringify(user));
    await AsyncStorage.setItem('auth_tokens', JSON.stringify(tokens));
  }

  private async clearAuthData(): Promise<void> {
    this.currentUser = null;
    this.tokens = null;

    await AsyncStorage.removeItem('auth_user');
    await AsyncStorage.removeItem('auth_tokens');
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  getAccessToken(): string | null {
    return this.tokens?.accessToken || null;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && this.tokens !== null;
  }

  isConfigured(): boolean {
    return !this.googleClientId.includes('your-') && !this.facebookAppId.includes('your-');
  }
}

export const authService = new AuthService();

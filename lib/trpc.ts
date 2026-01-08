import { createTRPCReact } from '@trpc/react-query';
import { httpLink, loggerLink } from '@trpc/client';
// Adjust the import path if backend alias differs in production
import type { AppRouter } from '@/backend/trpc/app-router';
import superjson from 'superjson';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const trpc = createTRPCReact<AppRouter>();

const stripTrailingSlash = (u: string) => u.replace(/\/+$/, '');

export const getBaseUrl = () => {
  // Prefer explicit env vars (any of these will work)
  const fromEnv =
    process.env.EXPO_PUBLIC_RORK_API_BASE_URL ||
    // common alternatives if someone renamed the var
    (process.env as any).EXPO_PUBLIC_API_BASE_URL ||
    (process.env as any).EXPO_PUBLIC_BACKEND_URL ||
    (process.env as any).EXPO_PUBLIC_BASE_URL;

  if (fromEnv && typeof fromEnv === 'string') {
    return stripTrailingSlash(fromEnv);
  }

  // ✅ In development, always use localhost:3000 for backend API
  if (__DEV__ || process.env.NODE_ENV === 'development') {
    console.log('[tRPC] Using backend API at http://localhost:3000');
    return 'http://localhost:3000';
  }

  // On web production, default to same-origin base (works with Nginx proxying /api)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return stripTrailingSlash(window.location.origin);
  }

  // Final safety: use relative path (same-origin). Avoid throwing to prevent white screens.
  console.warn('No base url env found; defaulting to same-origin relative path for /api');
  return '';
};

// Cache for auth headers to avoid repeated AsyncStorage reads
let cachedAuthHeader: Record<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5000; // 5 seconds

export const trpcClient = trpc.createClient({
  links: [
    ...(process.env.NODE_ENV === 'development'
      ? [loggerLink({ enabled: () => false })]
      : []),
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      async headers() {
        try {
          const now = Date.now();
          if (cachedAuthHeader && (now - cacheTimestamp) < CACHE_DURATION) {
            return cachedAuthHeader;
          }
          const raw = await AsyncStorage.getItem('auth_tokens');
          if (!raw) {
            cachedAuthHeader = {};
            cacheTimestamp = now;
            return {};
          }
          let tokens: any;
          try {
            tokens = JSON.parse(raw);
          } catch {
            cachedAuthHeader = {};
            cacheTimestamp = now;
            return {};
          }
          if (tokens?.accessToken) {
            cachedAuthHeader = { Authorization: `Bearer ${tokens.accessToken}` };
            cacheTimestamp = now;
            return cachedAuthHeader;
          }
        } catch {
          // swallow errors
        }
        cachedAuthHeader = {};
        cacheTimestamp = Date.now();
        return {};
      },
    }),
  ],
});

// If using React Query config elsewhere, configure via trpc.Provider's queryClient instead.

// Export function to clear auth cache when needed
export const clearAuthCache = () => {
  cachedAuthHeader = null;
  cacheTimestamp = 0;
};

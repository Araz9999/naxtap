import { createTRPCReact } from '@trpc/react-query';
import { httpLink, loggerLink, splitLink } from '@trpc/client';
import type { AppRouter } from '../../naxtap-backend/trpc/app-router';
import superjson from 'superjson';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const trpc = createTRPCReact<AppRouter>();

const stripTrailingSlash = (u: string) => u.replace(/\/+$/, '');
const stripTrpcAndApiSuffix = (u: string) =>
  stripTrailingSlash(u).replace(/\/api\/trpc$/i, '').replace(/\/api$/i, '');

export const getBaseUrl = () => {
  // Explicit full tRPC URL support (e.g. https://example.com/api/trpc)
  const trpcFromEnv =
    process.env.EXPO_PUBLIC_TRPC_URL ||
    (process.env as any).EXPO_PUBLIC_TRPC_ENDPOINT;
  if (trpcFromEnv && typeof trpcFromEnv === 'string') {
    return stripTrpcAndApiSuffix(trpcFromEnv);
  }

  // Prefer explicit env vars (any of these will work)
  const fromEnv =
    process.env.EXPO_PUBLIC_RORK_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    // common alternatives if someone renamed the var
    (process.env as any).EXPO_PUBLIC_API_BASE_URL ||
    (process.env as any).EXPO_PUBLIC_BACKEND_URL ||
    (process.env as any).EXPO_PUBLIC_BASE_URL;

  if (fromEnv && typeof fromEnv === 'string') {
    return stripTrpcAndApiSuffix(fromEnv);
  }

  // In development: use EXPO_PUBLIC_BACKEND_URL for device/emulator (e.g. http://192.168.1.5:3000)
  if (__DEV__ || process.env.NODE_ENV === 'development') {
    const devUrl =
      (process.env as any).EXPO_PUBLIC_BACKEND_URL ||
      (process.env as any).EXPO_PUBLIC_API_BASE_URL ||
      'http://localhost:3000';
    if (devUrl === 'http://localhost:3000') {
      console.warn(
        '[tRPC] Using localhost:3000. On device/emulator set EXPO_PUBLIC_BACKEND_URL to your machine IP (e.g. http://192.168.1.5:3000)'
      );
    }
    return stripTrailingSlash(devUrl);
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

const getTrpcUrl = () => {
  const explicitTrpc =
    process.env.EXPO_PUBLIC_TRPC_URL ||
    (process.env as any).EXPO_PUBLIC_TRPC_ENDPOINT;
  if (explicitTrpc && typeof explicitTrpc === 'string') {
    return stripTrailingSlash(explicitTrpc);
  }
  const base = getBaseUrl();
  return base ? `${base}/api/trpc` : '/api/trpc';
};

const apiBaseUrl = getTrpcUrl();
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('[tRPC] API base URL:', apiBaseUrl || '(empty - same-origin)');
}

function fetchWithDeadline(ms: number) {
  return function boundedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    return fetch(input, {
      ...init,
      signal: ctrl.signal,
    }).finally(() => clearTimeout(id));
  };
}

const fetchDefault = fetchWithDeadline(30_000);
const fetchListingCreate = fetchWithDeadline(120_000);

async function trpcHeaders(): Promise<Record<string, string>> {
  try {
    const now = Date.now();
    if (cachedAuthHeader && now - cacheTimestamp < CACHE_DURATION) {
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
}

const sharedHttp = {
  url: apiBaseUrl,
  transformer: superjson,
  headers: trpcHeaders,
} as const;

export const trpcClient = trpc.createClient({
  links: [
    ...(process.env.NODE_ENV === 'development'
      ? [loggerLink({ enabled: () => false })]
      : []),
    splitLink({
      condition(op) {
        return op.type === 'mutation' && op.path === 'listing.create';
      },
      true: httpLink({ ...sharedHttp, fetch: fetchListingCreate }),
      false: httpLink({ ...sharedHttp, fetch: fetchDefault }),
    }),
  ],
});

// If using React Query config elsewhere, configure via trpc.Provider's queryClient instead.

// Export function to clear auth cache when needed
export const clearAuthCache = () => {
  cachedAuthHeader = null;
  cacheTimestamp = 0;
};

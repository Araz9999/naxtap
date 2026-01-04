import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useThemeStore } from '@/store/themeStore';
import { useRatingStore } from '@/store/ratingStore';
import { useCallStore } from '@/store/callStore';
import { useUserStore } from '@/store/userStore';
import { useListingStore, initListingStoreInterval, cleanupListingStoreInterval } from '@/store/listingStore';
import { useStoreStore, initStoreStoreInterval, cleanupStoreStoreInterval } from '@/store/storeStore';
import { getColors } from '@/constants/colors';
import IncomingCallModal from '@/components/IncomingCallModal';
import { LanguageProvider } from '@/store/languageStore';
import ErrorBoundary from '@/components/ErrorBoundary';

import { initializeServices } from '@/services';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from '@/lib/trpc';
import { realtimeService } from '@/lib/realtime';
import config from '@/constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '@/utils/logger';
export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create QueryClient with optimized defaults outside component to avoid recreating
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

export default function RootLayout() {
  // Skip font loading - use system fonts for better performance
  useFonts({});
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Mark app as ready immediately
    setAppReady(true);
    SplashScreen.hideAsync();
  }, []);

  if (!appReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <RootLayoutNav />
          </LanguageProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}

function RootLayoutNav() {
  const { themeMode, colorTheme } = useThemeStore();
  const { loadRatings } = useRatingStore();
  const { initializeSounds, pollIncomingCalls, initializeRealtimeListeners, setSelfUserId } = useCallStore();
  const { currentUser } = useUserStore();
  const { fetchListings } = useListingStore();
  const { fetchStores, fetchUserStore } = useStoreStore();

  // Memoize colors to prevent recalculation
  const colors = useMemo(() => getColors(themeMode, colorTheme), [themeMode, colorTheme]);

  // Initialize application data on startup
  useEffect(() => {
    const initializeAppData = async () => {
      try {
        logger.info('[App] Initializing application data...');

        // Load all listings
        await fetchListings();
        logger.info('[App] Listings loaded successfully');

        // Load all stores
        await fetchStores();
        logger.info('[App] Stores loaded successfully');

        // Load user's store if authenticated
        if (currentUser) {
          await fetchUserStore(currentUser.id);
          logger.info('[App] User store loaded successfully');
        }

        logger.info('[App] Application data initialized successfully');
      } catch (error) {
        logger.error('[App] Failed to initialize application data:', error);
      }
    };

    initializeAppData();
  }, [fetchListings, fetchStores, fetchUserStore, currentUser]);

  // Load ratings on app start (only once)
  useEffect(() => {
    loadRatings().catch((error) => {
      if (__DEV__) logger.error('Failed to load ratings:', error);
    });
  }, [loadRatings]);

  // Initialize call sounds (delayed for better startup performance)
  useEffect(() => {
    const timer = setTimeout(() => {
      initializeSounds().catch((error) => {
        if (__DEV__) logger.error('Failed to initialize sounds:', error);
      });
    }, 2000); // Increased delay for better startup

    return () => clearTimeout(timer);
  }, [initializeSounds]);

  // Poll backend for incoming calls (simple in-memory invite flow)
  useEffect(() => {
    if (!currentUser?.id) return;
    const interval = setInterval(() => {
      pollIncomingCalls(currentUser.id).catch(() => undefined);
    }, 2000);
    return () => clearInterval(interval);
  }, [currentUser?.id, pollIncomingCalls]);

  // Initialize services (only once)
  useEffect(() => {
    initializeServices().catch((error) => {
      if (__DEV__) logger.error('Failed to initialize services:', error);
    });
  }, []);

  // Initialize WebSocket/Realtime connection
  useEffect(() => {
    const backendUrl = config.BACKEND_URL || 'http://localhost:3000';

    logger.info('[App] Initializing realtime service:', backendUrl);

    realtimeService.initialize({
      url: backendUrl,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    }).catch((error) => {
      logger.warn('[App] Realtime service initialization failed (will use polling):', error);
    });

    // Setup global realtime event listeners
    if (currentUser?.id) {
      // Join user's personal room
      realtimeService.joinRoom(`user:${currentUser.id}`);

      logger.info('[App] Joined user room:', currentUser.id);
    }

    return () => {
      realtimeService.disconnect();
    };
  }, []);

  // Authenticate realtime socket and initialize call listeners when user is available
  useEffect(() => {
    setSelfUserId(currentUser?.id ?? null);

    // Initialize call event listeners (no-op if realtime not available)
    initializeRealtimeListeners();

    if (!currentUser?.id) return;

    let disposed = false;

    const authenticate = async () => {
      try {
        const raw = await AsyncStorage.getItem('auth_tokens');
        const token = raw ? JSON.parse(raw)?.accessToken : undefined;
        if (!token || typeof token !== 'string') return;
        if (disposed) return;

        realtimeService.send('authenticate', { userId: currentUser.id, token });
        // After authenticate, join personal room (server requires auth)
        realtimeService.joinRoom(`user:${currentUser.id}`);
      } catch (e) {
        logger.debug?.('[App] Realtime authenticate failed (will keep polling):', e);
      }
    };

    const onConnect = () => {
      authenticate().catch(() => undefined);
    };

    const onReconnect = () => {
      authenticate().catch(() => undefined);
    };

    realtimeService.on('connection', onConnect);
    realtimeService.on('reconnect', onReconnect as any);

    // Try immediately (in case already connected)
    authenticate().catch(() => undefined);

    return () => {
      disposed = true;
      realtimeService.off('connection', onConnect);
      realtimeService.off('reconnect', onReconnect as any);
    };
  }, [currentUser?.id, initializeRealtimeListeners, setSelfUserId]);

  // Local real-time managers (store availability + listing expiration checks)
  useEffect(() => {
    initListingStoreInterval();
    initStoreStoreInterval();

    return () => {
      cleanupListingStoreInterval();
      cleanupStoreStoreInterval();
    };
  }, []);

  return (
    <>
      <StatusBar style={themeMode === 'dark' || (themeMode === 'auto' && colors.background === '#111827') ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="listing/[id]"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="category"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="profile/[id]"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="profile/edit"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="auth/login"
          options={{
            title: '',
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="auth/register"
          options={{
            title: '',
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="create-listing"
          options={{
            title: '',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="about"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="wallet"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="favorites"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="stores"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="my-store"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="store/create"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="store/[id]"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="store/add-listing/[storeId]"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="store/promote/[id]"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="conversation/[id]"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="my-listings"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="store-management"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="store/edit/[id]"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="store/discounts/[id]"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="listing/promote/[id]"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="listing/edit/[id]"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="call/[id]"
          options={{
            title: '',
            presentation: 'fullScreenModal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="call-history"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="blocked-users"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="store-settings"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="store-analytics"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="store-theme"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="payment-history"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="store-reviews"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="auth/forgot-password"
          options={{
            title: '',
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="listing/auto-renewal/[id]"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="support"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="moderation"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="admin-reports"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="admin-tickets"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="admin-users"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="admin-moderators"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="admin-analytics"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="admin-moderation-settings"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="operator-dashboard"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="live-chat"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="terms"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="privacy"
          options={{
            title: '',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="auth/success"
          options={{
            title: '',
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
      <IncomingCallModal />
    </>
  );
}

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState, useMemo } from "react";
import { StatusBar } from 'expo-status-bar';
import { useThemeStore } from '@/store/themeStore';
import { useRatingStore } from '@/store/ratingStore';
import { useCallStore } from '@/store/callStore';
import { getColors } from '@/constants/colors';
import IncomingCallModal from '@/components/IncomingCallModal';
import { LanguageProvider } from '@/store/languageStore';
import ErrorBoundary from '@/components/ErrorBoundary';

import { initializeServices } from '@/services';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from '@/lib/trpc';

import { logger } from '@/utils/logger';
import React from "react";
export const unstable_settings = {
  initialRouteName: "(tabs)",
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
  const [loaded] = useFonts({});
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
  const { initializeSounds } = useCallStore();
  
  // Memoize colors to prevent recalculation
  const colors = useMemo(() => getColors(themeMode, colorTheme), [themeMode, colorTheme]);
  
  // Load ratings on app start (only once)
  useEffect(() => {
    loadRatings().catch((error) => {
      if (__DEV__) logger.error('Failed to load ratings:', error);
    });
  }, []); // Safe to ignore loadRatings dependency as it's stable
  
  // Initialize call sounds (delayed for better startup performance)
  useEffect(() => {
    const timer = setTimeout(() => {
      initializeSounds().catch((error) => {
        if (__DEV__) logger.error('Failed to initialize sounds:', error);
      });
    }, 2000); // Increased delay for better startup
    
    return () => clearTimeout(timer);
  }, []); // Safe to ignore initializeSounds dependency as it's stable
  
  // Initialize services (only once)
  useEffect(() => {
    initializeServices().catch((error) => {
      if (__DEV__) logger.error('Failed to initialize services:', error);
    });
  }, []);
  
  return (
    <>
      <StatusBar style={themeMode === 'dark' || (themeMode === 'auto' && colors.background === '#111827') ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
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
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="category" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="profile/[id]" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen
          name="profile/edit"
          options={{
            title: "",
            presentation: 'card',
          }}
        />
        <Stack.Screen 
          name="auth/login" 
          options={{ 
            title: "",
            presentation: 'modal',
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="auth/register" 
          options={{ 
            title: "",
            presentation: 'modal',
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="create-listing" 
          options={{ 
            title: "",
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="about" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="wallet" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="favorites" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="stores" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="my-store" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="store/create" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="store/[id]" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="store/add-listing/[storeId]" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="store/promote/[id]" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="conversation/[id]" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="settings" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="my-listings" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="store-management" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="store/edit/[id]" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="store/discounts/[id]" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="listing/promote/[id]" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="listing/edit/[id]" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="call/[id]" 
          options={{ 
            title: "",
            presentation: 'fullScreenModal',
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="call-history" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="blocked-users" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="notifications" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="store-settings" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="store-analytics" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="store-theme" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="payment-history" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="store-reviews" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="auth/forgot-password" 
          options={{ 
            title: "",
            presentation: 'modal',
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="listing/auto-renewal/[id]" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="support" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="moderation" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="admin-reports" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="admin-tickets" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="admin-users" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="admin-moderators" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="admin-analytics" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="admin-moderation-settings" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="operator-dashboard" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="live-chat" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="terms" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="privacy" 
          options={{ 
            title: "",
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="auth/success" 
          options={{ 
            title: "",
            presentation: 'modal',
            headerShown: false,
          }} 
        />
      </Stack>
      <IncomingCallModal />
    </>
  );
}

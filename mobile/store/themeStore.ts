import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform, Appearance } from 'react-native';

import { logger } from '@/utils/logger';
export type ThemeMode = 'light' | 'dark' | 'auto';
export type ColorTheme = 'default' | 'blue' | 'green' | 'purple' | 'orange' | 'red';
export type FontSize = 'small' | 'medium' | 'large';

interface ThemeState {
  themeMode: ThemeMode;
  colorTheme: ColorTheme;
  fontSize: FontSize;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoRefresh: boolean;
  showPriceInTitle: boolean;
  compactMode: boolean;
  animationEffectsEnabled: boolean;
  dynamicColorsEnabled: boolean;
  adaptiveInterfaceEnabled: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setColorTheme: (theme: ColorTheme) => void;
  setFontSize: (size: FontSize) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setVibrationEnabled: (enabled: boolean) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setShowPriceInTitle: (enabled: boolean) => void;
  setCompactMode: (enabled: boolean) => void;
  setAnimationEffectsEnabled: (enabled: boolean) => void;
  setDynamicColorsEnabled: (enabled: boolean) => void;
  setAdaptiveInterfaceEnabled: (enabled: boolean) => void;
  sendNotification: (title: string, body: string) => Promise<void>;
  playNotificationSound: () => Promise<void>;
  triggerVibration: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeMode: 'auto',
      colorTheme: 'default',
      fontSize: 'medium',
      notificationsEnabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      autoRefresh: true,
      showPriceInTitle: true,
      compactMode: false,
      animationEffectsEnabled: true,
      dynamicColorsEnabled: true,
      adaptiveInterfaceEnabled: true,
      setThemeMode: (mode) => {
        set({ themeMode: mode });
        // Apply system theme changes immediately
        if (mode === 'auto') {
          const colorScheme = Appearance.getColorScheme();
          logger.debug('Auto theme mode activated, system theme:', colorScheme);
        }
      },
      setColorTheme: (theme) => set({ colorTheme: theme }),
      setFontSize: (size) => set({ fontSize: size }),
      setNotificationsEnabled: async (enabled) => {
        set({ notificationsEnabled: enabled });
        if (enabled && Platform.OS !== 'web') {
          try {
            // Only try to import notifications if we're not on web
            const Notifications = await import('expo-notifications');
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
              logger.debug('Notification permissions not granted');
            }
          } catch (error) {
            logger.debug('Notifications not available:', error);
          }
        }
      },
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setVibrationEnabled: (enabled) => set({ vibrationEnabled: enabled }),
      setAutoRefresh: (enabled) => set({ autoRefresh: enabled }),
      setShowPriceInTitle: (enabled) => set({ showPriceInTitle: enabled }),
      setCompactMode: (enabled) => set({ compactMode: enabled }),
      setAnimationEffectsEnabled: (enabled) => {
        set({ animationEffectsEnabled: enabled });
        logger.debug('Animation effects:', enabled ? 'enabled' : 'disabled');
      },
      setDynamicColorsEnabled: (enabled) => {
        set({ dynamicColorsEnabled: enabled });
        logger.debug('Dynamic colors:', enabled ? 'enabled' : 'disabled');
      },
      setAdaptiveInterfaceEnabled: (enabled) => {
        set({ adaptiveInterfaceEnabled: enabled });
        logger.debug('Adaptive interface:', enabled ? 'enabled' : 'disabled');
      },
      sendNotification: async (title: string, body: string) => {
        // ✅ Validate inputs
        if (!title || !body) {
          logger.error('[ThemeStore] Invalid notification: title and body are required');
          return;
        }

        const state = get();
        if (!state.notificationsEnabled) {
          logger.debug('[ThemeStore] Notifications disabled, skipping');
          return;
        }

        if (Platform.OS !== 'web') {
          try {
            const Notifications = await import('expo-notifications');
            await Notifications.scheduleNotificationAsync({
              content: {
                title,
                body,
                sound: state.soundEnabled ? 'default' : undefined,
              },
              trigger: null,
            });
            logger.info('[ThemeStore] Notification sent:', title);

            if (state.vibrationEnabled) {
              try {
                const Haptics = await import('expo-haptics');
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                logger.debug('[ThemeStore] Haptic feedback played for notification');
              } catch (hapticsError) {
                logger.debug('[ThemeStore] Haptics not available:', hapticsError);
              }
            }
          } catch (error) {
            logger.error('[ThemeStore] Failed to send notification:', error);
          }
        } else {
          // Web fallback
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
              body,
              icon: window.location ? `${window.location.origin}/icon.png` : undefined,
            });
            logger.info('[ThemeStore] Web notification sent:', title);
          } else {
            logger.debug('[ThemeStore] Web notifications not available or permission not granted');
          }
        }
      },
      playNotificationSound: async () => {
        const state = get();
        if (!state.soundEnabled) return;

        if (Platform.OS !== 'web') {
          try {
            // ✅ Check vibration setting before haptic
            if (state.vibrationEnabled) {
              const Haptics = await import('expo-haptics');
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              logger.debug('Playing notification sound with haptic feedback');
            } else {
              logger.debug('Playing notification sound without haptic (disabled)');
            }
          } catch (error) {
            logger.debug('Failed to play notification sound:', error);
          }
        } else {
          // Web fallback - create audio context beep
          try {
            const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
            const Ctx = w.AudioContext || w.webkitAudioContext;
            if (!Ctx) throw new Error('No AudioContext available');
            const audioContext = new Ctx();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);

            logger.debug('Playing web notification sound');
          } catch (error) {
            logger.debug('Web audio not available:', error);
          }
        }
      },
      triggerVibration: async () => {
        const state = get();
        if (!state.vibrationEnabled) return;

        if (Platform.OS !== 'web') {
          try {
            const Haptics = await import('expo-haptics');
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch (error) {
            logger.debug('Vibration not available:', error);
          }
        }
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// Configure notifications
if (Platform.OS !== 'web') {
  (async () => {
    try {
      const Notifications = await import('expo-notifications');
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (error) {
      logger.debug('Notifications not available:', error);
    }
  })();
}

// Listen to system theme changes
if (Platform.OS !== 'web') {
  Appearance.addChangeListener(({ colorScheme }) => {
    const store = useThemeStore.getState();
    if (store.themeMode === 'auto') {
      logger.debug('System theme changed to:', colorScheme);
      // Force re-render by updating a dummy state
      store.setThemeMode('auto');
    }
  });
}

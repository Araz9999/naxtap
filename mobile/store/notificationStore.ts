import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native'; // ✅ Import Platform

export interface Notification {
  id: string;
  type: 'nudge' | 'message' | 'call' | 'general' | 'listing' | 'store';
  title: string;
  message: string;
  fromUserId?: string;
  fromUserName?: string;
  fromUserAvatar?: string;
  createdAt: string;
  isRead: boolean;
  // ✅ Enhanced data with navigation support
  data?: Record<string, unknown>;
  actionUrl?: string; // For navigation (e.g., '/messages/123', '/listing/456')
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAll: () => void;
  // ✅ Get navigation path from notification
  getNavigationPath: (notification: Notification) => string | null;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) => {
        // ===== VALIDATION START =====

        // 1. Type validation
        const validTypes = ['nudge', 'message', 'call', 'general', 'listing', 'store'];
        if (!notification.type || !validTypes.includes(notification.type)) {
          throw new Error('Bildiri\u015f n\u00f6v\u00fc etibars\u0131zd\u0131r');
        }

        // 2. Title validation
        if (!notification.title || typeof notification.title !== 'string' || notification.title.trim().length === 0) {
          throw new Error('Bildiri\u015f ba\u015fl\u0131\u011f\u0131 t\u0259l\u0259b olunur');
        }

        if (notification.title.trim().length > 100) {
          throw new Error('Ba\u015fl\u0131q maksimum 100 simvol ola bil\u0259r');
        }

        // 3. Message validation
        if (!notification.message || typeof notification.message !== 'string' || notification.message.trim().length === 0) {
          throw new Error('Bildiri\u015f mesaj\u0131 t\u0259l\u0259b olunur');
        }

        if (notification.message.trim().length > 500) {
          throw new Error('Mesaj maksimum 500 simvol ola bil\u0259r');
        }

        // 4. Optional fields validation
        if (notification.fromUserId !== undefined && typeof notification.fromUserId !== 'string') {
          throw new Error('\u0130stifad\u0259\u00e7i ID-si etibars\u0131zd\u0131r');
        }

        if (notification.fromUserName !== undefined) {
          if (typeof notification.fromUserName !== 'string' || notification.fromUserName.trim().length > 50) {
            throw new Error('\u0130stifad\u0259\u00e7i ad\u0131 etibars\u0131zd\u0131r');
          }
        }

        if (notification.fromUserAvatar !== undefined) {
          if (typeof notification.fromUserAvatar !== 'string' || notification.fromUserAvatar.trim().length === 0) {
            throw new Error('Avatar URL etibars\u0131zd\u0131r');
          }
        }

        // ===== VALIDATION END =====

        // \u2705 Use substring() instead of deprecated substr()
        const newNotification: Notification = {
          ...notification,
          id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
          createdAt: new Date().toISOString(),
          isRead: false,
        };

        set((state) => {
          // \u2705 Enforce max 100 notifications
          const MAX_NOTIFICATIONS = 100;
          let notifications = [newNotification, ...state.notifications];

          // \u2705 Auto-remove old notifications if exceeds limit
          if (notifications.length > MAX_NOTIFICATIONS) {
            notifications = notifications.slice(0, MAX_NOTIFICATIONS);
          }

          // \u2705 Auto-cleanup notifications older than 30 days
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          notifications = notifications.filter(n => {
            const notifDate = new Date(n.createdAt).getTime();
            return notifDate > thirtyDaysAgo;
          });

          return {
            notifications,
            unreadCount: state.unreadCount + 1,
          };
        });

        // ✅ Trigger haptic feedback based on notification type
        if (Platform.OS !== 'web') {
          (async () => {
            try {
              const Haptics = await import('expo-haptics');

              // Different haptic feedback for different notification types
              switch (notification.type) {
                case 'call':
                  await Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Warning,
                  );
                  break;
                case 'message':
                  await Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                  break;
                case 'nudge':
                  await Haptics.impactAsync(
                    Haptics.ImpactFeedbackStyle.Medium,
                  );
                  break;
                default:
                  await Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
              }
            } catch {
              // Haptics not available - silent fail (optional feature)
            }
          })();
        }
      },

      markAsRead: (notificationId) => {
        set((state) => {
          const notifications = state.notifications.map((notif) => {
            if (notif.id === notificationId && !notif.isRead) {
              return { ...notif, isRead: true };
            }
            return notif;
          });

          const unreadCount = notifications.filter(n => !n.isRead).length;

          return { notifications, unreadCount };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(notif => ({ ...notif, isRead: true })),
          unreadCount: 0,
        }));
      },

      removeNotification: (notificationId) => {
        set((state) => {
          const notifications = state.notifications.filter(n => n.id !== notificationId);
          const unreadCount = notifications.filter(n => !n.isRead).length;

          return { notifications, unreadCount };
        });
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      // ✅ Get navigation path from notification
      getNavigationPath: (notification) => {
        // Use explicit actionUrl if provided
        if (notification.actionUrl) {
          return notification.actionUrl;
        }

        // Generate path based on notification type
        switch (notification.type) {
          case 'message':
            return notification.fromUserId ? `/messages/${notification.fromUserId}` : '/messages';
          case 'call':
            return '/call-history';
          case 'listing':
            return notification.data?.listingId ? `/listing/${notification.data.listingId}` : null;
          case 'store':
            return notification.data?.storeId ? `/store/${notification.data.storeId}` : null;
          case 'nudge':
            return notification.fromUserId ? `/user/${notification.fromUserId}` : null;
          default:
            return null;
        }
      },
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

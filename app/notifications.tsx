import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Bell, Trash2, CheckCheck } from 'lucide-react-native';
import { useNotificationStore, Notification } from '@/store/notificationStore';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { getColors } from '@/constants/colors';
import { logger } from '@/utils/logger';

export default function NotificationsScreen() {
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    getNavigationPath,
  } = useNotificationStore();
  const colors = getColors(themeMode, colorTheme);

  const texts = {
    az: {
      notifications: 'Bildirişlər',
      noNotifications: 'Bildiriş yoxdur',
      noNotificationsDesc: 'Hələ heç bir bildirişiniz yoxdur',
      markAllRead: 'Hamısını oxunmuş et',
      clearAll: 'Hamısını sil',
      clearConfirm: 'Bütün bildirişləri silmək istədiyinizə əminsinizmi?',
      yes: 'Bəli',
      no: 'Xeyr',
      nudgeNotification: 'sizi dürtdü',
      messageNotification: 'sizə mesaj göndərdi',
      callNotification: 'sizə zəng etdi',
      now: 'indi',
      minutesAgo: 'dəqiqə əvvəl',
      hoursAgo: 'saat əvvəl',
      daysAgo: 'gün əvvəl',
    },
    ru: {
      notifications: 'Уведомления',
      noNotifications: 'Нет уведомлений',
      noNotificationsDesc: 'У вас пока нет уведомлений',
      markAllRead: 'Отметить все как прочитанные',
      clearAll: 'Очистить все',
      clearConfirm: 'Вы уверены, что хотите удалить все уведомления?',
      yes: 'Да',
      no: 'Нет',
      nudgeNotification: 'подтолкнул вас',
      messageNotification: 'отправил вам сообщение',
      callNotification: 'позвонил вам',
      now: 'сейчас',
      minutesAgo: 'минут назад',
      hoursAgo: 'часов назад',
      daysAgo: 'дней назад',
    },
  };

  const t = texts[language];

  const formatTime = (dateString: string) => {
    try {
      const now = new Date();
      const date = new Date(dateString);

      // \u2705 Validate date
      if (isNaN(date.getTime())) {
        return t.now; // Fallback for invalid dates
      }

      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

      // \u2705 Handle future dates (negative diff)
      if (diffInMinutes < 0) {
        return t.now; // Treat future dates as "now"
      }

      // \u2705 Handle edge cases
      if (diffInMinutes < 1) return t.now;
      if (diffInMinutes < 60) return `${diffInMinutes} ${t.minutesAgo}`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ${t.hoursAgo}`;

      const days = Math.floor(diffInMinutes / 1440);

      // \u2705 Cap at 30 days, show date for older
      if (days > 30) {
        return date.toLocaleDateString(language === 'az' ? 'az-AZ' : 'ru-RU', {
          day: 'numeric',
          month: 'short',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
      }

      return `${days} ${t.daysAgo}`;
    } catch (error) {
      return t.now; // Fallback for any errors
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      '',
      t.clearConfirm,
      [
        { text: t.no, style: 'cancel' },
        {
          text: t.yes,
          style: 'destructive',
          onPress: clearAll,
        },
      ],
    );
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    // \u2705 Null-safety checks
    const hasAvatar = item.fromUserAvatar && typeof item.fromUserAvatar === 'string' && item.fromUserAvatar.trim().length > 0;
    const hasUserName = item.fromUserName && typeof item.fromUserName === 'string' && item.fromUserName.trim().length > 0;
    const hasMessage = item.message && typeof item.message === 'string' && item.message.trim().length > 0;

    // \u2705 Get notification type text
    const getTypeText = () => {
      switch (item.type) {
        case 'nudge': return t.nudgeNotification;
        case 'message': return t.messageNotification;
        case 'call': return t.callNotification;
        default: return item.title || '';
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          { backgroundColor: colors.card },
          !item.isRead && { backgroundColor: colors.primary + '10', borderLeftColor: colors.primary },
        ]}
        onPress={() => {
          if (!item.isRead) {
            markAsRead(item.id);
          }
        }}
      >
        <View style={styles.notificationContent}>
          {hasAvatar && (
            <Image
              source={{ uri: item.fromUserAvatar }}
              style={styles.avatar}
              // defaultSource={require('@/assets/images/default-avatar.png')}
              onError={() => {
                // \u2705 Fallback if image fails to load
              }}
            />
          )}
          <View style={styles.notificationText}>
            <Text style={[styles.notificationTitle, { color: colors.text }]} numberOfLines={2}>
              {hasUserName && (
                <Text style={styles.userName}>{item.fromUserName} </Text>
              )}
              {getTypeText()}
            </Text>
            {hasMessage && (
              <Text
                style={[styles.notificationMessage, { color: colors.textSecondary }]}
                numberOfLines={3}
              >
                {item.message}
              </Text>
            )}
            <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
          {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation(); // \u2705 Prevent card click
            Alert.alert(
              language === 'az' ? 'Bildiri\u015fi sil' : '\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0435',
              language === 'az' ? 'Bu bildiri\u015fi silm\u0259k ist\u0259yirsiniz?' : '\u0425\u043e\u0442\u0438\u0442\u0435 \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u044d\u0442\u043e \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0435?',
              [
                { text: language === 'az' ? 'X\u0259yr' : '\u041d\u0435\u0442', style: 'cancel' },
                {
                  text: language === 'az' ? 'B\u0259li' : '\u0414\u0430',
                  style: 'destructive',
                  onPress: () => removeNotification(item.id),
                },
              ],
            );
          }}
        >
          <Trash2 size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Bell size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.noNotifications}</Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{t.noNotificationsDesc}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: `${t.notifications}${unreadCount > 0 ? ` (${unreadCount})` : ''}`,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            notifications.length > 0 && (
              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={markAllAsRead}
                    style={styles.headerButton}
                  >
                    <CheckCheck size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleClearAll}
                  style={styles.headerButton}
                >
                  <Trash2 size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            )
          ),
        }}
      />

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  userName: {
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});

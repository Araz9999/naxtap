import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User } from '@/types/user';
import { useLanguageStore } from '@/store/languageStore';
import Colors from '@/constants/colors';
import { Clock, MessageCircle, CheckCircle } from 'lucide-react-native';

interface UserAnalyticsProps {
  user: User;
}

export default function UserAnalytics({ user }: UserAnalyticsProps) {
  const { language } = useLanguageStore();

  // ✅ Early return if no analytics
  if (!user.analytics) {
    return null;
  }

  const formatLastOnline = (lastOnlineDate: string, isOnline: boolean) => {
    if (isOnline) {
      return language === 'az' ? 'İndi onlayn' : 'Сейчас онлайн';
    }

    const now = new Date();
    const lastOnline = new Date(lastOnlineDate);

    // ✅ Validate date
    if (isNaN(lastOnline.getTime())) {
      return language === 'az' ? 'Məlum deyil' : 'Неизвестно';
    }

    const diffInMinutes = Math.floor((now.getTime() - lastOnline.getTime()) / (1000 * 60));

    // ✅ Ensure non-negative (future date protection)
    if (diffInMinutes < 0) {
      return language === 'az' ? 'İndi onlayn' : 'Сейчас онлайн';
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 60) {
      return language === 'az'
        ? `${diffInMinutes} dəqiqə əvvəl onlayn idi`
        : `был онлайн ${diffInMinutes} минут назад`;
    } else if (diffInHours < 24) {
      return language === 'az'
        ? `${diffInHours} saat əvvəl onlayn idi`
        : `был онлайн ${diffInHours} часов назад`;
    } else {
      return language === 'az'
        ? `${diffInDays} gün əvvəl onlayn idi`
        : `был онлайн ${diffInDays} дней назад`;
    }
  };

  const formatResponseTime = (hours: number) => {
    // ✅ Validate input
    if (isNaN(hours) || hours < 0) {
      return language === 'az' ? 'Məlum deyil' : 'Неизвестно';
    }

    if (hours < 1) {
      const minutes = Math.max(1, Math.round(hours * 60)); // ✅ At least 1 minute
      return language === 'az'
        ? `${minutes} dəqiqə ərzində`
        : `в течение ${minutes} минут`;
    } else if (hours < 24) {
      return language === 'az'
        ? `${Math.round(hours)} saat ərzində`
        : `в течение ${Math.round(hours)} часов`;
    } else {
      const days = Math.round(hours / 24);
      return language === 'az'
        ? `${days} gün ərzində`
        : `в течение ${days} дней`;
    }
  };

  return (
    <View style={styles.container}>
      {/* Online Status */}
      <View style={styles.analyticsRow}>
        <View style={styles.iconContainer}>
          <View style={[styles.onlineIndicator, { backgroundColor: user.analytics.isOnline ? Colors.success : Colors.textSecondary }]} />
        </View>
        <Text style={styles.analyticsText}>
          {formatLastOnline(user.analytics.lastOnline, user.analytics.isOnline)}
        </Text>
      </View>

      {/* Response Rate */}
      {user.analytics.messageResponseRate != null && (
        <View style={styles.analyticsRow}>
          <View style={styles.iconContainer}>
            <MessageCircle size={14} color={Colors.textSecondary} />
          </View>
          <Text style={styles.analyticsText}>
            {language === 'az'
              ? `Mesajların ${Math.min(100, Math.max(0, user.analytics.messageResponseRate))}%-na cavab verir`
              : `Отвечает на ${Math.min(100, Math.max(0, user.analytics.messageResponseRate))}% сообщений`}
          </Text>
        </View>
      )}

      {/* Average Response Time */}
      <View style={styles.analyticsRow}>
        <View style={styles.iconContainer}>
          <Clock size={14} color={Colors.textSecondary} />
        </View>
        <Text style={styles.analyticsText}>
          {language === 'az'
            ? `Adətən ${formatResponseTime(user.analytics.averageResponseTime)}`
            : `Обычно ${formatResponseTime(user.analytics.averageResponseTime)}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    gap: 6,
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  analyticsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
});

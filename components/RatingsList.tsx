import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { Shield, CheckCircle } from 'lucide-react-native';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { getColors } from '@/constants/colors';
import { RatingWithUser } from '@/types/rating';
import StarRating from './StarRating';

interface RatingsListProps {
  ratings: RatingWithUser[];
  onUserPress?: (userId: string) => void;
}

export default function RatingsList({ ratings, onUserPress }: RatingsListProps) {
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const colors = getColors(themeMode, colorTheme);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return language === 'az' ? 'Bu gün' : 'Сегодня';
    } else if (diffDays === 1) {
      return language === 'az' ? 'Dünən' : 'Вчера';
    } else if (diffDays < 30) {
      return diffDays + (language === 'az' ? ' gün əvvəl' : ' дней назад');
    } else {
      return date.toLocaleDateString(language === 'az' ? 'az-AZ' : 'ru-RU');
    }
  };

  const renderRating = ({ item }: { item: RatingWithUser }) => (
    <View style={[styles.ratingItem, { backgroundColor: colors.card }]}>
      <View style={styles.ratingHeader}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => onUserPress?.(item.user.id)}
        >
          <Image
            source={{ uri: item.user.avatar }}
            style={styles.avatar}
            contentFit="cover"
          />
          <View style={styles.userDetails}>
            <View style={styles.userNameRow}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {item.user.name}
              </Text>
              {item.isVerified && (
                <View style={[styles.verifiedBadge, { backgroundColor: colors.success + '20' }]}>
                  <CheckCircle size={12} color={colors.success} />
                  <Text style={[styles.verifiedText, { color: colors.success }]}>
                    {language === 'az' ? 'Təsdiqlənib' : 'Проверено'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.ratingDate, { color: colors.textSecondary }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.ratingContainer}>
          <StarRating rating={item.rating} size={16} />
          {item.isVerified && (
            <Shield size={14} color={colors.success} style={styles.shieldIcon} />
          )}
        </View>
      </View>
      {item.comment && (
        <Text style={[styles.comment, { color: colors.text }]}>
          {item.comment}
        </Text>
      )}
    </View>
  );

  if (ratings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {language === 'az' ? 'Hələ reyting yoxdur' : 'Пока нет отзывов'}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={ratings}
      renderItem={renderRating}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  ratingItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  ratingDate: {
    fontSize: 12,
  },
  comment: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    gap: 2,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shieldIcon: {
    marginLeft: 4,
  },
});

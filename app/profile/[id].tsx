import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useUserStore } from '@/store/userStore';
import { useRatingStore } from '@/store/ratingStore';
import { useCallStore } from '@/store/callStore';
import { useListingStore } from '@/store/listingStore';
import ListingCard from '@/components/ListingCard';
import Colors from '@/constants/colors';
import { Star, MessageCircle, Phone, MessageSquare, MoreVertical } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import StarRating from '@/components/StarRating';
import RatingModal from '@/components/RatingModal';
import RatingsList from '@/components/RatingsList';
import { RatingWithUser } from '@/types/rating';
import UserActionModal from '@/components/UserActionModal';
import { trpcClient } from '@/lib/trpc';
import { logger } from '@/utils/logger';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useLanguageStore();
  const { currentUser } = useUserStore();
  const { addRating, getRatingsForTarget, getRatingStats, loadRatings } = useRatingStore();
  const { initiateCall } = useCallStore();
  const { listings } = useListingStore();
  const router = useRouter();

  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [showUserActionModal, setShowUserActionModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'listings' | 'ratings'>('listings');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load user from API
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const userData = await trpcClient.user.getUser.query({ id: id as string });
        setUser(userData);
      } catch (error) {
        logger.error('[ProfileScreen] Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadUser();
    }
  }, [id]);

  // Load ratings on component mount
  React.useEffect(() => {
    loadRatings();
  }, [loadRatings]);

  if (loading) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>
          {language === 'az' ? 'Yüklənir...' : 'Загрузка...'}
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>
          {language === 'az' ? 'İstifadəçi tapılmadı' : 'Пользователь не найден'}
        </Text>
      </View>
    );
  }

  const userListings = listings.filter(listing => listing.userId === user.id);
  const isCurrentUser = currentUser?.id === user.id;

  // Get ratings data from store with null safety
  const userRatings = getRatingsForTarget(user.id, 'user') || [];
  const ratingStats = getRatingStats(user.id, 'user') || {
    averageRating: 0,
    totalRatings: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };

  const handleRatingSubmit = async (rating: number, comment?: string) => {
    if (!currentUser) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Reyting vermək üçün daxil olun' : 'Войдите для оценки',
      );
      return;
    }

    // Validation: Rating range
    if (rating < 1 || rating > 5) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Reyting 1-5 arasında olmalıdır' : 'Оценка должна быть от 1 до 5',
      );
      return;
    }

    // Validation: Comment length if provided
    if (comment && comment.trim().length > 500) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Şərh maksimum 500 simvol ola bilər' : 'Комментарий не должен превышать 500 символов',
      );
      return;
    }

    try {
      await addRating({
        userId: currentUser.id,
        targetId: user.id,
        targetType: 'user',
        rating,
        comment: comment?.trim(),
      });

      Alert.alert(
        language === 'az' ? 'Uğurlu' : 'Успешно',
        language === 'az' ? 'Reyting əlavə edildi' : 'Оценка добавлена',
      );
    } catch (error) {
      logger.error('Failed to submit rating:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Reyting əlavə edilərkən xəta baş verdi' : 'Ошибка при добавлении оценки',
      );
    }
  };

  const handleUserPress = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleString(language === 'az' ? 'az-AZ' : 'ru-RU', { month: 'long' });
    const year = date.getFullYear();

    return language === 'az'
      ? `${month} ${year}`
      : `${month} ${year}`;
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: user.name }} />

      <View style={styles.header}>
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <View style={styles.ratingContainer}>
            <StarRating
              rating={ratingStats.averageRating}
              size={16}
            />
            <Text style={styles.rating}>
              {ratingStats.averageRating.toFixed(1)}
            </Text>
            <Text style={styles.ratingCount}>
              ({ratingStats.totalRatings})
            </Text>
          </View>
          <Text style={styles.memberSince}>
            {language === 'az' ? 'Üzv olub:' : 'Участник с:'} {formatDate(user.memberSince)}
          </Text>
          <Text style={styles.location}>{user.location[language]}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.messageButton]}
          onPress={() => {
            // Navigate to conversation with this user
            router.push(`/conversation/${user.id}`);
          }}
        >
          <MessageCircle size={20} color="white" />
          <Text style={styles.actionButtonText}>
            {language === 'az' ? 'Mesaj yaz' : 'Написать'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.callButton]}
          onPress={async () => {
            try {
              // Check if user has hidden phone number
              if (user.privacySettings?.hidePhoneNumber) {
                // Use in-app calling
                const callId = await initiateCall(user.id, '', 'voice', 'video');
                router.push(`/call/${callId}`);
              } else {
                // Use regular phone call
                Linking.openURL(`tel:${user.phone}`);
              }
            } catch (error) {
              logger.error('Failed to initiate call:', error);
            }
          }}
        >
          <Phone size={20} color="white" />
          <Text style={styles.actionButtonText}>
            {language === 'az' ? 'Zəng et' : 'Позвонить'}
          </Text>
        </TouchableOpacity>

        {!isCurrentUser && (
          <TouchableOpacity
            style={[styles.actionButton, styles.moreButton]}
            onPress={() => setShowUserActionModal(true)}
          >
            <MoreVertical size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Rate User Button */}
      {currentUser && !isCurrentUser && (
        <View style={styles.rateSection}>
          <TouchableOpacity
            style={styles.rateButton}
            onPress={() => setShowRatingModal(true)}
          >
            <MessageSquare size={16} color={Colors.primary} />
            <Text style={styles.rateButtonText}>
              {language === 'az' ? 'Reyting ver' : 'Оставить отзыв'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'listings' && styles.activeTab]}
          onPress={() => setActiveTab('listings')}
        >
          <Text style={[styles.tabText, activeTab === 'listings' && styles.activeTabText]}>
            {language === 'az' ? 'Elanlar' : 'Объявления'}
          </Text>
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{userListings.length}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ratings' && styles.activeTab]}
          onPress={() => setActiveTab('ratings')}
        >
          <Text style={[styles.tabText, activeTab === 'ratings' && styles.activeTabText]}>
            {language === 'az' ? 'Reytinqlər' : 'Отзывы'}
          </Text>
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{userRatings.length}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {activeTab === 'listings' && (
        <View style={styles.listingsSection}>
          <Text style={styles.sectionTitle}>
            {language === 'az' ? 'Elanlar' : 'Объявления'} ({userListings.length})
          </Text>

          {userListings.length > 0 ? (
            <View style={styles.listingsGrid}>
              {userListings.map(listing => (
                <View key={listing.id} style={styles.listingCard}>
                  <ListingCard listing={listing} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {language === 'az' ? 'Hələ elan yoxdur' : 'Пока нет объявлений'}
              </Text>
            </View>
          )}
        </View>
      )}

      {activeTab === 'ratings' && (
        <View style={styles.ratingsSection}>
          <Text style={styles.sectionTitle}>
            {language === 'az' ? 'Reytinqlər və Şərhlər' : 'Отзывы и рейтинги'}
          </Text>

          {/* Rating Summary */}
          {ratingStats.totalRatings > 0 && (
            <View style={styles.ratingSummary}>
              <View style={styles.ratingOverview}>
                <Text style={styles.averageRating}>
                  {ratingStats.averageRating.toFixed(1)}
                </Text>
                <StarRating rating={ratingStats.averageRating} size={20} />
                <Text style={styles.totalRatings}>
                  {ratingStats.totalRatings} {language === 'az' ? 'reyting' : 'отзывов'}
                </Text>
              </View>
            </View>
          )}

          <RatingsList
            ratings={userRatings}
            onUserPress={handleUserPress}
          />
        </View>
      )}

      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        targetId={user.id}
        targetType="user"
        targetName={user.name}
        onSubmit={handleRatingSubmit}
      />

      <UserActionModal
        visible={showUserActionModal}
        onClose={() => setShowUserActionModal(false)}
        user={user}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: Colors.card,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  memberSince: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  messageButton: {
    backgroundColor: Colors.primary,
  },
  callButton: {
    backgroundColor: Colors.success,
  },
  moreButton: {
    backgroundColor: '#f0f0f0',
    width: 48,
    flex: 0,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  listingsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  listingCard: {
    width: '48%',
    marginBottom: 16,
  },
  rateSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    alignSelf: 'center',
  },
  rateButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: Colors.textSecondary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  ratingsSection: {
    padding: 16,
  },
  ratingSummary: {
    backgroundColor: 'rgba(14, 116, 144, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  ratingOverview: {
    alignItems: 'center',
    gap: 8,
  },
  averageRating: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
  },
  totalRatings: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

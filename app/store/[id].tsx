import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useStoreStore } from '@/store/storeStore';
import { useListingStore } from '@/store/listingStore';
import { useUserStore } from '@/store/userStore';
import { useRatingStore } from '@/store/ratingStore';
import Colors from '@/constants/colors';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Globe,
  MessageCircle,
  Star,
  Package,
  Heart,
  HeartOff,
  Users,
  Plus,
  Settings,
  BarChart3,
  MessageSquare,
  Info,
  Percent,
  Megaphone,
  Tag,
} from 'lucide-react-native';
import ListingCard from '@/components/ListingCard';
import StoreListingManager from '@/components/StoreListingManager';
import StarRating from '@/components/StarRating';
import RatingModal from '@/components/RatingModal';
import RatingsList from '@/components/RatingsList';
import { RatingWithUser } from '@/types/rating';

import { storeLogger } from '@/utils/logger';
export default function StoreDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useLanguageStore();
  const { stores, followStore, unfollowStore, isFollowingStore, getStoreUsage } = useStoreStore();
  const { listings } = useListingStore();
  const { currentUser } = useUserStore();
  const { addRating, getRatingsForTarget, getRatingStats, loadRatings } = useRatingStore();

  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'listings' | 'ratings'>('listings');

  const store = stores.find(s => s.id === id);

  // ✅ Simplified filter logic
  const storeListings = listings.filter((listing) => {
    if (listing.deletedAt) return false;
    if (!store) return false;

    // Match by storeId or by owner (fallback for listings without store)
    return listing.storeId === store.id ||
           (!listing.storeId && listing.userId === store.userId);
  });

  // ✅ Log only if needed
  if (__DEV__ && storeListings.length === 0 && listings.length > 0) {
    storeLogger.warn('[StoreDetail] No listings found for store', {
      storeId: store?.id,
      totalListings: listings.length,
    });
  }
  const isFollowing = currentUser && store ? isFollowingStore(currentUser.id, store.id) : false;
  const isOwner = currentUser && store ? currentUser.id === store.userId : false;
  const storeUsage = store ? getStoreUsage(store.id) : { used: 0, max: 0, remaining: 0, deleted: 0 };

  // Get ratings data from store
  const storeRatings = store ? getRatingsForTarget(store.id, 'store') : [];
  const ratingStats = store ? getRatingStats(store.id, 'store') : { averageRating: 0, totalRatings: 0, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

  // Load ratings on component mount
  React.useEffect(() => {
    loadRatings();
  }, [loadRatings]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'İzləmək üçün daxil olun' : 'Войдите для подписки',
      );
      return;
    }

    if (!store) return;

    try {
      if (isFollowing) {
        await unfollowStore(currentUser.id, store.id);
      } else {
        await followStore(currentUser.id, store.id);
      }
    } catch (error) {
      storeLogger.error('Failed to toggle follow:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Əməliyyat zamanı xəta baş verdi' : 'Ошибка при выполнении операции',
      );
    }
  };

  const handleRatingSubmit = async (rating: number, comment?: string) => {
    if (!currentUser) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Reyting vermək üçün daxil olun' : 'Войдите для оценки',
      );
      return;
    }

    if (!store) return;

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
        targetId: store.id,
        targetType: 'store',
        rating,
        comment: comment?.trim(),
      });

      Alert.alert(
        language === 'az' ? 'Uğurlu' : 'Успешно',
        language === 'az' ? 'Reyting əlavə edildi' : 'Оценка добавлена',
      );
    } catch (error) {
      storeLogger.error('Failed to submit rating:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Reyting əlavə edilərkən xəta baş verdi' : 'Ошибка при добавлении оценки',
      );
    }
  };

  const handleUserPress = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  if (!store) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          {language === 'az' ? 'Mağaza tapılmadı' : 'Магазин не найден'}
        </Text>
      </View>
    );
  }

  const handleContact = async (type: 'phone' | 'email' | 'whatsapp', value: string) => {
    // ✅ Validate value
    if (!value || !value.trim()) {
      return; // Silently ignore if no value
    }

    let url = '';
    switch (type) {
      case 'phone':
        url = `tel:${value}`;
        break;
      case 'email':
        url = `mailto:${value}`;
        break;
      case 'whatsapp':
        url = `whatsapp://send?phone=${value.replace(/\s/g, '')}`;
        break;
    }

    try {
      // ✅ Check if URL can be opened
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        return; // Silently ignore if app not available
      }

      await Linking.openURL(url);
    } catch (error) {
      storeLogger.error('[StoreDetail] Failed to open contact', { type, error });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{store.name}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Store Cover */}
        <View style={styles.coverContainer}>
          {store.coverImage ? (
            <Image source={{ uri: store.coverImage }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Package size={48} color={Colors.textSecondary} />
            </View>
          )}

          <View style={styles.storeInfo}>
            <View style={styles.storeHeader}>
              {store.logo ? (
                <Image source={{ uri: store.logo }} style={styles.storeLogo} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Package size={32} color={Colors.primary} />
                </View>
              )}
              <View style={styles.storeDetails}>
                <View style={styles.storeNameRow}>
                  <View style={styles.storeNameContainer}>
                    <Text style={styles.storeName}>{store.name}</Text>
                    <Text style={styles.storeCategory}>{store.categoryName}</Text>
                  </View>
                  <View style={styles.storeActions}>
                    {isOwner && (
                      <View style={styles.ownerActions}>
                        <TouchableOpacity
                          style={styles.infoButton}
                          onPress={() => {
                            // Info button functionality can be added here
                          }}
                        >
                          <Info size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.settingsButton}
                          onPress={() => router.push('/store-settings')}
                        >
                          <Settings size={20} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    )}
                    {currentUser && !isOwner && (
                      <TouchableOpacity
                        style={[styles.followButtonLarge, isFollowing && styles.followingButton]}
                        onPress={handleFollowToggle}
                      >
                        {isFollowing ? (
                          <>
                            <Heart size={16} color="white" fill="white" />
                            <Text style={styles.followButtonText}>
                              {language === 'az' ? 'İzləyirəm' : 'Подписан'}
                            </Text>
                          </>
                        ) : (
                          <>
                            <HeartOff size={16} color={Colors.primary} />
                            <Text style={[styles.followButtonText, { color: Colors.primary }]}>
                              {language === 'az' ? 'İzlə' : 'Подписаться'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={styles.storeStats}>
                  <TouchableOpacity
                    style={styles.ratingContainer}
                    onPress={() => setActiveTab('ratings')}
                  >
                    <StarRating rating={ratingStats.averageRating} size={16} />
                    <Text style={styles.storeRating}>
                      {ratingStats.averageRating.toFixed(1)}
                    </Text>
                    <Text style={styles.ratingCount}>
                      ({ratingStats.totalRatings})
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.storeDivider}>•</Text>
                  <Users size={16} color={Colors.textSecondary} />
                  <Text style={styles.storeFollowersCount}>
                    {store.followers.length} {language === 'az' ? 'izləyən' : 'подписчиков'}
                  </Text>
                  <Text style={styles.storeDivider}>•</Text>
                  <Text style={styles.storeAdsCount}>
                    {storeListings.length} {language === 'az' ? 'elan' : 'объявлений'}
                  </Text>
                  {isOwner && (
                    <>
                      <Text style={styles.storeDivider}>•</Text>
                      <Text style={styles.storeUsage}>
                        {storeUsage.remaining} {language === 'az' ? 'qalan' : 'осталось'}
                      </Text>
                    </>
                  )}
                </View>

                {/* Rate Store Button */}
                {currentUser && !isOwner && (
                  <TouchableOpacity
                    style={styles.rateButton}
                    onPress={() => setShowRatingModal(true)}
                  >
                    <MessageSquare size={16} color={Colors.primary} />
                    <Text style={styles.rateButtonText}>
                      {language === 'az' ? 'Reyting ver' : 'Оставить отзыв'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {store.description && (
              <Text style={styles.storeDescription}>{store.description}</Text>
            )}
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'az' ? 'Əlaqə Məlumatları' : 'Контактная информация'}
          </Text>

          {store.address && (
            <View style={styles.contactItem}>
              <MapPin size={20} color={Colors.primary} />
              <Text style={styles.contactText}>{store.address}</Text>
            </View>
          )}

          {store.contactInfo.phone && (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => handleContact('phone', store.contactInfo.phone!)}
            >
              <Phone size={20} color={Colors.primary} />
              <Text style={styles.contactText}>{store.contactInfo.phone}</Text>
            </TouchableOpacity>
          )}

          {store.contactInfo.email && (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => handleContact('email', store.contactInfo.email!)}
            >
              <Mail size={20} color={Colors.primary} />
              <Text style={styles.contactText}>{store.contactInfo.email}</Text>
            </TouchableOpacity>
          )}

          {store.contactInfo.whatsapp && (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => handleContact('whatsapp', store.contactInfo.whatsapp!)}
            >
              <MessageCircle size={20} color={Colors.primary} />
              <Text style={styles.contactText}>{store.contactInfo.whatsapp}</Text>
            </TouchableOpacity>
          )}

          {store.contactInfo.website && (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => Linking.openURL(store.contactInfo.website!)}
            >
              <Globe size={20} color={Colors.primary} />
              <Text style={styles.contactText}>{store.contactInfo.website}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.section}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'listings' && styles.activeTab]}
              onPress={() => setActiveTab('listings')}
            >
              <Package size={20} color={activeTab === 'listings' ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.tabText, activeTab === 'listings' && styles.activeTabText]}>
                {language === 'az' ? 'Elanlar' : 'Объявления'}
              </Text>
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{storeListings.length}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'ratings' && styles.activeTab]}
              onPress={() => setActiveTab('ratings')}
            >
              <Star size={20} color={activeTab === 'ratings' ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.tabText, activeTab === 'ratings' && styles.activeTabText]}>
                {language === 'az' ? 'Reytinqlər' : 'Отзывы'}
              </Text>
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{storeRatings.length}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {activeTab === 'listings' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {language === 'az' ? 'Mağaza Elanları' : 'Объявления магазина'}
                </Text>
                {isOwner && (
                  <View style={styles.ownerButtonsContainer}>
                    <TouchableOpacity
                      style={styles.addListingButton}
                      onPress={() => router.push(`/store/add-listing/${store.id}`)}
                    >
                      <Plus size={18} color={Colors.primary} />
                      <Text style={styles.addListingText}>
                        {language === 'az' ? 'Elan əlavə et' : 'Добавить объявление'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Store Management Actions */}
              {isOwner && (
                <View style={styles.managementSection}>
                  <Text style={styles.managementTitle}>
                    {language === 'az' ? 'Mağaza İdarəetməsi' : 'Управление магазином'}
                  </Text>

                  {/* Main Discount & Campaign Management Button */}
                  <TouchableOpacity
                    style={styles.mainManagementButton}
                    onPress={() => router.push('/store-discount-manager')}
                  >
                    <View style={styles.mainButtonContent}>
                      <View style={styles.mainButtonIcon}>
                        <Tag size={24} color="white" />
                      </View>
                      <View style={styles.mainButtonTextContainer}>
                        <Text style={styles.mainButtonTitle}>
                          {language === 'az' ? 'Endirim və Kampaniya Mərkəzi' : 'Центр скидок и кампаний'}
                        </Text>
                        <Text style={styles.mainButtonSubtitle}>
                          {language === 'az'
                            ? 'Məhsullarınıza endirim tətbiq edin, kampaniyalar yaradın və satışları artırın'
                            : 'Применяйте скидки к товарам, создавайте кампании и увеличивайте продажи'
                          }
                        </Text>
                      </View>
                      <View style={styles.mainButtonArrow}>
                        <ArrowLeft size={20} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.managementButtons}>
                    <TouchableOpacity
                      style={styles.managementButton}
                      onPress={() => router.push('/store/discount/create')}
                    >
                      <View style={styles.managementButtonIcon}>
                        <Percent size={20} color={Colors.primary} />
                      </View>
                      <Text style={styles.managementButtonText}>
                        {language === 'az' ? 'Endirim Yarat' : 'Создать скидку'}
                      </Text>
                      <Text style={styles.managementButtonDescription}>
                        {language === 'az' ? 'Tək məhsula endirim' : 'Скидка на товар'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.managementButton}
                      onPress={() => router.push('/store/campaign/create')}
                    >
                      <View style={styles.managementButtonIcon}>
                        <Megaphone size={20} color={Colors.secondary} />
                      </View>
                      <Text style={styles.managementButtonText}>
                        {language === 'az' ? 'Kampaniya Yarat' : 'Создать кампанию'}
                      </Text>
                      <Text style={styles.managementButtonDescription}>
                        {language === 'az' ? 'Toplu endirim kampaniyası' : 'Массовая кампания'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.managementButton}
                      onPress={() => router.push('/store-promotion')}
                    >
                      <View style={styles.managementButtonIcon}>
                        <BarChart3 size={20} color={Colors.warning} />
                      </View>
                      <Text style={styles.managementButtonText}>
                        {language === 'az' ? 'Reklam və Təşviq' : 'Реклама и продвижение'}
                      </Text>
                      <Text style={styles.managementButtonDescription}>
                        {language === 'az' ? 'Mağazanı tanıt' : 'Продвигай магазин'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {isOwner && (
                <View style={styles.storeStatsCard}>
                  <View style={styles.statItem}>
                    <BarChart3 size={20} color={Colors.primary} />
                    <View style={styles.statInfo}>
                      <Text style={styles.statValue}>{storeUsage.used}/{storeUsage.max}</Text>
                      <Text style={styles.statLabel}>
                        {language === 'az' ? 'İstifadə edilmiş' : 'Использовано'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statItem}>
                    <Package size={20} color={Colors.secondary} />
                    <View style={styles.statInfo}>
                      <Text style={styles.statValue}>{storeUsage.remaining}</Text>
                      <Text style={styles.statLabel}>
                        {language === 'az' ? 'Qalan limit' : 'Остается'}
                      </Text>
                    </View>
                  </View>
                  {storeUsage.deleted > 0 && (
                    <View style={styles.statItem}>
                      <Package size={20} color={Colors.error} />
                      <View style={styles.statInfo}>
                        <Text style={styles.statValue}>{storeUsage.deleted}</Text>
                        <Text style={styles.statLabel}>
                          {language === 'az' ? 'Silinmiş' : 'Удалено'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {isOwner ? (
                <StoreListingManager storeId={store.id} listings={storeListings} />
              ) : (
                storeListings.length > 0 ? (
                  <View style={styles.listingsGrid}>
                    {storeListings.map((listing) => (
                      <View key={listing.id} style={styles.listingItem}>
                        <ListingCard listing={listing} />
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Package size={48} color={Colors.textSecondary} />
                    <Text style={styles.emptyText}>
                      {language === 'az' ? 'Hələ elan yoxdur' : 'Пока нет объявлений'}
                    </Text>
                  </View>
                )
              )}
            </>
          )}

          {activeTab === 'ratings' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {language === 'az' ? 'Reytinqlər və Şərhlər' : 'Отзывы и рейтинги'}
                </Text>
              </View>

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
                ratings={storeRatings}
                onUserPress={handleUserPress}
              />
            </>
          )}
        </View>
      </ScrollView>

      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        targetId={store.id}
        targetType="store"
        targetName={store.name}
        onSubmit={handleRatingSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  coverContainer: {
    backgroundColor: Colors.card,
  },
  coverImage: {
    width: '100%',
    height: 200,
  },
  coverPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeInfo: {
    padding: 16,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  storeLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
  },
  logoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  storeDetails: {
    flex: 1,
  },
  storeNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  storeNameContainer: {
    flex: 1,
    marginRight: 12,
  },
  storeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  storeCategory: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  followButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  followingButton: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    color: 'white',
  },
  storeStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeRating: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 4,
  },
  storeDivider: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginHorizontal: 8,
  },
  storeFollowersCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  storeAdsCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  storeUsage: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  storeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ownerButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addListingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addListingText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  storeStatsCard: {
    backgroundColor: 'rgba(14, 116, 144, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statInfo: {
    marginLeft: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  storeDescription: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  section: {
    backgroundColor: Colors.card,
    marginTop: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  contactText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  listingItem: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginTop: 40,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'flex-start',
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
    marginBottom: 20,
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
  managementSection: {
    backgroundColor: 'rgba(14, 116, 144, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  managementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  mainManagementButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  mainButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  mainButtonIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mainButtonTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  mainButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  mainButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16,
  },
  mainButtonArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  managementButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  managementButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  managementButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  managementButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 4,
  },
  managementButtonDescription: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
});

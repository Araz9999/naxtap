import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useUserStore } from '@/store/userStore';
import { useListingStore } from '@/store/listingStore';
import ListingCard from '@/components/ListingCard';
import Colors from '@/constants/colors';
import { Clock, AlertCircle, Edit, Trash2, TrendingUp, Eye, RefreshCw, Archive, Settings, Bell, DollarSign, Tag, Percent, Gift } from 'lucide-react-native';
import { Listing } from '@/types/listing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpcClient } from '@/lib/trpc';
import { logger } from '@/utils/logger';

// Helper function for price calculation with proper precision
const calculatePrice = (basePrice: number, discount: number): number => {
  return Math.round(basePrice * discount * 100) / 100;
};

export default function MyListingsScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { currentUser, isAuthenticated, canAfford, spendFromBalance, getTotalBalance } = useUserStore();
  const { listings, deleteListing, updateListing, getExpiringListings, getArchivedListings } = useListingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [autoRenewalSettings, setAutoRenewalSettings] = useState<{[key: string]: boolean}>({});
  const [showExpirationSettings, setShowExpirationSettings] = useState(false);
  const [archivedListings, setArchivedListings] = useState<Listing[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  // Memoize user listings to prevent infinite loops
  const userListings = useMemo(() => listings.filter(listing => {
    if (!currentUser || listing.userId !== currentUser.id) return false;

    // Include personal listings (not in stores)
    if (!listing.storeId) return true;

    // Include promoted listings from stores
    return listing.isPremium || listing.isFeatured || listing.isVip || (listing.purchasedViews && listing.purchasedViews > 0);
  }), [listings, currentUser]);

  // Check for expiring listings (3 days or less)
  // ✅ Memoized for performance
  const expiringListings = React.useMemo(() => {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    return userListings.filter(listing => {
      const expirationDate = new Date(listing.expiresAt);
      return expirationDate <= threeDaysFromNow && expirationDate > now;
    });
  }, [userListings]);

  const checkExpiringListings = useCallback(() => {
    // ✅ FIX: Define 'now' inside the callback
    const now = new Date();

    const notificationMessages = expiringListings.map(listing => {
      const expirationDate = new Date(listing.expiresAt);
      const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      return language === 'az'
        ? `"${listing.title.az}" elanınızın müddəti ${daysLeft} gün sonra bitəcək`
        : `Срок действия объявления "${listing.title.ru}" истекает через ${daysLeft} дней`;
    });

    setNotifications(notificationMessages);
    logger.info('[MyListings] Checked expiring listings:', { count: expiringListings.length });
  }, [expiringListings, language]);

  // ✅ Load persisted auto-renewal settings and archived listings on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        // Load auto-renewal settings
        const storedSettings = await AsyncStorage.getItem('autoRenewalSettings');
        if (storedSettings) {
          setAutoRenewalSettings(JSON.parse(storedSettings));
          logger.info('[MyListings] Loaded auto-renewal settings:', JSON.parse(storedSettings));
        }

        // Load archived listings
        const storedArchived = await AsyncStorage.getItem('archivedListings');
        if (storedArchived) {
          setArchivedListings(JSON.parse(storedArchived));
          logger.info('[MyListings] Loaded archived listings:', { count: JSON.parse(storedArchived).length });
        }
      } catch (error) {
        logger.error('[MyListings] Failed to load persisted data:', error);
      }
    };

    if (isAuthenticated) {
      loadPersistedData();
      checkExpiringListings();
    }
  }, [isAuthenticated, checkExpiringListings]);

  // ✅ Improved refresh with actual data reload
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    logger.info('[MyListings] Refreshing listings...');

    try {
      // Reload auto-renewal settings
      const storedSettings = await AsyncStorage.getItem('autoRenewalSettings');
      if (storedSettings) {
        setAutoRenewalSettings(JSON.parse(storedSettings));
      }

      // Reload archived listings
      const storedArchived = await AsyncStorage.getItem('archivedListings');
      if (storedArchived) {
        setArchivedListings(JSON.parse(storedArchived));
      }

      // Check expiring listings
      checkExpiringListings();

      logger.info('[MyListings] Refresh completed successfully');
    } catch (error) {
      logger.error('[MyListings] Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [checkExpiringListings]);

  const handleAutoRenewal = async (listingId: string) => {
    // ✅ Validate listingId
    if (!listingId || typeof listingId !== 'string') {
      logger.error('[MyListings] Invalid listingId for auto-renewal');
      Alert.alert(
        language === 'az' ? 'Xəta!' : 'Ошибка!',
        language === 'az' ? 'Elan ID səhvdir' : 'Неверный ID объявления',
      );
      return;
    }

    const listing = userListings.find(l => l.id === listingId);
    if (!listing) {
      logger.error('[MyListings] Listing not found for auto-renewal:', listingId);
      Alert.alert(
        language === 'az' ? 'Xəta!' : 'Ошибка!',
        language === 'az' ? 'Elan tapılmadı' : 'Объявление не найдено',
      );
      return;
    }

    const isActive = autoRenewalSettings[listingId];
    const autoRenewalCost = 5; // 5 AZN per month

    logger.info('[MyListings] Toggling auto-renewal:', { listingId, isActive, cost: autoRenewalCost });

    if (!isActive && !canAfford(autoRenewalCost)) {
      Alert.alert(
        language === 'az' ? 'Balans kifayət etmir' : 'Недостаточно средств',
        language === 'az'
          ? `Avtomatik uzatma üçün ${autoRenewalCost} AZN lazımdır. Balansınız: ${getTotalBalance()} AZN`
          : `Для автопродления требуется ${autoRenewalCost} AZN. Ваш баланс: ${getTotalBalance()} AZN`,
        [
          {
            text: language === 'az' ? 'Ləğv et' : 'Отмена',
            style: 'cancel',
          },
          {
            text: language === 'az' ? 'Balansı artır' : 'Пополнить баланс',
            onPress: () => router.push('/wallet'),
          },
        ],
      );
      return;
    }

    Alert.alert(
      language === 'az' ? 'Avtomatik uzatma' : 'Автоматическое продление',
      language === 'az'
        ? (isActive ? 'Avtomatik uzatmanı deaktivləşdirmək istəyirsiniz?' : `Bu elan üçün avtomatik uzatmanı aktivləşdirmək istəyirsiniz?\n\nQiymət: ${autoRenewalCost} AZN/ay\nBalansınız: ${getTotalBalance()} AZN`)
        : (isActive ? 'Хотите деактивировать автоматическое продление?' : `Хотите активировать автоматическое продление для этого объявления?\n\nЦена: ${autoRenewalCost} AZN/мес\nВаш баланс: ${getTotalBalance()} AZN`),
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'az' ? (isActive ? 'Deaktivləşdir' : `Aktivləşdir (${autoRenewalCost} AZN/ay)`) : (isActive ? 'Деактивировать' : `Активировать (${autoRenewalCost} AZN/мес)`),
          onPress: async() => {
            try {
              if (!isActive) {
                // Activating auto-renewal - charge the user
                const success = spendFromBalance(autoRenewalCost);
                if (success) {
                  const newSettings = { ...autoRenewalSettings, [listingId]: true };
                  setAutoRenewalSettings(newSettings);

                  // ✅ Persist to AsyncStorage
                  try {
                    await AsyncStorage.setItem('autoRenewalSettings', JSON.stringify(newSettings));
                    logger.info('[MyListings] Auto-renewal activated and persisted:', listingId);
                  } catch (error) {
                    logger.error('[MyListings] Failed to persist auto-renewal settings:', error);
                  }

                  Alert.alert(
                    language === 'az' ? 'Uğurlu!' : 'Успешно!',
                    language === 'az'
                      ? `Avtomatik uzatma aktivləşdirildi. ${autoRenewalCost} AZN balansınızdan çıxarıldı.\n\n⚠️ Qeyd: Elan müddəti bitəndə avtomatik olaraq 30 gün uzadılacaq.`
                      : `Автоматическое продление активировано. ${autoRenewalCost} AZN списано с баланса.\n\n⚠️ Примечание: Объявление будет автоматически продлено на 30 дней после истечения.`,
                  );
                } else {
                  Alert.alert(
                    language === 'az' ? 'Xəta!' : 'Ошибка!',
                    language === 'az' ? 'Balans kifayət etmir' : 'Недостаточно средств',
                  );
                }
              } else {
                // Deactivating auto-renewal - no charge
                const newSettings = { ...autoRenewalSettings, [listingId]: false };
                setAutoRenewalSettings(newSettings);

                // ✅ Persist to AsyncStorage
                try {
                  await AsyncStorage.setItem('autoRenewalSettings', JSON.stringify(newSettings));
                  logger.info('[MyListings] Auto-renewal deactivated and persisted:', listingId);
                } catch (error) {
                  logger.error('[MyListings] Failed to persist auto-renewal settings:', error);
                }

                Alert.alert(
                  language === 'az' ? 'Uğurlu!' : 'Успешно!',
                  language === 'az'
                    ? 'Avtomatik uzatma deaktivləşdirildi'
                    : 'Автоматическое продление деактивировано',
                );
              }
            } catch (error) {
              logger.error('[MyListings] Error toggling auto renewal:', error);
              Alert.alert(
                language === 'az' ? 'Xəta!' : 'Ошибка!',
                language === 'az' ? 'Tənzimləmə zamanı xəta baş verdi' : 'Произошла ошибка при настройке',
              );
            }
          },
        },
      ],
    );
  };

  const handleExtendListing = (listingId: string) => {
    // ✅ Validate listingId
    if (!listingId || typeof listingId !== 'string') {
      logger.error('[MyListings] Invalid listingId for extension');
      return;
    }

    const listing = userListings.find(l => l.id === listingId);
    if (!listing) {
      logger.error('[MyListings] Listing not found for extension:', listingId);
      return;
    }

    logger.info('[MyListings] Extending listing:', { listingId, expiresAt: listing.expiresAt });

    const daysLeft = getDaysLeft(listing.expiresAt);
    const isExpiringSoon = daysLeft <= 3;
    const discountMultiplier = isExpiringSoon ? 0.8 : 1; // 20% discount

    // ✅ Use helper function for precise calculation
    const sevenDayPrice = calculatePrice(2, discountMultiplier);
    const thirtyDayPrice = calculatePrice(5, discountMultiplier);

    const discountText = isExpiringSoon ? ' (20% endirim)' : '';

    Alert.alert(
      language === 'az' ? 'Elanı uzat' : 'Продлить объявление',
      language === 'az'
        ? `Elanınızın müddətini uzatmaq istəyirsiniz?${isExpiringSoon ? '\n\n🎉 Müddəti bitən elanlar üçün 20% endirim!' : ''}\n\nBalansınız: ${getTotalBalance()} AZN`
        : `Хотите продлить срок действия объявления?${isExpiringSoon ? '\n\n🎉 Скидка 20% для истекающих объявлений!' : ''}\n\nВаш баланс: ${getTotalBalance()} AZN`,
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'az' ? `7 gün (${sevenDayPrice} AZN)${discountText}` : `7 дней (${sevenDayPrice} AZN)${discountText}`,
          onPress: () => {
            if (!canAfford(sevenDayPrice)) {
              Alert.alert(
                language === 'az' ? 'Balans kifayət etmir' : 'Недостаточно средств',
                language === 'az'
                  ? `${sevenDayPrice} AZN lazımdır. Balansınız: ${getTotalBalance()} AZN`
                  : `Требуется ${sevenDayPrice} AZN. Ваш баланс: ${getTotalBalance()} AZN`,
                [
                  { text: language === 'az' ? 'Ləğv et' : 'Отмена', style: 'cancel' },
                  {
                    text: language === 'az' ? 'Balansı artır' : 'Пополнить баланс',
                    onPress: () => router.push('/wallet'),
                  },
                ],
              );
              return;
            }

            try {
              if (spendFromBalance(sevenDayPrice)) {
                const newExpirationDate = new Date(listing.expiresAt);
                newExpirationDate.setDate(newExpirationDate.getDate() + 7);

                updateListing(listingId, {
                  expiresAt: newExpirationDate.toISOString(),
                });

                logger.info('[MyListings] Listing extended by 7 days:', { listingId, newExpiresAt: newExpirationDate.toISOString() });

                Alert.alert(
                  language === 'az' ? 'Uğurlu!' : 'Успешно!',
                  language === 'az'
                    ? `Elanınız 7 gün uzadıldı${isExpiringSoon ? ' (20% endirim tətbiq edildi)' : ''}. ${sevenDayPrice} AZN balansınızdan çıxarıldı.`
                    : `Объявление продлено на 7 дней${isExpiringSoon ? ' (применена скидка 20%)' : ''}. ${sevenDayPrice} AZN списано с баланса.`,
                );
              }
            } catch (error) {
              logger.error('[MyListings] Error extending listing:', error);
              Alert.alert(
                language === 'az' ? 'Xəta!' : 'Ошибка!',
                language === 'az' ? 'Uzatma zamanı xəta baş verdi' : 'Произошла ошибка при продлении',
              );
            }
          },
        },
        {
          text: language === 'az' ? `30 gün (${thirtyDayPrice} AZN)${discountText}` : `30 дней (${thirtyDayPrice} AZN)${discountText}`,
          onPress: () => {
            if (!canAfford(thirtyDayPrice)) {
              Alert.alert(
                language === 'az' ? 'Balans kifayət etmir' : 'Недостаточно средств',
                language === 'az'
                  ? `${thirtyDayPrice} AZN lazımdır. Balansınız: ${getTotalBalance()} AZN`
                  : `Требуется ${thirtyDayPrice} AZN. Ваш баланс: ${getTotalBalance()} AZN`,
                [
                  { text: language === 'az' ? 'Ləğv et' : 'Отмена', style: 'cancel' },
                  {
                    text: language === 'az' ? 'Balansı artır' : 'Пополнить баланс',
                    onPress: () => router.push('/wallet'),
                  },
                ],
              );
              return;
            }

            try {
              if (spendFromBalance(thirtyDayPrice)) {
                const newExpirationDate = new Date(listing.expiresAt);
                newExpirationDate.setDate(newExpirationDate.getDate() + 30);

                updateListing(listingId, {
                  expiresAt: newExpirationDate.toISOString(),
                });

                logger.info('[MyListings] Listing extended by 30 days:', { listingId, newExpiresAt: newExpirationDate.toISOString() });

                Alert.alert(
                  language === 'az' ? 'Uğurlu!' : 'Успешно!',
                  language === 'az'
                    ? `Elanınız 30 gün uzadıldı${isExpiringSoon ? ' (20% endirim tətbiq edildi)' : ''}. ${thirtyDayPrice} AZN balansınızdan çıxarıldı.`
                    : `Объявление продлено на 30 дней${isExpiringSoon ? ' (применена скидка 20%)' : ''}. ${thirtyDayPrice} AZN списано с баланса.`,
                );
              }
            } catch (error) {
              logger.error('[MyListings] Error extending listing:', error);
              Alert.alert(
                language === 'az' ? 'Xəta!' : 'Ошибка!',
                language === 'az' ? 'Uzatma zamanı xəta baş verdi' : 'Произошла ошибка при продлении',
              );}
          },
        },
      ],
    );
  };

  const handleArchiveListing = async (listingId: string) => {
    // ✅ Validate listingId
    if (!listingId || typeof listingId !== 'string') {
      logger.error('[MyListings] Invalid listingId for archiving');
      return;
    }

    const listing = userListings.find(l => l.id === listingId);
    if (!listing) {
      logger.error('[MyListings] Listing not found for archiving:', listingId);
      return;
    }

    logger.info('[MyListings] Archiving listing:', listingId);

    Alert.alert(
      language === 'az' ? 'Elanı arxivləşdir' : 'Архивировать объявление',
      language === 'az'
        ? 'Bu elanı arxivə köçürmək istəyirsiniz? Arxivdən sonra yenidən aktivləşdirə bilərsiniz.'
        : 'Хотите переместить это объявление в архив? Вы сможете реактивировать его позже.',
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'az' ? 'Arxivləşdir' : 'Архивировать',
          onPress: async () => {
            try {
              const newArchived = [...archivedListings, listing];
              setArchivedListings(newArchived);

              // ✅ Persist archived listings
              try {
                await AsyncStorage.setItem('archivedListings', JSON.stringify(newArchived));
                logger.info('[MyListings] Archived listing persisted:', listingId);
              } catch (storageError) {
                logger.error('[MyListings] Failed to persist archived listing:', storageError);
              }

              // ✅ Remove auto-renewal if active
              if (autoRenewalSettings[listingId]) {
                const newSettings = { ...autoRenewalSettings, [listingId]: false };
                setAutoRenewalSettings(newSettings);
                await AsyncStorage.setItem('autoRenewalSettings', JSON.stringify(newSettings));
                logger.info('[MyListings] Auto-renewal removed for archived listing:', listingId);
              }

              deleteListing(listingId);

              Alert.alert(
                language === 'az' ? 'Arxivləndi' : 'Архивировано',
                language === 'az'
                  ? 'Elan arxivə köçürüldü. Arxiv bölməsindən yenidən aktivləşdirə bilərsiniz.'
                  : 'Объявление перемещено в архив. Вы можете реактивировать его из раздела архива.',
              );
            } catch (error) {
              logger.error('[MyListings] Error archiving listing:', error);
              Alert.alert(
                language === 'az' ? 'Xəta!' : 'Ошибка!',
                language === 'az' ? 'Arxivləmə zamanı xəta baş verdi' : 'Произошла ошибка при архивировании',
              );
            }
          },
        },
      ],
    );
  };

  const handleReactivateListing = (listing: Listing) => {
    Alert.alert(
      language === 'az' ? 'Elanı yenidən aktivləşdir' : 'Реактивировать объявление',
      language === 'az'
        ? 'Bu elanı yenidən aktivləşdirmək istəyirsiniz? Elan 30 gün müddətində yayımlanacaq.'
        : 'Хотите реактивировать это объявление? Объявление будет опубликовано на 30 дней.',
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'az' ? 'Aktivləşdir (3 AZN)' : 'Активировать (3 AZN)',
          onPress: () => {
            try {
              // Create a new listing with updated expiration date
              const reactivatedListing = {
                ...listing,
                id: `${listing.id}_reactivated_${Date.now()}`,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                views: 0,
                isPremium: false,
                isFeatured: false,
                isVip: false,
              };

              // Add back to active listings
              const { addListing } = useListingStore.getState();
              addListing(reactivatedListing);

              // Remove from archived
              setArchivedListings(prev => prev.filter(l => l.id !== listing.id));

              Alert.alert(
                language === 'az' ? 'Uğurlu!' : 'Успешно!',
                language === 'az'
                  ? 'Elan yenidən aktivləşdirildi və 30 gün müddətində yayımlanacaq'
                  : 'Объявление реактивировано и будет опубликовано на 30 дней',
              );
            } catch (error) {
              logger.error('[MyListings] Error reactivating listing:', error);
              Alert.alert(
                language === 'az' ? 'Xəta!' : 'Ошибка!',
                language === 'az' ? 'Aktivləşdirmə zamanı xəta baş verdi' : 'Произошла ошибка при реактивации',
              );
            }
          },
        },
      ],
    );
  };

  const getDaysLeft = (expiresAt: string) => {
    const now = new Date();
    const expirationDate = new Date(expiresAt);
    const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(0, daysLeft);
  };

  const getStatusColor = (listing: Listing) => {
    const daysLeft = getDaysLeft(listing.expiresAt);
    if (daysLeft <= 1) return Colors.error;
    if (daysLeft <= 3) return Colors.warning;
    return Colors.success;
  };

  const getStatusText = (listing: Listing) => {
    const daysLeft = getDaysLeft(listing.expiresAt);
    if (daysLeft === 0) {
      return language === 'az' ? 'Bugün bitir' : 'Истекает сегодня';
    }
    if (daysLeft === 1) {
      return language === 'az' ? '1 gün qalıb' : 'Остался 1 день';
    }
    return language === 'az' ? `${daysLeft} gün qalıb` : `Осталось ${daysLeft} дней`;
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authTitle}>
          {language === 'az' ? 'Elanlarınızı görmək üçün hesabınıza daxil olun' : 'Войдите в аккаунт, чтобы увидеть свои объявления'}
        </Text>
        <TouchableOpacity
          style={styles.authButton}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.authButtonText}>
            {language === 'az' ? 'Daxil ol' : 'Войти'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Notifications Section */}
      {notifications.length > 0 && (
        <View style={styles.notificationsContainer}>
          <View style={styles.notificationHeader}>
            <AlertCircle size={20} color={Colors.warning} />
            <Text style={styles.notificationTitle}>
              {language === 'az' ? 'Bildirişlər' : 'Уведомления'}
            </Text>
          </View>
          {notifications.map((notification, index) => (
            <View key={index} style={styles.notificationItem}>
              <Text style={styles.notificationText}>{notification}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>
              {language === 'az' ? 'Mənim Elanlarım' : 'Мои Объявления'}
            </Text>
            <Text style={styles.subtitle}>
              {language === 'az'
                ? `${userListings.length} elan (şəxsi və təşviq edilən)`
                : `${userListings.length} объявлений (личные и продвигаемые)`
              }
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowExpirationSettings(!showExpirationSettings)}
          >
            <Settings size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/renewal-offers')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${Colors.success}20` }]}>
              <Gift size={20} color={Colors.success} />
            </View>
            <View style={styles.quickActionInfo}>
              <Text style={styles.quickActionLabel}>
                {language === 'az' ? 'Güzəştli Təkliflər' : 'Скидки'}
              </Text>
              <Text style={styles.quickActionValue}>
                {(currentUser?.id ? getExpiringListings(currentUser.id, 7).length : 0)} {language === 'az' ? 'təklif' : 'предложений'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/archived-listings')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${Colors.textSecondary}20` }]}>
              <Archive size={20} color={Colors.textSecondary} />
            </View>
            <View style={styles.quickActionInfo}>
              <Text style={styles.quickActionLabel}>
                {language === 'az' ? 'Arxiv' : 'Архив'}
              </Text>
              <Text style={styles.quickActionValue}>
                {(currentUser?.id ? getArchivedListings(currentUser.id).length : 0)} {language === 'az' ? 'elan' : 'объявлений'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Expiration Settings Panel */}
        {showExpirationSettings && (
          <View style={styles.settingsPanel}>
            <Text style={styles.settingsPanelTitle}>
              {language === 'az' ? 'Müddət Bitməsi Tənzimləmələri' : 'Настройки истечения срока'}
            </Text>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Bell size={16} color={Colors.primary} />
                <Text style={styles.settingLabel}>
                  {language === 'az' ? 'Bildiriş vaxtları' : 'Время уведомлений'}
                </Text>
              </View>
              <Text style={styles.settingValue}>
                {language === 'az' ? '7, 3, 1 gün əvvəl' : 'За 7, 3, 1 день'}
              </Text>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <RefreshCw size={16} color={Colors.success} />
                <Text style={styles.settingLabel}>
                  {language === 'az' ? 'Avtomatik uzatma' : 'Автопродление'}
                </Text>
              </View>
              <Text style={styles.settingValue}>
                {language === 'az' ? 'Elan səviyyəsində' : 'На уровне объявления'}
              </Text>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Archive size={16} color={Colors.textSecondary} />
                <Text style={styles.settingLabel}>
                  {language === 'az' ? 'Avtomatik arxivləmə' : 'Автоархивирование'}
                </Text>
              </View>
              <Text style={styles.settingValue}>
                {language === 'az' ? 'Müddət bitdikdən sonra' : 'После истечения'}
              </Text>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <DollarSign size={16} color={Colors.secondary} />
                <Text style={styles.settingLabel}>
                  {language === 'az' ? 'Endirimli uzatma' : 'Скидочное продление'}
                </Text>
              </View>
              <Text style={styles.settingValue}>
                {language === 'az' ? '7gün:15% • 3gün:10% • 1gün:5%' : '7дн:15% • 3дн:10% • 1дн:5%'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewOffersButton}
              onPress={() => router.push('/renewal-offers')}
            >
              <Percent size={16} color="white" />
              <Text style={styles.viewOffersButtonText}>
                {language === 'az' ? 'Güzəştli Təklifləri Gör' : 'Смотреть предложения'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Listings */}
      {showArchived ? (
        <View style={styles.listingsContainer}>
          <Text style={styles.sectionTitle}>
            {language === 'az' ? 'Arxivlənmiş Elanlar' : 'Архивированные объявления'}
          </Text>
          {archivedListings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Archive size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>
                {language === 'az'
                  ? 'Arxivdə elan yoxdur'
                  : 'В архиве нет объявлений'
                }
              </Text>
            </View>
          ) : (
            archivedListings.map((listing) => (
              <View key={listing.id} style={styles.archivedListingWrapper}>
                <ListingCard listing={listing} />
                <View style={styles.archivedActions}>
                  <TouchableOpacity
                    style={styles.reactivateButton}
                    onPress={() => handleReactivateListing(listing)}
                  >
                    <RefreshCw size={16} color={Colors.success} />
                    <Text style={styles.reactivateButtonText}>
                      {language === 'az' ? 'Yenidən aktivləşdir' : 'Реактивировать'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.permanentDeleteButton}
                    onPress={() => {
                      Alert.alert(
                        language === 'az' ? 'Həmişəlik sil' : 'Удалить навсегда',
                        language === 'az'
                          ? 'Bu elanı həmişəlik silmək istəyirsiniz?'
                          : 'Хотите удалить это объявление навсегда?',
                        [
                          { text: language === 'az' ? 'Ləğv et' : 'Отмена', style: 'cancel' },
                          {
                            text: language === 'az' ? 'Sil' : 'Удалить',
                            style: 'destructive',
                            onPress: () => {
                              setArchivedListings(prev => prev.filter(l => l.id !== listing.id));
                            },
                          },
                        ],
                      );
                    }}
                  >
                    <Trash2 size={16} color={Colors.error} />
                    <Text style={styles.permanentDeleteButtonText}>
                      {language === 'az' ? 'Həmişəlik sil' : 'Удалить навсегда'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      ) : userListings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {language === 'az'
              ? 'Hələ heç bir elanınız yoxdur'
              : 'У вас пока нет объявлений'
            }
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/create-listing')}
          >
            <Text style={styles.createButtonText}>
              {language === 'az' ? 'İlk elanınızı yaradın' : 'Создать первое объявление'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.listingsContainer}>
          {userListings.map((listing) => (
            <View key={listing.id} style={styles.listingWrapper}>
              {/* Status Bar */}
              <View style={[styles.statusBar, { backgroundColor: getStatusColor(listing) }]}>
                <View style={styles.statusLeft}>
                  <Clock size={14} color="white" />
                  <Text style={styles.statusText}>{getStatusText(listing)}</Text>
                  {listing.storeId && (
                    <View style={styles.storeIndicator}>
                      <Text style={styles.storeIndicatorText}>
                        {language === 'az' ? 'Mağaza' : 'Магазин'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.viewsContainer}>
                  <Eye size={14} color="white" />
                  <Text style={styles.viewsText}>{listing.views}</Text>
                  {listing.purchasedViews && listing.purchasedViews > 0 && (
                    <Text style={styles.purchasedViewsText}>
                      (+{listing.purchasedViews})
                    </Text>
                  )}
                </View>
              </View>

              {/* Listing Card */}
              <ListingCard listing={listing} />

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => router.push(`/listing/edit/${listing.id}`)}
                >
                  <Edit size={14} color={Colors.primary} />
                  <Text style={styles.editButtonText}>
                    {language === 'az' ? 'Redaktə' : 'Ред.'}
                  </Text>
                </TouchableOpacity>

                {getDaysLeft(listing.expiresAt) <= 7 && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.extendButton]}
                    onPress={() => handleExtendListing(listing.id)}
                  >
                    <Clock size={14} color={Colors.success} />
                    <Text style={styles.extendButtonText}>
                      {language === 'az' ? 'Uzat' : 'Продлить'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionButton, styles.autoRenewalButton, autoRenewalSettings[listing.id] && styles.autoRenewalButtonActive]}
                  onPress={() => handleAutoRenewal(listing.id)}
                >
                  <RefreshCw size={14} color={autoRenewalSettings[listing.id] ? 'white' : Colors.secondary} />
                  <Text style={[styles.autoRenewalButtonText, autoRenewalSettings[listing.id] && styles.autoRenewalButtonTextActive]}>
                    {language === 'az' ? 'Avto' : 'Авто'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.promoteButton]}
                  onPress={() => router.push(`/listing/promote/${listing.id}`)}
                >
                  <TrendingUp size={14} color={Colors.secondary} />
                  <Text style={styles.promoteButtonText}>
                    {language === 'az' ? 'Təşviq' : 'Продв.'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.discountButton]}
                  onPress={() => router.push(`/listing/discount/${listing.id}`)}
                >
                  <Tag size={14} color={Colors.success} />
                  <Text style={styles.discountButtonText}>
                    {language === 'az' ? 'Endirim' : 'Скидка'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.archiveButton]}
                  onPress={() => handleArchiveListing(listing.id)}
                >
                  <Archive size={14} color={Colors.textSecondary} />
                  <Text style={styles.archiveButtonText}>
                    {language === 'az' ? 'Arxiv' : 'Архив'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authTitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: Colors.text,
  },
  authButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  notificationsContainer: {
    margin: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 8,
  },
  notificationItem: {
    marginBottom: 8,
  },
  notificationText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  header: {
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  quickActionInfo: {
    flex: 1,
  },
  quickActionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  quickActionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  quickActionButtonActive: {
    backgroundColor: Colors.primary,
  },
  quickActionText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 6,
    fontWeight: '500',
  },
  quickActionTextActive: {
    color: 'white',
  },
  settingsPanel: {
    margin: 16,
    marginTop: 0,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingsPanelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  settingValue: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  listingsContainer: {
    padding: 16,
  },
  listingWrapper: {
    marginBottom: 20,
    backgroundColor: Colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
    flex: 1,
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewsText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  editButton: {
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
  },
  editButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  promoteButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  promoteButtonText: {
    color: Colors.secondary,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  extendButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  extendButtonText: {
    color: Colors.success,
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  autoRenewalButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  autoRenewalButtonActive: {
    backgroundColor: Colors.secondary,
  },
  autoRenewalButtonText: {
    color: Colors.secondary,
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  autoRenewalButtonTextActive: {
    color: 'white',
  },
  archiveButton: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
  archiveButtonText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  archivedListingWrapper: {
    marginBottom: 20,
    backgroundColor: Colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    opacity: 0.7,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  archivedActions: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  reactivateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: Colors.success,
  },
  reactivateButtonText: {
    color: Colors.success,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  permanentDeleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  permanentDeleteButtonText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  storeIndicatorText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  purchasedViewsText: {
    color: 'white',
    fontSize: 10,
    marginLeft: 2,
    fontWeight: 'bold',
  },
  discountButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  discountButtonText: {
    color: Colors.success,
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  viewOffersButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  viewOffersButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  // quickActionCard: {
  //   flex: 1,
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   backgroundColor: Colors.card,
  //   borderRadius: 12,
  //   padding: 12,
  //   borderWidth: 1,
  //   borderColor: Colors.border,
  // },
  // quickActionIcon: {
  //   width: 40,
  //   height: 40,
  //   borderRadius: 20,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   marginRight: 10,
  //       flex: 1,
  // },
  // quickActionInfo: {
  //   flex: 1,
  // },
  // quickActionLabel: {
  //   fontSize: 12,
  //   color: Colors.textSecondary,
  //   marginBottom: 2,
  // },
  // quickActionValue: {
  //   fontSize: 16,
  //   fontWeight: '600',
  //   color: Colors.text,
  // },
});

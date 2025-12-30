import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useStoreStore } from '@/store/storeStore';
import { useUserStore } from '@/store/userStore';
import { useListingStore } from '@/store/listingStore';
import { useRatingStore } from '@/store/ratingStore'; // ✅ Import rating store
import StoreExpirationManager from '@/components/StoreExpirationManager';
import Colors from '@/constants/colors';
import { logger } from '@/utils/logger';
import {
  ArrowLeft,
  Store,
  Plus,
  Settings,
  Package,
  Star,
  Crown,
  Zap,
  TrendingUp,
  Trash2,
  Edit3,
  Eye,
  Users,
} from 'lucide-react-native';

export default function MyStoreScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const {
    getUserStore,
    deleteStore,
    getStoreUsage,
    checkStoreStatus,
    renewStore,
    canStoreBeReactivated,
    reactivateStore,
    getStorePlans,
  } = useStoreStore();
  const { currentUser } = useUserStore();
  const { listings, deleteListingEarly, promoteListingInStore } = useListingStore();

  const [showPromoteModal, setShowPromoteModal] = useState<boolean>(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [promotionType, setPromotionType] = useState<'vip' | 'premium' | 'featured'>('vip');
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [showRenewModal, setShowRenewModal] = useState<boolean>(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('basic');
  const [showExpiredStoreInfo, setShowExpiredStoreInfo] = useState<boolean>(false);
  const [isDeletingStore, setIsDeletingStore] = useState<boolean>(false);

  const userStore = currentUser ? getUserStore(currentUser.id) : null;
  const storeUsage = userStore ? getStoreUsage(userStore.id) : null;
  const currentStoreStatus = userStore ? checkStoreStatus(userStore.id) : null;
  const canReactivate = userStore ? canStoreBeReactivated(userStore.id) : false;
  const storePlans = getStorePlans();

  // ✅ Log screen access
  useEffect(() => {
    logger.info('[MyStore] Screen opened:', {
      hasStore: !!userStore,
      storeId: userStore?.id,
      storeName: userStore?.name,
      storeStatus: currentStoreStatus,
      adsUsed: storeUsage?.used,
      adsMax: storeUsage?.max,
    });
  }, []);

  // Get store listings
  const storeListings = userStore
    ? listings.filter(listing =>
      listing.userId === currentUser?.id &&
        listing.storeId === userStore.id &&
        !userStore.deletedListings.includes(listing.id),
    )
    : [];

  const handleDeleteStore = () => {
    // ✅ VALIDATION START

    // 1. Check authentication
    if (!currentUser || !currentUser.id) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Daxil olmamısınız' : 'Вы не вошли в систему',
      );
      return;
    }

    // 2. Check if userStore exists
    if (!userStore) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Mağaza tapılmadı' : 'Магазин не найден',
      );
      return;
    }

    // 3. Check ownership
    if (userStore.userId !== currentUser.id) {
      Alert.alert(
        language === 'az' ? 'İcazə yoxdur' : 'Нет разрешения',
        language === 'az'
          ? 'Siz bu mağazanı silə bilməzsiniz. Yalnız öz mağazanızı silə bilərsiniz.'
          : 'Вы не можете удалить этот магазин. Вы можете удалить только свой собственный магазин.',
      );
      return;
    }

    // 4. Check if already being deleted
    if (isDeletingStore) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Mağaza artıq silinir' : 'Магазин уже удаляется',
      );
      return;
    }

    // 5. Check if store is already deleted
    if (userStore.status === 'archived' || userStore.archivedAt) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Mağaza artıq silinib' : 'Магазин уже удален',
      );
      return;
    }

    // ✅ VALIDATION END

    // Get store data for detailed confirmation
    const activeListingsCount = storeListings.length;
    const deletedListingsCount = Array.isArray(userStore.deletedListings)
      ? userStore.deletedListings.length
      : 0;
    const followersCount = Array.isArray(userStore.followers)
      ? userStore.followers.length
      : 0;
    const totalListingsCount = activeListingsCount + deletedListingsCount;

    // First confirmation with detailed info
    Alert.alert(
      language === 'az' ? '⚠️ Mağazanı sil' : '⚠️ Удалить магазин',
      language === 'az'
        ? `Mağazanızı silmək istədiyinizə əminsiniz?\n\n📊 Mağaza məlumatları:\n• Ad: ${userStore.name}\n• Aktiv elanlar: ${activeListingsCount}\n• Silinmiş elanlar: ${deletedListingsCount}\n• Ümumi elanlar: ${totalListingsCount}\n• İzləyicilər: ${followersCount}\n• Status: ${userStore.status}\n\n${activeListingsCount > 0 ? '⚠️ DİQQƏT: Mağazada aktiv elanlar var! Əvvəlcə bütün elanları silməlisiniz.\n\n' : ''}⚠️ Bu əməliyyat geri qaytarıla bilməz!\n• Bütün mağaza məlumatları silinəcək\n• İzləyicilərə bildiriş göndəriləcək\n• Mağazaya giriş mümkün olmayacaq`
        : `Вы уверены, что хотите удалить свой магазин?\n\n📊 Данные магазина:\n• Название: ${userStore.name}\n• Активные объявления: ${activeListingsCount}\n• Удаленные объявления: ${deletedListingsCount}\n• Всего объявлений: ${totalListingsCount}\n• Подписчики: ${followersCount}\n• Статус: ${userStore.status}\n\n${activeListingsCount > 0 ? '⚠️ ВНИМАНИЕ: В магазине есть активные объявления! Сначала нужно удалить все объявления.\n\n' : ''}⚠️ Это действие нельзя отменить!\n• Все данные магазина будут удалены\n• Подписчики будут уведомлены\n• Доступ к магазину будет закрыт`,
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отmena',
          style: 'cancel',
          onPress: () => logger.info('[MyStore] Delete store cancelled'),
        },
        {
          text: language === 'az' ? 'Davam et' : 'Продолжить',
          style: 'destructive',
          onPress: () => {
            // Delay for emphatic second confirmation
            setTimeout(() => {
              // Second confirmation (more emphatic)
              Alert.alert(
                language === 'az' ? '🔴 SON XƏBƏRDARLIQ' : '🔴 ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ',
                language === 'az'
                  ? `"${userStore.name}" mağazasını həqiqətən silmək istəyirsiniz?\n\n❌ Bu əməliyyat GERİ QAYTARILA BİLMƏZ!\n❌ Bütün məlumatlar silinəcək!\n❌ ${followersCount} izləyici bildiriş alacaq!\n\nBu son təsdiqdir. Əminsinizsə, "MƏN ƏMİNƏM" düyməsinə basın.`
                  : `Вы действительно хотите удалить магазин "${userStore.name}"?\n\n❌ Это действие НЕЛЬЗЯ ОТМЕНИТЬ!\n❌ Все данные будут удалены!\n❌ ${followersCount} подписчиков получат уведомление!\n\nЭто последнее подтверждение. Если уверены, нажмите "Я УВЕРЕН".`,
                [
                  {
                    text: language === 'az' ? 'Ləğv et' : 'Отмена',
                    style: 'cancel',
                  },
                  {
                    text: language === 'az' ? 'MƏN ƏMİNƏM' : 'Я УВЕРЕН',
                    style: 'destructive',
                    onPress: async () => {
                      setIsDeletingStore(true);

                      try {
                        await deleteStore(userStore.id);

                        Alert.alert(
                          language === 'az' ? '✅ Uğurlu!' : '✅ Успешно!',
                          language === 'az'
                            ? `"${userStore.name}" mağazası silindi.\n\n${followersCount > 0 ? `${followersCount} izləyiciyə bildiriş göndərildi.\n\n` : ''}Siz indi yeni mağaza yarada bilərsiniz.`
                            : `Магазин "${userStore.name}" удален.\n\n${followersCount > 0 ? `${followersCount} подписчикам отправлено уведомление.\n\n` : ''}Теперь вы можете создать новый магазин.`,
                          [
                            {
                              text: 'OK',
                              onPress: () => router.back(),
                            },
                          ],
                          { cancelable: false },
                        );
                      } catch (error) {
                        let errorMessage = language === 'az'
                          ? 'Mağaza silinərkən xəta baş verdi'
                          : 'Ошибка при удалении магазина';

                        if (error instanceof Error) {
                          if (error.message.includes('tapılmadı') || error.message.includes('not found')) {
                            errorMessage = language === 'az' ? 'Mağaza tapılmadı' : 'Магазин не найден';
                          } else if (error.message.includes('silinib') || error.message.includes('already deleted') || error.message.includes('archived')) {
                            errorMessage = language === 'az' ? 'Mağaza artıq silinib' : 'Магазин уже удален';
                          } else if (error.message.includes('active listings') || error.message.includes('aktiv elan')) {
                            const match = error.message.match(/(\d+)/);
                            const count = match ? match[1] : '?';
                            errorMessage = language === 'az'
                              ? `Mağazada ${count} aktiv elan var. Əvvəlcə bütün elanları silməlisiniz.`
                              : `В магазине ${count} активных объявлений. Сначала удалите все объявления.`;
                          } else if (error.message.includes('network') || error.message.includes('timeout')) {
                            errorMessage = language === 'az'
                              ? 'Şəbəkə xətası. Yenidən cəhd edin.'
                              : 'Ошибка сети. Попробуйте снова.';
                          } else if (error.message.includes('Invalid')) {
                            errorMessage = language === 'az' ? 'Düzgün olmayan məlumat' : 'Некорректные данные';
                          }
                        }

                        Alert.alert(
                          language === 'az' ? 'Xəta' : 'Ошибка',
                          errorMessage,
                        );
                      } finally {
                        setIsDeletingStore(false);
                      }
                    },
                  },
                ],
              );
            }, 300); // Delay for emphasis
          },
        },
      ],
    );
  };

  const handleDeleteListing = (listingId: string) => {
    if (!userStore) {
      logger.warn('[MyStore] Delete listing attempt without store');
      return;
    }

    const listing = storeListings.find(l => l.id === listingId);
    logger.info('[MyStore] Delete listing initiated:', {
      storeId: userStore.id,
      listingId,
      listingTitle: listing?.title?.az || listing?.title?.ru,
    });

    Alert.alert(
      language === 'az' ? 'Elanı sil' : 'Удалить объявление',
      language === 'az'
        ? 'Bu elanı müddətindən əvvəl silmək istəyirsiniz?'
        : 'Хотите удалить это объявление до истечения срока?',
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
          onPress: () => logger.info('[MyStore] Delete listing cancelled'),
        },
        {
          text: language === 'az' ? 'Sil' : 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              logger.info('[MyStore] Deleting listing:', { storeId: userStore.id, listingId });
              await deleteListingEarly(userStore.id, listingId);
              logger.info('[MyStore] Listing deleted successfully:', { listingId });
              Alert.alert(
                language === 'az' ? 'Uğurlu!' : 'Успешно!',
                language === 'az' ? 'Elan silindi' : 'Объявление удалено',
              );
            } catch (error) {
              logger.error('[MyStore] Listing deletion failed:', error);
              Alert.alert(
                language === 'az' ? 'Xəta' : 'Ошибка',
                language === 'az' ? 'Elan silinərkən xəta baş verdi' : 'Ошибка при удалении объявления',
              );
            }
          },
        },
      ],
    );
  };

  const handlePromoteListing = async () => {
    if (!selectedListingId || !userStore) return;

    // Validation: Check if listing exists
    const listing = storeListings.find(l => l.id === selectedListingId);
    if (!listing) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Elan tapılmadı' : 'Объявление не найдено',
      );
      return;
    }

    const prices = {
      vip: 20,
      premium: 15,
      featured: 10,
    };

    const price = prices[promotionType];

    // ✅ Get wallet functions
    const { walletBalance, spendFromWallet } = useUserStore.getState();

    // ✅ Check balance first
    if (walletBalance < price) {
      Alert.alert(
        language === 'az' ? '💰 Kifayət qədər balans yoxdur' : '💰 Недостаточно средств',
        language === 'az'
          ? `İrəli çəkmək üçün ${price} AZN lazımdır.\nCari balansınız: ${walletBalance.toFixed(2)} AZN\n\nZəhmət olmasa balansınızı artırın.`
          : `Для продвижения требуется ${price} AZN.\nВаш текущий баланс: ${walletBalance.toFixed(2)} AZN\n\nПожалуйста, пополните баланс.`,
      );
      return;
    }

    Alert.alert(
      language === 'az' ? 'Elanı irəli çək' : 'Продвинуть объявление',
      language === 'az'
        ? `${promotionType.toUpperCase()} statusu üçün ${price} AZN ödəyəcəksiniz. Davam etmək istəyirsiniz?`
        : `Вы заплатите ${price} AZN за статус ${promotionType.toUpperCase()}. Продолжить?`,
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'az' ? 'Ödə' : 'Оплатить',
          onPress: async () => {
            try {
              // ✅ Process payment first
              const paymentSuccess = spendFromWallet(price);
              if (!paymentSuccess) {
                Alert.alert(
                  language === 'az' ? 'Ödəniş Xətası' : 'Ошибка оплаты',
                  language === 'az' ? 'Ödəniş zamanı xəta baş verdi' : 'Произошла ошибка при оплате',
                );
                return;
              }

              // ✅ Then promote
              await promoteListingInStore(selectedListingId, promotionType, price);
              setShowPromoteModal(false);
              setSelectedListingId(null);
              Alert.alert(
                language === 'az' ? 'Uğurlu!' : 'Успешно!',
                language === 'az' ? 'Elan irəli çəkildi' : 'Объявление продвинуто',
              );
            } catch (error) {
              Alert.alert(
                language === 'az' ? 'Xəta' : 'Ошибка',
                language === 'az' ? 'Ödəniş zamanı xəta baş verdi' : 'Ошибка при оплате',
              );
            }
          },
        },
      ],
    );
  };

  const handleRenewStore = async () => {
    if (!userStore) return;

    const selectedPlan = storePlans.find(p => p.id === selectedPlanId);
    if (!selectedPlan) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Paket seçilməyib' : 'Пакет не выбран',
      );
      return;
    }

    // ✅ Get wallet functions
    const { walletBalance, spendFromWallet } = useUserStore.getState();

    logger.info('[MyStore] Store renewal initiated:', {
      storeId: userStore.id,
      storeName: userStore.name,
      planId: selectedPlanId,
      planName: selectedPlan.name.az,
      price: selectedPlan.price,
      canReactivate,
    });

    // ✅ Check balance first
    if (walletBalance < selectedPlan.price) {
      logger.warn('[MyStore] Insufficient balance for renewal:', {
        required: selectedPlan.price,
        available: walletBalance,
      });
      Alert.alert(
        language === 'az' ? '💰 Kifayət qədər balans yoxdur' : '💰 Недостаточно средств',
        language === 'az'
          ? `Mağazanı yeniləmək üçün ${selectedPlan.price} AZN lazımdır.\nCari balansınız: ${walletBalance.toFixed(2)} AZN\n\nZəhmət olmasa balansınızı artırın.`
          : `Для обновления магазина требуется ${selectedPlan.price} AZN.\nВаш текущий баланс: ${walletBalance.toFixed(2)} AZN\n\nПожалуйста, пополните баланс.`,
      );
      return;
    }

    logger.info('[MyStore] Showing renewal confirmation');

    Alert.alert(
      language === 'az' ? 'Mağazanı yenilə' : 'Обновить магазин',
      language === 'az'
        ? `${selectedPlan.name[language]} paketi üçün ${selectedPlan.price} AZN ödəyəcəksiniz. Davam etmək istəyirsiniz?`
        : `Вы заплатите ${selectedPlan.price} AZN за пакет ${selectedPlan.name[language]}. Продолжить?`,
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
          onPress: () => logger.info('[MyStore] Renewal cancelled by user'),
        },
        {
          text: language === 'az' ? 'Ödə' : 'Оплатить',
          onPress: async () => {
            try {
              // ✅ Process payment first
              logger.info('[MyStore] Processing renewal payment:', { price: selectedPlan.price });
              const paymentSuccess = spendFromWallet(selectedPlan.price);
              if (!paymentSuccess) {
                logger.error('[MyStore] Renewal payment failed');
                Alert.alert(
                  language === 'az' ? 'Ödəniş Xətası' : 'Ошибка оплаты',
                  language === 'az' ? 'Ödəniş zamanı xəta baş verdi' : 'Произошла ошибка при оплате',
                );
                return;
              }

              logger.info('[MyStore] Payment successful, proceeding with renewal');

              // ✅ Then renew/reactivate
              if (canReactivate) {
                logger.info('[MyStore] Reactivating store:', { storeId: userStore.id });
                await reactivateStore(userStore.id, selectedPlanId);
                logger.info('[MyStore] Store reactivated successfully');
              } else {
                logger.info('[MyStore] Renewing store:', { storeId: userStore.id });
                await renewStore(userStore.id, selectedPlanId);
                logger.info('[MyStore] Store renewed successfully');
              }
              setShowRenewModal(false);
              Alert.alert(
                language === 'az' ? 'Uğurlu!' : 'Успешно!',
                language === 'az' ? 'Mağaza yeniləndi' : 'Магазин обновлен',
              );
            } catch (error) {
              logger.error('[MyStore] Store renewal/reactivation failed:', error);
              Alert.alert(
                language === 'az' ? 'Xəta' : 'Ошибка',
                language === 'az' ? 'Ödəniş zamanı xəta baş verdi' : 'Ошибка при оплате',
              );
            }
          },
        },
      ],
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'grace_period': return Colors.secondary;
      case 'deactivated': return Colors.error;
      case 'archived': return Colors.textSecondary;
      default: return Colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return language === 'az' ? 'Aktiv' : 'Активен';
      case 'grace_period': return language === 'az' ? 'Güzəşt müddəti' : 'Льготный период';
      case 'deactivated': return language === 'az' ? 'Deaktiv' : 'Деактивирован';
      case 'archived': return language === 'az' ? 'Arxivdə' : 'В архиве';
      default: return language === 'az' ? 'Naməlum' : 'Неизвестно';
    }
  };

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'az' ? 'Mənim Mağazam' : 'Мой магазин'}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyState}>
          <Store size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>
            {language === 'az' ? 'Giriş tələb olunur' : 'Требуется вход'}
          </Text>
          <Text style={styles.emptyDescription}>
            {language === 'az' ? 'Mağaza yaratmaq üçün hesabınıza daxil olun' : 'Войдите в аккаунт для создания магазина'}
          </Text>
        </View>
      </View>
    );
  }

  if (!userStore) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'az' ? 'Mənim Mağazam' : 'Мой магазин'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.noStoreContainer}>
            <View style={styles.noStoreIcon}>
              <Store size={64} color={Colors.primary} />
            </View>
            <Text style={styles.noStoreTitle}>
              {language === 'az' ? 'Mağaza yaradın' : 'Создайте магазин'}
            </Text>
            <Text style={styles.noStoreDescription}>
              {language === 'az'
                ? 'Öz mağazanızı yaradın və daha çox müştəriyə çatın. Əlavə mağaza yaratmaq üçün ödəniş edin.'
                : 'Создайте свой магазин и достигните большего количества клиентов. Оплатите для создания дополнительного магазина.'}
            </Text>

            <View style={styles.storeActions}>
              <TouchableOpacity
                style={styles.createStoreButton}
                onPress={() => router.push('/store/create')}
              >
                <Plus size={20} color="white" />
                <Text style={styles.createStoreButtonText}>
                  {language === 'az' ? 'Mağaza yarat' : 'Создать магазин'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.sectionDivider}>
                {language === 'az' ? 'Mənim Mağazam' : 'Мой магазин'}
              </Text>

              <View style={styles.myStoreOptions}>
                <TouchableOpacity
                  style={styles.myStoreOption}
                  onPress={() => router.push('/store/create')}
                >
                  <Plus size={16} color={Colors.primary} />
                  <Text style={styles.myStoreOptionText}>
                    {language === 'az' ? 'Əlavə mağaza yarat' : 'Создать дополнительный магазин'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'az' ? 'Mənim Mağazam' : 'Мой магазин'}
        </Text>
        <View style={styles.settingsContainer}>
          <TouchableOpacity
            onPress={() => setShowSettingsMenu(!showSettingsMenu)}
            style={styles.settingsButton}
          >
            <Settings size={24} color={Colors.text} />
          </TouchableOpacity>

          {showSettingsMenu && (
            <View style={styles.settingsMenu}>
              <TouchableOpacity
                style={styles.settingsMenuItem}
                onPress={() => {
                  setShowSettingsMenu(false);
                  router.push('/store/create');
                }}
              >
                <Plus size={16} color={Colors.primary} />
                <Text style={styles.settingsMenuText}>
                  {language === 'az' ? 'Yeni Mağaza Yarat' : 'Создать новый магазин'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingsMenuItem, styles.dangerMenuItem]}
                onPress={() => {
                  setShowSettingsMenu(false);
                  handleDeleteStore();
                }}
              >
                <Trash2 size={16} color={Colors.error} />
                <Text style={[styles.settingsMenuText, styles.dangerMenuText]}>
                  {language === 'az' ? 'Mağazanı Sil' : 'Удалить магазин'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {showSettingsMenu && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowSettingsMenu(false)}
        />
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Store Expiration Manager */}
        <StoreExpirationManager storeId={userStore.id} />

        {/* Store Info Card */}
        <View style={styles.storeCard}>
          <View style={styles.storeHeader}>
            <View style={styles.storeIconContainer}>
              <Store size={24} color={Colors.primary} />
            </View>
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{userStore.name}</Text>
              <Text style={styles.storeCategory}>{userStore.categoryName}</Text>
            </View>
            <View style={styles.storeStatus}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentStoreStatus || 'active') }]}>
                <Text style={styles.statusText}>
                  {getStatusText(currentStoreStatus || 'active')}
                </Text>
              </View>
              <StoreExpirationManager storeId={userStore.id} showCompact={true} />
            </View>
          </View>

          <View style={styles.storeStats}>
            <View style={styles.statItem}>
              <Package size={16} color={Colors.primary} />
              <Text style={styles.statValue}>{storeUsage?.used || 0}</Text>
              <Text style={styles.statLabel}>
                {language === 'az' ? 'Elan' : 'Объявлений'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Users size={16} color={Colors.secondary} />
              <Text style={styles.statValue}>{userStore.followers.length}</Text>
              <Text style={styles.statLabel}>
                {language === 'az' ? 'İzləyici' : 'Подписчиков'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Star size={16} color={Colors.secondary} />
              <Text style={styles.statValue}>
                {userStore.totalRatings > 0 ? (userStore.rating / Math.max(userStore.totalRatings, 1)).toFixed(1) : '0.0'}
              </Text>
              <Text style={styles.statLabel}>
                {language === 'az' ? 'Reytinq' : 'Рейтинг'}
              </Text>
            </View>
          </View>

          <View style={styles.usageBar}>
            <View style={styles.usageBarBackground}>
              <View
                style={[
                  styles.usageBarFill,
                  { width: `${((storeUsage?.used || 0) / (storeUsage?.max || 1)) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.usageText}>
              {language === 'az'
                ? `${storeUsage?.remaining || 0} elan qalıb`
                : `Осталось ${storeUsage?.remaining || 0} объявлений`}
            </Text>
          </View>
        </View>


        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>
            {language === 'az' ? 'Tez əməliyyatlar' : 'Быстрые действия'}
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/store/add-listing/${userStore.id}`)}
            >
              <Plus size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>
                {language === 'az' ? 'Elan əlavə et' : 'Добавить объявление'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/store/promote/${userStore.id}`)}
            >
              <Crown size={20} color={Colors.error} />
              <Text style={styles.actionButtonText}>
                {language === 'az' ? 'Mağazanı təşviq et' : 'Продвинуть магазин'}
              </Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* Store Listings */}
        <View style={styles.listingsCard}>
          <View style={styles.listingsHeader}>
            <Text style={styles.sectionTitle}>
              {language === 'az' ? 'Mağaza elanları' : 'Объявления магазина'}
            </Text>
            <Text style={styles.listingsCount}>
              {storeListings.length} {language === 'az' ? 'elan' : 'объявлений'}
            </Text>
          </View>

          {storeListings.length > 0 ? (
            <View style={styles.listingsList}>
              {storeListings.slice(0, 5).map((listing) => (
                <View key={listing.id} style={styles.listingItem}>
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingTitle} numberOfLines={1}>
                      {listing.title[language]}
                    </Text>
                    <View style={styles.listingMeta}>
                      <Text style={styles.listingPrice}>
                        {listing.priceByAgreement
                          ? (language === 'az' ? 'Razılaşma ilə' : 'По договоренности')
                          : `${listing.price} ${listing.currency}`
                        }
                      </Text>
                      <View style={styles.listingStats}>
                        <Eye size={12} color={Colors.textSecondary} />
                        <Text style={styles.listingViews}>{listing.views}</Text>
                      </View>
                    </View>

                    {(listing.isPremium || listing.isFeatured || listing.isVip) && (
                      <View style={styles.promotionBadges}>
                        {listing.isVip && (
                          <View style={[styles.promotionBadge, { backgroundColor: Colors.error }]}>
                            <Crown size={10} color="white" />
                            <Text style={styles.promotionBadgeText}>VIP</Text>
                          </View>
                        )}
                        {listing.isPremium && (
                          <View style={[styles.promotionBadge, { backgroundColor: Colors.secondary }]}>
                            <Star size={10} color="white" />
                            <Text style={styles.promotionBadgeText}>PREMIUM</Text>
                          </View>
                        )}
                        {listing.isFeatured && (
                          <View style={[styles.promotionBadge, { backgroundColor: Colors.primary }]}>
                            <Zap size={10} color="white" />
                            <Text style={styles.promotionBadgeText}>FEATURED</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  <View style={styles.listingActions}>
                    <TouchableOpacity
                      style={styles.listingActionButton}
                      onPress={() => {
                        setSelectedListingId(listing.id);
                        setShowPromoteModal(true);
                      }}
                    >
                      <TrendingUp size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.listingActionButton}
                      onPress={() => router.push(`/listing/edit/${listing.id}`)}
                    >
                      <Edit3 size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.listingActionButton}
                      onPress={() => handleDeleteListing(listing.id)}
                    >
                      <Trash2 size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {storeListings.length > 5 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => router.push(`/store/${userStore.id}/listings`)}
                >
                  <Text style={styles.viewAllButtonText}>
                    {language === 'az' ? 'Hamısını gör' : 'Посмотреть все'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyListings}>
              <Package size={32} color={Colors.textSecondary} />
              <Text style={styles.emptyListingsText}>
                {language === 'az' ? 'Hələ elan yoxdur' : 'Пока нет объявлений'}
              </Text>
              <TouchableOpacity
                style={styles.addFirstListingButton}
                onPress={() => router.push(`/store/add-listing/${userStore.id}`)}
              >
                <Text style={styles.addFirstListingButtonText}>
                  {language === 'az' ? 'İlk elanı əlavə et' : 'Добавить первое объявление'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>


      </ScrollView>

      {/* Promotion Modal */}
      <Modal
        visible={showPromoteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPromoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {language === 'az' ? 'Elanı irəli çək' : 'Продвинуть объявление'}
            </Text>

            <View style={styles.promotionOptions}>
              <TouchableOpacity
                style={[
                  styles.promotionOption,
                  promotionType === 'vip' && styles.selectedPromotionOption,
                ]}
                onPress={() => setPromotionType('vip')}
              >
                <Crown size={20} color={promotionType === 'vip' ? 'white' : Colors.error} />
                <View style={styles.promotionOptionInfo}>
                  <Text style={[
                    styles.promotionOptionTitle,
                    promotionType === 'vip' && styles.selectedPromotionOptionText,
                  ]}>VIP</Text>
                  <Text style={[
                    styles.promotionOptionPrice,
                    promotionType === 'vip' && styles.selectedPromotionOptionText,
                  ]}>20 AZN</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.promotionOption,
                  promotionType === 'premium' && styles.selectedPromotionOption,
                ]}
                onPress={() => setPromotionType('premium')}
              >
                <Star size={20} color={promotionType === 'premium' ? 'white' : Colors.secondary} />
                <View style={styles.promotionOptionInfo}>
                  <Text style={[
                    styles.promotionOptionTitle,
                    promotionType === 'premium' && styles.selectedPromotionOptionText,
                  ]}>PREMIUM</Text>
                  <Text style={[
                    styles.promotionOptionPrice,
                    promotionType === 'premium' && styles.selectedPromotionOptionText,
                  ]}>15 AZN</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.promotionOption,
                  promotionType === 'featured' && styles.selectedPromotionOption,
                ]}
                onPress={() => setPromotionType('featured')}
              >
                <Zap size={20} color={promotionType === 'featured' ? 'white' : Colors.primary} />
                <View style={styles.promotionOptionInfo}>
                  <Text style={[
                    styles.promotionOptionTitle,
                    promotionType === 'featured' && styles.selectedPromotionOptionText,
                  ]}>FEATURED</Text>
                  <Text style={[
                    styles.promotionOptionPrice,
                    promotionType === 'featured' && styles.selectedPromotionOptionText,
                  ]}>10 AZN</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowPromoteModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>
                  {language === 'az' ? 'Ləğv et' : 'Отмена'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handlePromoteListing}
              >
                <Text style={styles.modalConfirmButtonText}>
                  {language === 'az' ? 'Ödə' : 'Оплатить'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Renew Store Modal */}
      <Modal
        visible={showRenewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRenewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {canReactivate
                ? (language === 'az' ? 'Mağazanı reaktiv et' : 'Реактивировать магазин')
                : (language === 'az' ? 'Mağazanı yenilə' : 'Обновить магазин')
              }
            </Text>

            {currentStoreStatus === 'grace_period' && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  {language === 'az'
                    ? 'Mağazanızın müddəti bitib. 7 günlük güzəşt müddətindəsiniz.'
                    : 'Срок действия вашего магазина истек. У вас льготный период 7 дней.'}
                </Text>
              </View>
            )}

            {currentStoreStatus === 'deactivated' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {language === 'az'
                    ? 'Mağazanız deaktiv edilib. Reaktiv etmək üçün ödəniş edin.'
                    : 'Ваш магазин деактивирован. Оплатите для реактивации.'}
                </Text>
              </View>
            )}

            <View style={styles.planOptions}>
              {storePlans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planOption,
                    selectedPlanId === plan.id && styles.selectedPlanOption,
                  ]}
                  onPress={() => setSelectedPlanId(plan.id)}
                >
                  <View style={styles.planOptionInfo}>
                    <Text style={[
                      styles.planOptionTitle,
                      selectedPlanId === plan.id && styles.selectedPlanOptionText,
                    ]}>{plan.name[language]}</Text>
                    <Text style={[
                      styles.planOptionPrice,
                      selectedPlanId === plan.id && styles.selectedPlanOptionText,
                    ]}>{plan.price} AZN</Text>
                    <Text style={[
                      styles.planOptionFeatures,
                      selectedPlanId === plan.id && styles.selectedPlanOptionText,
                    ]}>{plan.maxAds} elan, {plan.duration} gün</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowRenewModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>
                  {language === 'az' ? 'Ləğv et' : 'Отмена'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleRenewStore}
              >
                <Text style={styles.modalConfirmButtonText}>
                  {language === 'az' ? 'Ödə' : 'Оплатить'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Expired Store Info Modal */}
      <Modal
        visible={showExpiredStoreInfo}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExpiredStoreInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {language === 'az' ? 'Mağaza müddəti haqqında' : 'О сроке действия магазина'}
            </Text>

            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>
                {language === 'az' ? 'Mağaza müddəti bitdikdə nə baş verir?' : 'Что происходит при истечении срока магазина?'}
              </Text>

              <View style={styles.infoSteps}>
                <View style={styles.infoStep}>
                  <View style={[styles.stepNumber, { backgroundColor: Colors.secondary }]}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>
                      {language === 'az' ? 'Güzəşt müddəti (7 gün)' : 'Льготный период (7 дней)'}
                    </Text>
                    <Text style={styles.stepDescription}>
                      {language === 'az'
                        ? 'Mağaza aktiv qalır, lakin yeniləmə xəbərdarlığı göstərilir'
                        : 'Магазин остается активным, но показывается предупреждение об обновлении'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoStep}>
                  <View style={[styles.stepNumber, { backgroundColor: Colors.error }]}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>
                      {language === 'az' ? 'Deaktivasiya' : 'Деактивация'}
                    </Text>
                    <Text style={styles.stepDescription}>
                      {language === 'az'
                        ? 'Mağaza və elanlar gizlədilir, müştərilər görə bilməz'
                        : 'Магазин и объявления скрываются, клиенты не могут их видеть'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoStep}>
                  <View style={[styles.stepNumber, { backgroundColor: Colors.textSecondary }]}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>
                      {language === 'az' ? 'Arxivləmə (30 gün sonra)' : 'Архивирование (через 30 дней)'}
                    </Text>
                    <Text style={styles.stepDescription}>
                      {language === 'az'
                        ? 'Mağaza arxivə köçürülür, məlumatlar qorunur'
                        : 'Магазин перемещается в архив, данные сохраняются'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>
                {language === 'az' ? 'Mağazanı necə bərpa etmək olar?' : 'Как восстановить магазин?'}
              </Text>
              <Text style={styles.infoText}>
                {language === 'az'
                  ? 'İstənilən vaxt yeni paket seçərək mağazanızı reaktiv edə bilərsiniz. Bütün məlumatlar və elanlar bərpa olunacaq.'
                  : 'Вы можете реактивировать магазин в любое время, выбрав новый пакет. Все данные и объявления будут восстановлены.'}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowExpiredStoreInfo(false)}
              >
                <Text style={styles.modalCancelButtonText}>
                  {language === 'az' ? 'Bağla' : 'Закрыть'}
                </Text>
              </TouchableOpacity>
              {(currentStoreStatus === 'deactivated' || currentStoreStatus === 'archived') && (
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={() => {
                    setShowExpiredStoreInfo(false);
                    setShowRenewModal(true);
                  }}
                >
                  <Text style={styles.modalConfirmButtonText}>
                    {language === 'az' ? 'Reaktiv et' : 'Реактивировать'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
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
  settingsContainer: {
    position: 'relative',
  },
  settingsButton: {
    padding: 8,
  },
  settingsMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: Colors.card,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 220,
    maxHeight: 400,
    zIndex: 1000,
  },
  settingsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dangerMenuItem: {
    borderBottomWidth: 0,
  },
  settingsMenuText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  dangerMenuText: {
    color: Colors.error,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  noStoreContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  noStoreIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  noStoreTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  noStoreDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  createStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  createStoreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  storeActions: {
    width: '100%',
    alignItems: 'center',
  },
  sectionDivider: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginVertical: 24,
    textAlign: 'center',
  },
  myStoreOptions: {
    width: '100%',
    gap: 12,
  },
  myStoreOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myStoreOptionText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 12,
    fontWeight: '500',
  },
  storeCard: {
    backgroundColor: Colors.card,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  storeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  storeCategory: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  storeStatus: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  storeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  usageBar: {
    marginTop: 8,
  },
  usageBarBackground: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  usageText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  actionsCard: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '32%',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
    textAlign: 'center',
  },
  listingsCard: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listingsCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  listingsList: {
    gap: 12,
  },
  listingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  listingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listingPrice: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  listingStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listingViews: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  promotionBadges: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  promotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  promotionBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '600',
    marginLeft: 2,
  },
  listingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  listingActionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  viewAllButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  emptyListings: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyListingsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 16,
  },
  addFirstListingButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addFirstListingButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  managementCard: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  managementOptions: {
    gap: 12,
  },
  managementOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dangerOption: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: Colors.error,
  },
  managementOptionText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 12,
    fontWeight: '500',
  },
  dangerOptionText: {
    color: Colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  promotionOptions: {
    gap: 12,
    marginBottom: 20,
  },
  promotionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedPromotionOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  promotionOptionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  promotionOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  promotionOptionPrice: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  selectedPromotionOptionText: {
    color: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  modalConfirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  renewButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  renewButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  warningText: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
  planOptions: {
    gap: 12,
    marginBottom: 20,
  },
  planOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedPlanOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  planOptionInfo: {
    flex: 1,
  },
  planOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  planOptionPrice: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  planOptionFeatures: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  selectedPlanOptionText: {
    color: 'white',
  },
  warningCard: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
    marginLeft: 8,
  },
  warningDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  warningAction: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  warningActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
    marginLeft: 8,
  },
  errorDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  errorAction: {
    backgroundColor: Colors.error,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  errorActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  archivedCard: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.textSecondary,
  },
  archivedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  archivedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  archivedDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  archivedAction: {
    backgroundColor: Colors.textSecondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  archivedActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  infoButton: {
    backgroundColor: Colors.textSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  infoButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 20,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  infoSteps: {
    gap: 16,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  promotionSection: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  promotionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  promotionButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  promotionButtonContent: {
    flex: 1,
  },
  promotionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  promotionButtonDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  promotionButtonArrow: {
    marginLeft: 8,
  },
});

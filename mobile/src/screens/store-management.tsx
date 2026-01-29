import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLanguageStore } from '../../../store/languageStore';
import { useStoreStore } from '../../../store/storeStore';
import { useUserStore } from '../../../store/userStore';
import { useListingStore } from '../../../store/listingStore';
import StoreExpirationManager from '../../../components/StoreExpirationManager';
import Colors from '../../../constants/colors';
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
  Calendar,
  DollarSign,
  Users,
  BarChart3,
  CreditCard,
  ShoppingBag,
  Palette,
} from 'lucide-react-native';
import { users } from '../../../mocks/users';

import { logger } from '../../../utils/logger';
export default function StoreManagementScreen() {
  const navigation = useNavigation();
  const { language } = useLanguageStore();
  const { stores, getUserStore, deleteStore, getStoreUsage, getAllUserStores } = useStoreStore();
  const { isAuthenticated, walletBalance, bonusBalance, spendFromWallet } = useUserStore();
  const { listings, deleteListingEarly, promoteListingInStore } = useListingStore();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [promotionType, setPromotionType] = useState<'vip' | 'premium' | 'featured'>('vip');
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [isDeletingStore, setIsDeletingStore] = useState<boolean>(false);

  // Mock current user (first user in the list)
  const currentUser = users[0];
  const userStores = currentUser ? getAllUserStores(currentUser.id) : [];
  const primaryStore = userStores.length > 0 ? userStores[0] : null;

  const handleCreateStore = (isFirstStore: boolean = false) => {
    logger.debug('🏪 handleCreateStore called - SIMPLE NAVIGATION');
    logger.debug('isFirstStore:', isFirstStore);

    // IMPORTANT: NO PAYMENT HERE - Just navigate to store creation
    // Payment will be handled AFTER package selection in the store creation flow
    navigation.navigate('/store/create');
  };

  const handleDeleteStore = (storeId: string) => {
    // ✅ VALIDATION START

    // 1. Check authentication
    if (!currentUser || !currentUser.id) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Daxil olmamısınız' : 'Вы не вошли в систему',
      );
      return;
    }

    // 2. Validate storeId
    if (!storeId || typeof storeId !== 'string' || storeId.trim().length === 0) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Düzgün olmayan mağaza ID' : 'Некорректный ID магазина',
      );
      return;
    }

    // 3. Find store
    const store = stores.find(s => s.id === storeId);

    if (!store) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Mağaza tapılmadı' : 'Магазин не найден',
      );
      return;
    }

    // 4. Check ownership
    if (store.userId !== currentUser.id) {
      Alert.alert(
        language === 'az' ? 'İcazə yoxdur' : 'Нет разрешения',
        language === 'az'
          ? 'Siz bu mağazanı silə bilməzsiniz. Yalnız öz mağazalarınızı silə bilərsiniz.'
          : 'Вы не можете удалить этот магазин. Вы можете удалить только свои собственные магазины.',
      );
      return;
    }

    // 5. Check if already being deleted
    if (isDeletingStore) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Mağaza artıq silinir' : 'Магазин уже удаляется',
      );
      return;
    }

    // 6. Check if store is already deleted
    if (store.status === 'archived' || store.archivedAt) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Mağaza artıq silinib' : 'Магазин уже удален',
      );
      return;
    }

    // ✅ VALIDATION END

    // Get store data for detailed confirmation
    const storeListings = listings.filter(l =>
      l.storeId === storeId &&
      !l.deletedAt &&
      !store.deletedListings.includes(l.id),
    );
    const activeListingsCount = storeListings.length;
    const deletedListingsCount = Array.isArray(store.deletedListings)
      ? store.deletedListings.length
      : 0;
    const followersCount = Array.isArray(store.followers)
      ? store.followers.length
      : 0;
    const totalListingsCount = activeListingsCount + deletedListingsCount;
    const storeUsage = getStoreUsage(storeId);

    // First confirmation with detailed info
    Alert.alert(
      language === 'az' ? '⚠️ Mağazanı sil' : '⚠️ Удалить магазин',
      language === 'az'
        ? `"${store.name}" mağazasını silmək istədiyinizə əminsiniz?\n\n📊 Mağaza məlumatları:\n• Ad: ${store.name}\n• Aktiv elanlar: ${activeListingsCount}\n• Silinmiş elanlar: ${deletedListingsCount}\n• Ümumi elanlar: ${totalListingsCount}\n• İzləyicilər: ${followersCount}\n• İstifadə: ${storeUsage?.used || 0}/${storeUsage?.max || 0}\n• Status: ${store.status}\n\n${activeListingsCount > 0 ? '⚠️ DİQQƏT: Mağazada aktiv elanlar var! Əvvəlcə bütün elanları silməlisiniz.\n\n' : ''}⚠️ Bu əməliyyat geri qaytarıla bilməz!\n• Bütün mağaza məlumatları silinəcək\n• İzləyicilərə bildiriş göndəriləcək\n• Mağazaya giriş mümkün olmayacaq`
        : `Вы уверены, что хотите удалить магазин "${store.name}"?\n\n📊 Данные магазина:\n• Название: ${store.name}\n• Активные объявления: ${activeListingsCount}\n• Удаленные объявления: ${deletedListingsCount}\n• Всего объявлений: ${totalListingsCount}\n• Подписчики: ${followersCount}\n• Использование: ${storeUsage?.used || 0}/${storeUsage?.max || 0}\n• Статус: ${store.status}\n\n${activeListingsCount > 0 ? '⚠️ ВНИМАНИЕ: В магазине есть активные объявления! Сначала нужно удалить все объявления.\n\n' : ''}⚠️ Это действие нельзя отменить!\n• Все данные магазина будут удалены\n• Подписчики будут уведомлены\n• Доступ к магазину будет закрыт`,
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
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
                  ? `"${store.name}" mağazasını həqiqətən silmək istəyirsiniz?\n\n❌ Bu əməliyyat GERİ QAYTARILA BİLMƏZ!\n❌ Bütün məlumatlar silinəcək!\n❌ ${followersCount} izləyici bildiriş alacaq!\n\nBu son təsdiqdir. Əminsinizsə, "MƏN ƏMİNƏM" düyməsinə basın.`
                  : `Вы действительно хотите удалить магазин "${store.name}"?\n\n❌ Это действие НЕЛЬЗЯ ОТМЕНИТЬ!\n❌ Все данные будут удалены!\n❌ ${followersCount} подписчиков получат уведомление!\n\nЭто последнее подтверждение. Если уверены, нажмите "Я УВЕРЕН".`,
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
                        await deleteStore(storeId);

                        Alert.alert(
                          language === 'az' ? '✅ Uğurlu!' : '✅ Успешно!',
                          language === 'az'
                            ? `"${store.name}" mağazası silindi.\n\n${followersCount > 0 ? `${followersCount} izləyiciyə bildiriş göndərildi.\n\n` : ''}Siz indi yeni mağaza yarada bilərsiniz.`
                            : `Магазин "${store.name}" удален.\n\n${followersCount > 0 ? `${followersCount} подписчикам отправлено уведомление.\n\n` : ''}Теперь вы можете создать новый магазин.`,
                          [
                            {
                              text: 'OK',
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

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'az' ? 'Mağaza yarat' : 'Создать магазин'}
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'az' ? 'Mağaza yarat' : 'Создать магазин'}
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
                  navigation.navigate('/store-settings');
                }}
              >
                <Settings size={16} color={Colors.primary} />
                <Text style={styles.settingsMenuText}>
                  {language === 'az' ? 'Mağaza Tənzimləmələri' : 'Настройки магазина'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsMenuItem}
                onPress={() => {
                  setShowSettingsMenu(false);
                  navigation.navigate('/store-theme');
                }}
              >
                <Palette size={16} color={Colors.primary} />
                <Text style={styles.settingsMenuText}>
                  {language === 'az' ? 'Mağaza Görünüşü' : 'Внешний вид магазина'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsMenuItem}
                onPress={() => {
                  setShowSettingsMenu(false);
                  navigation.navigate('/store-reviews');
                }}
              >
                <Star size={16} color={Colors.primary} />
                <Text style={styles.settingsMenuText}>
                  {language === 'az' ? 'Rəyləri İdarə Et' : 'Управлять отзывами'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsMenuItem}
                onPress={() => {
                  setShowSettingsMenu(false);
                  navigation.navigate('/payment-history');
                }}
              >
                <CreditCard size={16} color={Colors.primary} />
                <Text style={styles.settingsMenuText}>
                  {language === 'az' ? 'Ödəniş Tarixçəsi' : 'История платежей'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsMenuItem}
                onPress={() => {
                  setShowSettingsMenu(false);
                  navigation.navigate('/blocked-users');
                }}
              >
                <Users size={16} color={Colors.primary} />
                <Text style={styles.settingsMenuText}>
                  {language === 'az' ? 'Bloklanmış İstifadəçilər' : 'Заблокированные пользователи'}
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
        {/* Create Store Section */}
        <View style={styles.createStoreSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Plus size={24} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>
              {language === 'az' ? 'Mağaza yarat' : 'Создать магазин'}
            </Text>
          </View>

          <View style={styles.createStoreOptions}>
            <TouchableOpacity
              style={styles.createStoreOption}
              onPress={() => handleCreateStore(userStores.length === 0)}
            >
              <View style={styles.createStoreOptionIcon}>
                <Store size={32} color={Colors.primary} />
              </View>
              <View style={styles.createStoreOptionContent}>
                <Text style={styles.createStoreOptionTitle}>
                  {language === 'az' ? 'İlk mağaza' : 'Первый магазин'}
                </Text>
                <Text style={styles.createStoreOptionDescription}>
                  {language === 'az'
                    ? 'İlk mağazanızı yaradın'
                    : 'Создайте свой первый магазин'}
                </Text>
                <Text style={styles.createStoreOptionPrice}>
                  100 AZN
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.createStoreOption,
                userStores.length === 0 && styles.createStoreOptionDisabled,
              ]}
              onPress={() => {
                if (userStores.length === 0) {
                  Alert.alert(
                    language === 'az' ? 'Xəta' : 'Ошибка',
                    language === 'az'
                      ? 'Əlavə mağaza yaratmaq üçün əvvəlcə ilk mağazanızı yaradın'
                      : 'Для создания дополнительного магазина сначала создайте первый магазин',
                  );
                  return;
                }
                handleCreateStore(false);
              }}
            >
              <View style={styles.createStoreOptionIcon}>
                <ShoppingBag size={32} color={userStores.length === 0 ? Colors.textSecondary : Colors.secondary} />
              </View>
              <View style={styles.createStoreOptionContent}>
                <Text style={[
                  styles.createStoreOptionTitle,
                  userStores.length === 0 && styles.createStoreOptionTitleDisabled,
                ]}>
                  {language === 'az' ? 'Əlavə mağaza' : 'Дополнительный магазин'}
                </Text>
                <Text style={[
                  styles.createStoreOptionDescription,
                  userStores.length === 0 && styles.createStoreOptionDescriptionDisabled,
                ]}>
                  {language === 'az'
                    ? userStores.length > 0
                      ? 'Daha çox satış üçün əlavə mağaza (25% endirim)'
                      : 'İlk mağaza yaratdıqdan sonra mövcud olacaq'
                    : userStores.length > 0
                      ? 'Дополнительный магазин для больших продаж (скидка 25%)'
                      : 'Доступно после создания первого магазина'}
                </Text>
                <Text style={[
                  styles.createStoreOptionPrice,
                  userStores.length === 0 && styles.createStoreOptionPriceDisabled,
                ]}>
                  {userStores.length > 0 ? '75 AZN' : '---'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* My Stores Section */}
        <View style={styles.myStoresSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Store size={24} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>
              {language === 'az' ? 'Mənim Mağazam' : 'Мой магазин'}
            </Text>
            <Text style={styles.storeCount}>
              {userStores.length} {language === 'az' ? 'mağaza' : 'магазинов'}
            </Text>
          </View>

          {userStores.length > 0 ? (
            <View style={styles.storesList}>
              {userStores.map((store) => {
                const storeUsage = getStoreUsage(store.id);
                const storeListings = listings.filter(listing =>
                  listing.userId === currentUser?.id &&
                  listing.storeId === store.id &&
                  !store.deletedListings.includes(listing.id),
                );

                return (
                  <View key={store.id} style={styles.storeCard}>
                    {/* Store Expiration Manager */}
                    <StoreExpirationManager storeId={store.id} showCompact={true} />

                    <View style={styles.storeHeader}>
                      <View style={styles.storeIconContainer}>
                        <Store size={20} color={Colors.primary} />
                      </View>
                      <View style={styles.storeInfo}>
                        <Text style={styles.storeName}>{store.name}</Text>
                        <Text style={styles.storeCategory}>{store.categoryName}</Text>
                      </View>
                      <View style={styles.storeActions}>
                        <TouchableOpacity
                          style={styles.storeActionButton}
                          onPress={() => navigation.navigate('/store/{store.id}')}
                        >
                          <Eye size={16} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.storeActionButton}
                          onPress={() => handleDeleteStore(store.id)}
                        >
                          <Trash2 size={16} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.storeStats}>
                      <View style={styles.statItem}>
                        <Package size={14} color={Colors.primary} />
                        <Text style={styles.statValue}>{storeUsage?.used || 0}</Text>
                        <Text style={styles.statLabel}>
                          {language === 'az' ? 'Elan' : 'Объявлений'}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Users size={14} color={Colors.secondary} />
                        <Text style={styles.statValue}>{store.followers.length}</Text>
                        <Text style={styles.statLabel}>
                          {language === 'az' ? 'İzləyici' : 'Подписчиков'}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Star size={14} color={Colors.secondary} />
                        <Text style={styles.statValue}>
                          {store.totalRatings > 0 ? (store.rating / Math.max(store.totalRatings, 1)).toFixed(1) : '0.0'}
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

                    <View style={styles.storeQuickActions}>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => navigation.navigate('/store/add-listing/{store.id}')}
                      >
                        <Plus size={16} color={Colors.primary} />
                        <Text style={styles.quickActionText}>
                          {language === 'az' ? 'Elan əlavə et' : 'Добавить объявление'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => navigation.navigate('/store-analytics?storeId={store.id}')}
                      >
                        <BarChart3 size={16} color={Colors.primary} />
                        <Text style={styles.quickActionText}>
                          {language === 'az' ? 'Analitika' : 'Аналитика'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.noStoresContainer}>
              <View style={styles.noStoresIcon}>
                <Store size={48} color={Colors.textSecondary} />
              </View>
              <Text style={styles.noStoresTitle}>
                {language === 'az' ? 'Hələ mağaza yoxdur' : 'Пока нет магазинов'}
              </Text>
              <Text style={styles.noStoresDescription}>
                {language === 'az'
                  ? 'İlk mağazanızı yaradın və satışa başlayın'
                  : 'Создайте свой первый магазин и начните продавать'}
              </Text>
              <TouchableOpacity
                style={styles.createFirstStoreButton}
                onPress={() => handleCreateStore(true)}
              >
                <Plus size={16} color="white" />
                <Text style={styles.createFirstStoreButtonText}>
                  {language === 'az' ? 'İlk mağaza yarat (100 AZN)' : 'Создать первый магазин (100 AZN)'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Store Management Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsSectionTitle}>
            {language === 'az' ? 'Mağaza idarəetməsi məsləhətləri' : 'Советы по управлению магазином'}
          </Text>

          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <View style={styles.tipIcon}>
                <Star size={16} color={Colors.secondary} />
              </View>
              <Text style={styles.tipText}>
                {language === 'az'
                  ? 'Keyfiyyətli şəkillər və təfərrüatlı təsvirlər əlavə edin'
                  : 'Добавляйте качественные фото и подробные описания'}
              </Text>
            </View>

            <View style={styles.tipItem}>
              <View style={styles.tipIcon}>
                <TrendingUp size={16} color={Colors.primary} />
              </View>
              <Text style={styles.tipText}>
                {language === 'az'
                  ? 'Elanlarınızı irəli çəkərək daha çox görünürlük əldə edin'
                  : 'Продвигайте объявления для большей видимости'}
              </Text>
            </View>

            <View style={styles.tipItem}>
              <View style={styles.tipIcon}>
                <Users size={16} color={Colors.success} />
              </View>
              <Text style={styles.tipText}>
                {language === 'az'
                  ? 'Müştərilərlə aktiv ünsiyyət qurun və sürətli cavab verin'
                  : 'Активно общайтесь с клиентами и быстро отвечайте'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  settingsMenuText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
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
  createStoreSection: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  storeCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  createStoreOptions: {
    gap: 12,
  },
  createStoreOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  createStoreOptionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  createStoreOptionContent: {
    flex: 1,
  },
  createStoreOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  createStoreOptionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  createStoreOptionPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  myStoresSection: {
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
  storesList: {
    gap: 16,
  },
  storeCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  storeCategory: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  storeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  storeActionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: Colors.card,
  },
  storeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 2,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  usageBar: {
    marginBottom: 12,
  },
  usageBarBackground: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  usageText: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  storeQuickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
  },
  noStoresContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noStoresIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noStoresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  noStoresDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  createFirstStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  createFirstStoreButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  tipsSection: {
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
  tipsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  createStoreOptionDisabled: {
    opacity: 0.6,
  },
  createStoreOptionTitleDisabled: {
    color: Colors.textSecondary,
  },
  createStoreOptionDescriptionDisabled: {
    color: Colors.textSecondary,
  },
  createStoreOptionPriceDisabled: {
    color: Colors.textSecondary,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useListingStore } from '@/store/listingStore';
import { useUserStore } from '@/store/userStore';
import { adPackages } from '@/constants/adPackages';
import Colors from '@/constants/colors';
import {
  ArrowLeft,
  Archive,
  RefreshCw,
  Calendar,
  Eye,
  MapPin,
  Package,
  Trash2,
} from 'lucide-react-native';
import { logger } from '@/utils/logger';

export default function ArchivedListingsScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { getArchivedListings, reactivateListing, deleteListing } = useListingStore();
  const { currentUser, walletBalance, bonusBalance, spendFromWallet, spendFromBonus } = useUserStore();

  const [isReactivating, setIsReactivating] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('standard-30');

  // Get archived listings
  const archivedListings = currentUser ? getArchivedListings(currentUser.id) : [];

  const handleReactivate = async (listingId: string) => {
    // ✅ VALIDATION START

    // 1. Check authentication
    if (!currentUser || !currentUser.id) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Daxil olmamısınız' : 'Вы не вошли в систему',
      );
      return;
    }

    // 2. Check if already reactivating
    if (isReactivating) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Elan artıq aktivləşdirilir' : 'Объявление уже активируется',
      );
      return;
    }

    // 3. Find listing
    const listing = archivedListings.find(l => l.id === listingId);

    if (!listing) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Elan tapılmadı' : 'Объявление не найдено',
      );
      return;
    }

    // 4. Check ownership
    if (listing.userId !== currentUser.id) {
      Alert.alert(
        language === 'az' ? 'İcazə yoxdur' : 'Нет разрешения',
        language === 'az'
          ? 'Siz bu elanı aktivləşdirə bilməzsiniz'
          : 'Вы не можете активировать это объявление',
      );
      return;
    }

    // 5. Find selected package
    const renewalPackage = adPackages.find(p => p.id === selectedPackageId);

    if (!renewalPackage) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Paket tapılmadı' : 'Пакет не найден',
      );
      return;
    }

    // 6. Check balance
    const totalBalance = walletBalance + bonusBalance;

    if (totalBalance < renewalPackage.price) {
      Alert.alert(
        language === 'az' ? 'Kifayət qədər balans yoxdur' : 'Недостаточно средств',
        language === 'az'
          ? `Bu paket üçün ${renewalPackage.price.toFixed(2)} AZN lazımdır. Balansınız: ${totalBalance.toFixed(2)} AZN`
          : `Для этого пакета требуется ${renewalPackage.price.toFixed(2)} AZN. Ваш баланс: ${totalBalance.toFixed(2)} AZN`,
      );
      return;
    }

    // ✅ VALIDATION END

    // Show confirmation
    Alert.alert(
      language === 'az' ? 'Elanı yenidən aktivləşdir' : 'Реактивировать объявление',
      language === 'az'
        ? `"${listing.title.az}" elanını ${renewalPackage.name.az} paketi ilə (${renewalPackage.price} AZN) yenidən aktivləşdirmək istədiyinizə əminsiniz?\n\nElan ${renewalPackage.duration} gün aktiv olacaq.`
        : `Вы уверены, что хотите реактивировать объявление "${listing.title.ru}" с пакетом ${renewalPackage.name.ru} (${renewalPackage.price} AZN)?\n\nОбъявление будет активно ${renewalPackage.duration} дней.`,
      [
        { text: language === 'az' ? 'Ləğv et' : 'Отмена', style: 'cancel' },
        {
          text: language === 'az' ? 'Aktivləşdir' : 'Активировать',
          onPress: async () => {
            setIsReactivating(listingId);

            // Store payment amounts for rollback
            let spentFromBonusAmount = 0;
            let spentFromWalletAmount = 0;

            try {
              // Process payment
              let remainingAmount = renewalPackage.price;

              if (bonusBalance > 0) {
                spentFromBonusAmount = Math.min(bonusBalance, remainingAmount);
                spendFromBonus(spentFromBonusAmount);
                remainingAmount -= spentFromBonusAmount;
              }

              if (remainingAmount > 0) {
                spentFromWalletAmount = remainingAmount;
                spendFromWallet(remainingAmount);
              }

              await reactivateListing(listingId, selectedPackageId);

              Alert.alert(
                language === 'az' ? 'Uğurlu!' : 'Успешно!',
                language === 'az'
                  ? `"${listing.title.az}" elanı yenidən aktivləşdirildi və ${renewalPackage.duration} gün aktiv olacaq!`
                  : `Объявление "${listing.title.ru}" реактивировано и будет активно ${renewalPackage.duration} дней!`,
                [{ text: 'OK' }],
                { cancelable: false },
              );
            } catch (error) {
              // Rollback payment
              const { addToWallet, addToBonus } = useUserStore.getState() as any;

              // call rollback functions only if they exist to avoid runtime/type errors
              if (spentFromBonusAmount > 0 && typeof addToBonus === 'function') {
                addToBonus(spentFromBonusAmount);
              }

              if (spentFromWalletAmount > 0 && typeof addToWallet === 'function') {
                addToWallet(spentFromWalletAmount);
              }

              let errorMessage = language === 'az'
                ? 'Elan aktivləşdirilə bilmədi'
                : 'Не удалось активировать объявление';

              if (error instanceof Error) {
                if (error.message.includes('tapılmadı') || error.message.includes('not found')) {
                  errorMessage = language === 'az' ? 'Elan və ya paket tapılmadı' : 'Объявление или пакет не найдены';
                } else if (error.message.includes('network') || error.message.includes('timeout')) {
                  errorMessage = language === 'az' ? 'Şəbəkə xətası. Yenidən cəhd edin.' : 'Ошибка сети. Попробуйте снова.';
                }
              }

              errorMessage += language === 'az'
                ? '\n\nÖdənişiniz geri qaytarıldı.'
                : '\n\nВаш платеж был возвращен.';

              Alert.alert(
                language === 'az' ? 'Xəta' : 'Ошибка',
                errorMessage,
              );
            } finally {
              setIsReactivating(null);
            }
          },
        },
      ],
    );
  };

  const handleDelete = async (listingId: string) => {
    const listing = archivedListings.find(l => l.id === listingId);

    if (!listing) return;

    Alert.alert(
      language === 'az' ? 'Elanı sil' : 'Удалить объявление',
      language === 'az'
        ? `"${listing.title.az}" elanını silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`
        : `Вы уверены, что хотите удалить объявление "${listing.title.ru}"? Это действие нельзя отменить.`,
      [
        { text: language === 'az' ? 'Ləğv et' : 'Отмена', style: 'cancel' },
        {
          text: language === 'az' ? 'Sil' : 'Удалить',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(listingId);

            try {
              deleteListing(listingId);

              Alert.alert(
                language === 'az' ? 'Uğurlu!' : 'Успешно!',
                language === 'az' ? 'Elan silindi' : 'Объявление удалено',
              );
            } catch (error) {
              Alert.alert(
                language === 'az' ? 'Xəta' : 'Ошибка',
                language === 'az' ? 'Elan silinə bilmədi' : 'Не удалось удалить объявление',
              );
            } finally {
              setIsDeleting(null);
            }
          },
        },
      ],
    );
  };

  const renderListing = ({ item }: { item: any }) => {
    const isReactivatingThis = isReactivating === item.id;
    const isDeletingThis = isDeleting === item.id;
    const isProcessing = isReactivatingThis || isDeletingThis;

    const archivedDate = item.archivedAt ? new Date(item.archivedAt) : null;
    const archivedDaysAgo = archivedDate
      ? Math.floor((Date.now() - archivedDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return (
      <View style={[styles.listingCard, isProcessing && styles.listingCardProcessing]}>
        <Image
          source={{ uri: item.images[0] || 'https://via.placeholder.com/100' }}
          style={styles.listingImage}
          // defaultSource={require('@/assets/images/placeholder.png')}
        />

        <View style={styles.listingInfo}>
          <Text style={styles.listingTitle} numberOfLines={2}>
            {item.title[language as keyof typeof item.title]}
          </Text>

          <View style={styles.listingDetails}>
            <MapPin size={14} color={Colors.textSecondary} />
            <Text style={styles.listingLocation} numberOfLines={1}>
              {item.location[language as keyof typeof item.location]}
            </Text>
          </View>

          <View style={styles.listingMeta}>
            <View style={styles.metaItem}>
              <Archive size={12} color={Colors.textSecondary} />
              <Text style={styles.metaText}>
                {archivedDaysAgo} {language === 'az' ? 'gün əvvəl' : 'дней назад'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Eye size={12} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{item.views || 0}</Text>
            </View>
          </View>

          <View style={styles.listingActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.reactivateButton, isProcessing && styles.actionButtonDisabled]}
              onPress={() => handleReactivate(item.id)}
              disabled={isProcessing}
            >
              {isReactivatingThis ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <RefreshCw size={16} color="white" />
              )}
              <Text style={styles.actionButtonText}>
                {isReactivatingThis
                  ? (language === 'az' ? 'Aktivləşir...' : 'Активация...')
                  : (language === 'az' ? 'Yenidən aktivləşdir' : 'Реактивировать')
                }
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton, isProcessing && styles.actionButtonDisabled]}
              onPress={() => handleDelete(item.id)}
              disabled={isProcessing}
            >
              {isDeletingThis ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Trash2 size={16} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'az' ? 'Arxivlənmiş Elanlar' : 'Архивированные объявления'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {language === 'az' ? 'Daxil olmamısınız' : 'Вы не вошли в систему'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'az' ? 'Arxivlənmiş Elanlar' : 'Архивированные объявления'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {archivedListings.length === 0 ? (
        <View style={styles.emptyState}>
          <Archive size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>
            {language === 'az' ? 'Arxivlənmiş elan yoxdur' : 'Нет архивированных объявлений'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {language === 'az'
              ? 'Müddəti bitmiş elanlar avtomatik olaraq buraya köçürülür'
              : 'Объявления с истекшим сроком автоматически перемещаются сюда'
            }
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* Package Selector */}
          <View style={styles.packageSection}>
            <Text style={styles.sectionTitle}>
              {language === 'az' ? 'Yeniləmə paketi seçin' : 'Выберите пакет продления'}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.packageScroll}>
              {adPackages.map(pkg => (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.packageCard,
                    selectedPackageId === pkg.id && styles.packageCardSelected,
                  ]}
                  onPress={() => setSelectedPackageId(pkg.id)}
                >
                  <Text style={styles.packageName}>
                    {pkg.name[language as keyof typeof pkg.name]}
                  </Text>
                  <Text style={styles.packagePrice}>
                    {pkg.price} AZN
                  </Text>
                  <Text style={styles.packageDuration}>
                    {pkg.duration} {language === 'az' ? 'gün' : 'дней'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Archived Listings */}
          <View style={styles.listingsSection}>
            <Text style={styles.sectionTitle}>
              {language === 'az' ? `Arxivlənmiş elanlar (${archivedListings.length})` : `Архивированные объявления (${archivedListings.length})`}
            </Text>

            <FlatList
              data={archivedListings}
              renderItem={renderListing}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        </ScrollView>
      )}
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
    padding: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  packageSection: {
    padding: 16,
    backgroundColor: Colors.card,
    marginBottom: 8,
  },
  packageScroll: {
    marginTop: 12,
  },
  packageCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  packageCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  packageName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 2,
  },
  packageDuration: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  listingsSection: {
    padding: 16,
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  listingCardProcessing: {
    opacity: 0.6,
  },
  listingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  listingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  listingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  listingLocation: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  listingMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  listingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  reactivateButton: {
    backgroundColor: Colors.primary,
    flex: 1,
  },
  deleteButton: {
    backgroundColor: Colors.error,
    width: 40,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

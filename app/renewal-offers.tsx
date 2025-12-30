import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useListingStore } from '@/store/listingStore';
import { useUserStore } from '@/store/userStore';
import { adPackages } from '@/constants/adPackages';
import Colors from '@/constants/colors';
import {
  ArrowLeft,
  Percent,
  Calendar,
  Eye,
  MapPin,
  Clock,
  Zap,
  TrendingUp,
  Gift,
} from 'lucide-react-native';
import { logger } from '@/utils/logger';

interface RenewalOffer {
  listingId: string;
  daysRemaining: number;
  discount: number; // percentage
  reason: '7days' | '3days' | '1day' | 'expired';
}

export default function RenewalOffersScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { getExpiringListings, listings, promoteListing } = useListingStore();
  const { currentUser, walletBalance, bonusBalance, spendFromWallet, spendFromBonus } = useUserStore();

  const [renewalOffers, setRenewalOffers] = useState<RenewalOffer[]>([]);
  const [isRenewing, setIsRenewing] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Calculate renewal offers based on expiration time
    const offers: RenewalOffer[] = [];

    // 7 days - 15% discount
    const expiring7Days = getExpiringListings(currentUser.id, 7);
    expiring7Days.forEach(l => {
      const now = new Date();
      const expiresAt = new Date(l.expiresAt);
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining === 7) {
        offers.push({
          listingId: l.id,
          daysRemaining: 7,
          discount: 15,
          reason: '7days',
        });
      }
    });

    // 3 days - 10% discount
    const expiring3Days = getExpiringListings(currentUser.id, 3);
    expiring3Days.forEach(l => {
      const now = new Date();
      const expiresAt = new Date(l.expiresAt);
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining === 3) {
        offers.push({
          listingId: l.id,
          daysRemaining: 3,
          discount: 10,
          reason: '3days',
        });
      }
    });

    // 1 day - 5% discount
    const expiring1Day = getExpiringListings(currentUser.id, 1);
    expiring1Day.forEach(l => {
      const now = new Date();
      const expiresAt = new Date(l.expiresAt);
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining === 1) {
        offers.push({
          listingId: l.id,
          daysRemaining: 1,
          discount: 5,
          reason: '1day',
        });
      }
    });

    setRenewalOffers(offers);
  }, [currentUser, listings]);

  const handleRenew = async (offer: RenewalOffer) => {
    // Find listing
    const listing = listings.find(l => l.id === offer.listingId);

    if (!listing) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Elan tapılmadı' : 'Объявление не найдено',
      );
      return;
    }

    if (!currentUser) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Daxil olmamısınız' : 'Вы не вошли в систему',
      );
      return;
    }

    // Find current package
    const currentPackage = adPackages.find(p => p.id === listing.adType);
    const renewalPackage = currentPackage || adPackages.find(p => p.id === 'standard-30');

    if (!renewalPackage) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Yeniləmə paketi tapılmadı' : 'Пакет продления не найден',
      );
      return;
    }

    // Calculate discounted price
    const originalPrice = renewalPackage.price;
    const discountAmount = (originalPrice * offer.discount) / 100;
    const finalPrice = originalPrice - discountAmount;

    // Check balance
    const totalBalance = walletBalance + bonusBalance;

    if (totalBalance < finalPrice) {
      Alert.alert(
        language === 'az' ? 'Kifayət qədər balans yoxdur' : 'Недостаточно средств',
        language === 'az'
          ? `Bu paket üçün ${finalPrice.toFixed(2)} AZN lazımdır (${offer.discount}% endirim). Balansınız: ${totalBalance.toFixed(2)} AZN`
          : `Для этого пакета требуется ${finalPrice.toFixed(2)} AZN (скидка ${offer.discount}%). Ваш баланс: ${totalBalance.toFixed(2)} AZN`,
      );
      return;
    }

    // Show confirmation
    Alert.alert(
      language === 'az' ? '🎁 Güzəştli Yeniləmə Təklifi' : '🎁 Предложение со скидкой',
      language === 'az'
        ? `"${listing.title.az}" elanını ${offer.discount}% ENDİRİMLƏ yeniləmək istədiyinizə əminsiniz?\n\n💰 Qiymət:\n• Orijinal: ${originalPrice.toFixed(2)} AZN\n• Endirim: -${discountAmount.toFixed(2)} AZN (${offer.discount}%)\n• Yekun: ${finalPrice.toFixed(2)} AZN\n\n📅 Elan ${renewalPackage.duration} gün aktiv olacaq.\n\n⏰ Təklif ${offer.daysRemaining} gün qalıb!`
        : `Вы уверены, что хотите продлить объявление "${listing.title.ru}" со скидкой ${offer.discount}%?\n\n💰 Стоимость:\n• Оригинал: ${originalPrice.toFixed(2)} AZN\n• Скидка: -${discountAmount.toFixed(2)} AZN (${offer.discount}%)\n• Итого: ${finalPrice.toFixed(2)} AZN\n\n📅 Объявление будет активно ${renewalPackage.duration} дней.\n\n⏰ Предложение действует ${offer.daysRemaining} дней!`,
      [
        { text: language === 'az' ? 'Ləğv et' : 'Отмена', style: 'cancel' },
        {
          text: language === 'az' ? 'Yenilə' : 'Продлить',
          onPress: async () => {
            setIsRenewing(offer.listingId);

            let spentFromBonusAmount = 0;
            let spentFromWalletAmount = 0;

            try {
              // Process payment
              let remainingAmount = finalPrice;

              if (bonusBalance > 0) {
                spentFromBonusAmount = Math.min(bonusBalance, remainingAmount);
                spendFromBonus(spentFromBonusAmount);
                remainingAmount -= spentFromBonusAmount;
              }

              if (remainingAmount > 0) {
                spentFromWalletAmount = remainingAmount;
                spendFromWallet(remainingAmount);
              }

              // Promote listing (extends duration)
              await promoteListing(listing.id, 'featured', renewalPackage.duration);

              Alert.alert(
                language === 'az' ? '✅ Uğurlu!' : '✅ Успешно!',
                language === 'az'
                  ? `"${listing.title.az}" elanı ${offer.discount}% endirim ilə yeniləndi!\n\n💰 Ödənilib: ${finalPrice.toFixed(2)} AZN\n📅 Yeni bitmə tarixi: ${new Date(Date.now() + renewalPackage.duration * 24 * 60 * 60 * 1000).toLocaleDateString('az-AZ')}`
                  : `Объявление "${listing.title.ru}" продлено со скидкой ${offer.discount}%!\n\n💰 Оплачено: ${finalPrice.toFixed(2)} AZN\n📅 Новая дата истечения: ${new Date(Date.now() + renewalPackage.duration * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU')}`,
                [{ text: 'OK' }],
                { cancelable: false },
              );
            } catch (error) {
              // Rollback payment (use any to avoid missing type definitions)
              const userState = useUserStore.getState() as any;

              if (spentFromBonusAmount > 0 && typeof userState.addToBonus === 'function') {
                userState.addToBonus(spentFromBonusAmount);
              }

              if (spentFromWalletAmount > 0 && typeof userState.addToWallet === 'function') {
                userState.addToWallet(spentFromWalletAmount);
              }

              let errorMessage = language === 'az'
                ? 'Elan yenilənə bilmədi'
                : 'Не удалось продлить объявление';

              if (error instanceof Error) {
                if (error.message.includes('tapılmadı') || error.message.includes('not found')) {
                  errorMessage = language === 'az' ? 'Elan tapılmadı' : 'Объявление не найдено';
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
              setIsRenewing(null);
            }
          },
        },
      ],
    );
  };

  const getOfferBadgeColor = (reason: RenewalOffer['reason']) => {
    switch (reason) {
      case '7days':
        return Colors.success || '#10B981';
      case '3days':
        return Colors.warning || '#F59E0B';
      case '1day':
        return Colors.error || '#EF4444';
      default:
        return Colors.textSecondary;
    }
  };

  const getOfferIcon = (reason: RenewalOffer['reason']) => {
    switch (reason) {
      case '7days':
        return <Gift size={20} color="white" />;
      case '3days':
        return <Zap size={20} color="white" />;
      case '1day':
        return <Clock size={20} color="white" />;
      default:
        return <Percent size={20} color="white" />;
    }
  };

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'az' ? 'Yeniləmə Təklifləri' : 'Предложения продления'}
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
          {language === 'az' ? 'Yeniləmə Təklifləri' : 'Предложения продления'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {renewalOffers.length === 0 ? (
        <View style={styles.emptyState}>
          <Percent size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>
            {language === 'az' ? 'Aktiv təklif yoxdur' : 'Нет активных предложений'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {language === 'az'
              ? 'Elanlarınızın müddəti bitməyə yaxınlaşdıqda burada güzəştli yeniləmə təklifləri görəcəksiniz'
              : 'Когда срок ваших объявлений будет истекать, здесь появятся предложения со скидкой'
            }
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>
              {language === 'az' ? '💡 Güzəşt Sistemi' : '💡 Система скидок'}
            </Text>
            <Text style={styles.infoText}>
              {language === 'az'
                ? '• 7 gün əvvəl yeniləsəniz: 15% ENDİRİM\n• 3 gün əvvəl yeniləsəniz: 10% ENDİRİM\n• 1 gün əvvəl yeniləsəniz: 5% ENDİRİM\n\nErkən yeniləmə daha çox qənaət deməkdir!'
                : '• Продление за 7 дней: СКИДКА 15%\n• Продление за 3 дня: СКИДКА 10%\n• Продление за 1 день: СКИДКА 5%\n\nРаннее продление - больше экономии!'
              }
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* Discount Info Banner */}
          <View style={styles.discountBanner}>
            <Gift size={24} color={Colors.primary} />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>
                {language === 'az' ? 'Güzəştli Yeniləmə!' : 'Продление со скидкой!'}
              </Text>
              <Text style={styles.bannerSubtitle}>
                {language === 'az'
                  ? `${renewalOffers.length} elan üçün xüsusi təklif mövcuddur`
                  : `Специальные предложения для ${renewalOffers.length} объявлений`
                }
              </Text>
            </View>
          </View>

          {/* Renewal Offers */}
          {renewalOffers.map(offer => {
            const listing = listings.find(l => l.id === offer.listingId);
            if (!listing) return null;

            const isRenewingThis = isRenewing === offer.listingId;
            const currentPackage = adPackages.find(p => p.id === listing.adType);
            const renewalPackage = currentPackage || adPackages.find(p => p.id === 'standard-30');

            if (!renewalPackage) return null;

            const originalPrice = renewalPackage.price;
            const discountAmount = (originalPrice * offer.discount) / 100;
            const finalPrice = originalPrice - discountAmount;

            return (
              <View key={offer.listingId} style={styles.offerCard}>
                {/* Discount Badge */}
                <View style={[styles.discountBadge, { backgroundColor: getOfferBadgeColor(offer.reason) }]}>
                  {getOfferIcon(offer.reason)}
                  <Text style={styles.discountBadgeText}>
                    {offer.discount}% {language === 'az' ? 'ENDİRİM' : 'СКИДКА'}
                  </Text>
                </View>

                <View style={styles.offerContent}>
                  <Image
                    source={{ uri: listing.images[0] || 'https://via.placeholder.com/80' }}
                    style={styles.offerImage}
                    // defaultSource={require('@/assets/images/placeholder.png')}
                  />

                  <View style={styles.offerInfo}>
                    <Text style={styles.offerTitle} numberOfLines={2}>
                      {listing.title[language as keyof typeof listing.title]}
                    </Text>

                    <View style={styles.offerDetails}>
                      <View style={styles.detailItem}>
                        <Clock size={14} color={Colors.error} />
                        <Text style={[styles.detailText, { color: Colors.error }]}>
                          {offer.daysRemaining} {language === 'az' ? 'gün qalıb' : 'дней осталось'}
                        </Text>
                      </View>

                      <View style={styles.detailItem}>
                        <Eye size={14} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>
                          {listing.views || 0}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.priceInfo}>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>
                          {language === 'az' ? 'Orijinal:' : 'Оригинал:'}
                        </Text>
                        <Text style={styles.originalPrice}>
                          {originalPrice.toFixed(2)} AZN
                        </Text>
                      </View>

                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>
                          {language === 'az' ? 'Endirim:' : 'Скидка:'}
                        </Text>
                        <Text style={styles.discountPrice}>
                          -{discountAmount.toFixed(2)} AZN
                        </Text>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabelFinal}>
                          {language === 'az' ? 'Yekun:' : 'Итого:'}
                        </Text>
                        <Text style={styles.finalPrice}>
                          {finalPrice.toFixed(2)} AZN
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.renewButton, isRenewingThis && styles.renewButtonDisabled]}
                      onPress={() => handleRenew(offer)}
                      disabled={isRenewingThis}
                    >
                      {isRenewingThis ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <TrendingUp size={16} color="white" />
                      )}
                      <Text style={styles.renewButtonText}>
                        {isRenewingThis
                          ? (language === 'az' ? 'Yenilənir...' : 'Продление...')
                          : (language === 'az' ? 'Yenilə və Qənaət Et' : 'Продлить и Сэкономить')
                        }
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
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
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  infoBox: {
    backgroundColor: `${Colors.primary}10`,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    width: '100%',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  discountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}10`,
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  bannerText: {
    marginLeft: 12,
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: Colors.text,
  },
  offerCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  discountBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  offerContent: {
    flexDirection: 'row',
    padding: 12,
  },
  offerImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  offerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  offerDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  priceInfo: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  originalPrice: {
    fontSize: 13,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  discountPrice: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 6,
  },
  priceLabelFinal: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  finalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  renewButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  renewButtonDisabled: {
    opacity: 0.6,
  },
  renewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

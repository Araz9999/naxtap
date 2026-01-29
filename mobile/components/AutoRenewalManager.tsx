import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { useLanguageStore } from '@/store/languageStore';
import { useUserStore } from '@/store/userStore';
import { Listing } from '@/types/listing';
import { adPackages } from '@/constants/adPackages';
import { Bell, Clock, CreditCard, RefreshCw } from 'lucide-react-native';
import { logger } from '@/utils/logger';

interface AutoRenewalManagerProps {
  listing: Listing;
  onUpdate: (updatedListing: Listing) => void;
}

export default function AutoRenewalManager({ listing, onUpdate }: AutoRenewalManagerProps) {
  const { language } = useLanguageStore();
  const { canAfford, spendFromBalance, addToWallet } = useUserStore();
  const [autoRenewalEnabled, setAutoRenewalEnabled] = useState(listing.autoRenewalEnabled || false);
  const selectedPackage = listing.autoRenewalPackageId || listing.adType;
  const [isLoading, setIsLoading] = useState(false);

  const currentPackage = adPackages.find(pkg => pkg.id === listing.adType);

  // For auto-renewal, we need to determine the correct package based on the listing's duration
  // If it's a 30-day listing but showing as free, we should use the appropriate 30-day package
  const getDaysUntilExpiration = () => {
    const now = new Date();
    const expiration = new Date(listing.expiresAt);
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getOriginalDuration = () => {
    const created = new Date(listing.createdAt);
    const expires = new Date(listing.expiresAt);
    const diffTime = expires.getTime() - created.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Determine the correct renewal package based on original duration
  const getRenewalPackage = () => {
    const originalDuration = getOriginalDuration();

    // If it's a free listing (3 days), use standard-30 package for auto-renewal
    if (originalDuration <= 5 && currentPackage?.id === 'free') {
      return adPackages.find(pkg => pkg.id === 'standard-30') || currentPackage;
    }
    // If original duration was around 30 days, use standard-30 package
    else if (originalDuration >= 25 && originalDuration <= 35) {
      return adPackages.find(pkg => pkg.id === 'standard-30') || currentPackage;
    }
    // If original duration was around 14 days, use standard package
    else if (originalDuration >= 10 && originalDuration <= 20) {
      return adPackages.find(pkg => pkg.id === 'standard') || currentPackage;
    }
    // For other durations, use the current package
    return currentPackage;
  };

  const renewalPackage = getRenewalPackage();
  const renewalPrice = renewalPackage?.price || 0;

  const handleToggleAutoRenewal = async () => {
    // Validation: Check renewal price
    if (!renewalPrice || renewalPrice <= 0) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Yeniləmə qiyməti düzgün deyil' : 'Некорректная цена продления',
      );
      return;
    }

    // Validation: Check renewal package
    if (!renewalPackage || !renewalPackage.id) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Yeniləmə paketi tapılmadı' : 'Пакет продления не найден',
      );
      return;
    }

    if (!autoRenewalEnabled) {
      // Check if user can afford the auto-renewal
      if (!canAfford(renewalPrice)) {
        Alert.alert(
          language === 'az' ? 'Balans Kifayət Etmir' : 'Недостаточно Средств',
          language === 'az'
            ? `Avtomatik yeniləmə üçün balansınızda ${renewalPrice} ${renewalPackage?.currency} olmalıdır. Balansınızı artırın.`
            : `Для автообновления на балансе должно быть ${renewalPrice} ${renewalPackage?.currency}. Пополните баланс.`,
        );
        return;
      }

      // Enabling auto-renewal
      Alert.alert(
        language === 'az' ? 'Avtomatik Yeniləmə' : 'Автообновление',
        language === 'az'
          ? `Elanınız ${renewalPackage?.name?.[language as keyof typeof renewalPackage.name] || renewalPackage?.name?.az || 'N/A'} tarifində avtomatik olaraq yeniləməyə davam edəcək. İndi ${renewalPrice} ${renewalPackage?.currency} balansınızdan çıxılacaq və elanınız müddəti bitdikdən sonra 30 günlük yeniləmə olacaq. İstəsəniz avtomatik yeniləməni güzəşt müddəti ərzində dayandıraraq pulu geri ala bilərsiniz.`
          : `Ваше объявление будет автоматически продлеваться по тарифу ${renewalPackage?.name?.[language as keyof typeof renewalPackage.name] || renewalPackage?.name?.ru || 'N/A'}. Сейчас с баланса будет списано ${renewalPrice} ${renewalPackage?.currency} и после истечения срока будет продление на 30 дней. При желании можете отключить автообновление в льготный период и вернуть деньги.`,
        [
          {
            text: language === 'az' ? 'Ləğv et' : 'Отмена',
            style: 'cancel',
          },
          {
            text: language === 'az' ? 'Aktivləşdir' : 'Активировать',
            onPress: () => enableAutoRenewal(),
          },
        ],
      );
    } else {
      // Disabling auto-renewal - check if we should refund based on grace period
      const now = new Date();
      const gracePeriodEnd = listing.gracePeriodEnd ? new Date(listing.gracePeriodEnd) : null;
      const shouldRefund = listing.autoRenewalPaid && !listing.autoRenewalUsed && gracePeriodEnd && now <= gracePeriodEnd;

      Alert.alert(
        language === 'az' ? 'Avtomatik Yeniləməni Dayandır' : 'Отключить Автообновление',
        language === 'az'
          ? `Avtomatik yeniləmə dayandırılacaq. ${shouldRefund ? `${renewalPrice} ${renewalPackage?.currency} balansınıza geri qaytarılacaq.` : 'Elanınız müddəti bitdikdə avtomatik olaraq yenilənməyəcək.'}`
          : `Автообновление будет отключено. ${shouldRefund ? `${renewalPrice} ${renewalPackage?.currency} будет возвращено на ваш баланс.` : 'Ваше объявление не будет автоматически продлеваться после истечения срока.'}`,
        [
          {
            text: language === 'az' ? 'Ləğv et' : 'Отмена',
            style: 'cancel',
          },
          {
            text: language === 'az' ? 'Dayandır' : 'Отключить',
            onPress: () => disableAutoRenewal(),
          },
        ],
      );
    }
  };

  const enableAutoRenewal = async () => {
    if (!listing || !listing.id) {
      logger.error('[AutoRenewal] No listing provided');
      return;
    }

    if (!renewalPackage || typeof renewalPrice !== 'number' || isNaN(renewalPrice)) {
      logger.error('[AutoRenewal] Invalid renewal package or price:', { renewalPackage, renewalPrice });
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Yeniləmə paketi düzgün deyil' : 'Пакет обновления недействителен',
      );
      return;
    }

    logger.info('[AutoRenewal] Enabling auto-renewal:', { listingId: listing.id, price: renewalPrice, packageId: renewalPackage.id });

    setIsLoading(true);
    try {
      // Validation: Check listing expiration date
      if (!listing.expiresAt || new Date(listing.expiresAt).getTime() < Date.now()) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Elanın müddəti artıq bitib' : 'Срок объявления уже истек',
        );
        setIsLoading(false);
        return;
      }

      // Validation: Check renewal package duration
      if (!renewalPackage?.duration || renewalPackage.duration <= 0) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Paket müddəti düzgün deyil' : 'Некорректная длительность пакета',
        );
        setIsLoading(false);
        return;
      }

      // Deduct payment from balance
      const paymentSuccess = spendFromBalance(renewalPrice);
      if (!paymentSuccess) {
        logger.error('[AutoRenewal] Payment failed:', { price: renewalPrice });
        Alert.alert(
          language === 'az' ? 'Ödəniş Xətası' : 'Ошибка Оплаты',
          language === 'az'
            ? 'Balansınızda kifayət qədər məbləğ yoxdur.'
            : 'На вашем балансе недостаточно средств.',
        );
        setIsLoading(false);
        return;
      }

      // Calculate next renewal date with 3-day grace period
      const expirationDate = new Date(listing.expiresAt);
      const gracePeriodEnd = new Date(expirationDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days grace period
      const nextRenewalDate = new Date(gracePeriodEnd.getTime() + Math.max(renewalPackage.duration, 1) * 24 * 60 * 60 * 1000);

      const updatedListing: Listing = {
        ...listing,
        autoRenewalEnabled: true,
        autoRenewalPackageId: selectedPackage,
        autoRenewalPrice: renewalPrice,
        gracePeriodEnd: gracePeriodEnd.toISOString(),
        nextRenewalDate: nextRenewalDate.toISOString(),
        autoRenewalPaid: true,
        autoRenewalUsed: false,
        autoRenewalPaymentDate: new Date().toISOString(),
      };

      onUpdate(updatedListing);
      setAutoRenewalEnabled(true);

      logger.info('[AutoRenewal] Auto-renewal enabled successfully');
      Alert.alert(
        language === 'az' ? 'Uğurlu!' : 'Успешно!',
        language === 'az'
          ? `Avtomatik yeniləmə aktivləşdirildi və ${renewalPrice} ${renewalPackage?.currency} balansınızdan çıxıldı. Elanınız müddəti bitdikdən sonra avtomatik olaraq 30 günlük yeniləməyə davam edəcək.`
          : `Автообновление активировано и ${renewalPrice} ${renewalPackage?.currency} списано с баланса. После истечения срока ваше объявление будет автоматически продлеваться на 30 дней.`,
      );
    } catch (error) {
      logger.error('[AutoRenewal] Failed to enable auto-renewal:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az'
          ? 'Avtomatik yeniləmə aktivləşdirilərkən xəta baş verdi.'
          : 'Произошла ошибка при активации автообновления.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const disableAutoRenewal = async () => {
    if (!listing || !listing.id) {
      logger.error('[AutoRenewal] No listing provided for disable');
      return;
    }

    logger.info('[AutoRenewal] Disabling auto-renewal:', { listingId: listing.id });

    setIsLoading(true);
    try {
      // Validation: Check current time
      const now = new Date();
      if (isNaN(now.getTime())) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Sistem tarixində xəta baş verdi' : 'Ошибка системной даты',
        );
        setIsLoading(false);
        return;
      }

      // Check if we should refund the payment based on grace period
      const gracePeriodEnd = listing.gracePeriodEnd ? new Date(listing.gracePeriodEnd) : null;

      // Validation: Grace period date
      if (gracePeriodEnd && isNaN(gracePeriodEnd.getTime())) {
        logger.error('[AutoRenewal] Invalid grace period date:', listing.gracePeriodEnd);
        // Continue anyway, just don't refund
      }

      const shouldRefund = listing.autoRenewalPaid &&
                          !listing.autoRenewalUsed &&
                          gracePeriodEnd &&
                          !isNaN(gracePeriodEnd.getTime()) &&
                          now <= gracePeriodEnd;
      let refundMessage = '';

      if (shouldRefund && listing.autoRenewalPrice && listing.autoRenewalPrice > 0) {
        // Validation: Refund amount
        if (listing.autoRenewalPrice > 10000) {
          logger.error('[AutoRenewal] Suspicious refund amount:', listing.autoRenewalPrice);
          Alert.alert(
            language === 'az' ? 'Xəta' : 'Ошибка',
            language === 'az' ? 'Geri qaytarma məbləği çox böyükdür' : 'Сумма возврата слишком велика',
          );
          setIsLoading(false);
          return;
        }

        // Refund the payment
        addToWallet(listing.autoRenewalPrice);
        refundMessage = language === 'az'
          ? ` ${listing.autoRenewalPrice} ${renewalPackage?.currency} balansınıza geri qaytarıldı.`
          : ` ${listing.autoRenewalPrice} ${renewalPackage?.currency} возвращено на ваш баланс.`;
      }

      const updatedListing: Listing = {
        ...listing,
        autoRenewalEnabled: false,
        autoRenewalPackageId: undefined,
        autoRenewalPrice: undefined,
        nextRenewalDate: undefined,
        gracePeriodEnd: undefined,
        autoRenewalPaid: false,
        autoRenewalUsed: false,
        autoRenewalPaymentDate: undefined,
      };

      onUpdate(updatedListing);
      setAutoRenewalEnabled(false);

      logger.info('[AutoRenewal] Auto-renewal disabled successfully', { refunded: shouldRefund, amount: listing.autoRenewalPrice });
      Alert.alert(
        language === 'az' ? 'Dayandırıldı' : 'Отключено',
        language === 'az'
          ? `Avtomatik yeniləmə dayandırıldı.${refundMessage}`
          : `Автообновление отключено.${refundMessage}`,
      );
    } catch (error) {
      logger.error('[AutoRenewal] Failed to disable auto-renewal:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az'
          ? 'Avtomatik yeniləmə dayandırılarkən xəta baş verdi.'
          : 'Произошла ошибка при отключении автообновления.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'az' ? 'az-AZ' : 'ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const daysLeft = getDaysUntilExpiration();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <RefreshCw size={24} color="#007AFF" />
        <Text style={styles.title}>
          {language === 'az' ? 'Avtomatik Yeniləmə' : 'Автообновление'}
        </Text>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>
              {language === 'az' ? 'Cari Status' : 'Текущий Статус'}
            </Text>
            <Text style={[styles.statusValue, { color: autoRenewalEnabled ? '#34C759' : '#FF3B30' }]}>
              {autoRenewalEnabled
                ? (language === 'az' ? 'Aktiv' : 'Активно')
                : (language === 'az' ? 'Deaktiv' : 'Неактивно')
              }
            </Text>
          </View>
          <Switch
            value={autoRenewalEnabled}
            onValueChange={handleToggleAutoRenewal}
            disabled={isLoading}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor={autoRenewalEnabled ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>

        {autoRenewalEnabled && (
          <View style={styles.renewalInfo}>
            <View style={styles.infoRow}>
              <Clock size={16} color="#8E8E93" />
              <Text style={styles.infoText}>
                {language === 'az' ? 'Növbəti yeniləmə: ' : 'Следующее продление: '}
                {listing.nextRenewalDate ? formatDate(listing.nextRenewalDate) : 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <CreditCard size={16} color="#8E8E93" />
              <Text style={styles.infoText}>
                {language === 'az' ? 'Yeniləmə qiyməti: ' : 'Стоимость продления: '}
                {listing.autoRenewalPrice} {renewalPackage?.currency}
              </Text>
            </View>
            {listing.autoRenewalPaid && (
              <View style={styles.infoRow}>
                <CreditCard size={16} color="#34C759" />
                <Text style={[styles.infoText, { color: '#34C759' }]}>
                  {language === 'az' ? 'Ödəniş edilib' : 'Оплачено'}
                  {listing.autoRenewalPaymentDate && ` (${formatDate(listing.autoRenewalPaymentDate)})`}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.currentPackageCard}>
        <Text style={styles.cardTitle}>
          {language === 'az' ? 'Cari Tarif' : 'Текущий Тариф'}
        </Text>
        <View style={styles.packageInfo}>
          <Text style={styles.packageName}>
            {renewalPackage?.name?.[language as keyof typeof renewalPackage.name] || renewalPackage?.name?.az || 'N/A'}
          </Text>
          <Text style={styles.packagePrice}>
            {renewalPrice} {renewalPackage?.currency}
          </Text>
        </View>
        <View style={styles.expirationInfo}>
          <Text style={styles.expirationText}>
            {language === 'az' ? 'Bitmə tarixi: ' : 'Дата истечения: '}
            {formatDate(listing.expiresAt)}
          </Text>
          <Text style={[styles.daysLeft, { color: daysLeft <= 3 ? '#FF3B30' : '#8E8E93' }]}>
            {daysLeft > 0
              ? `${daysLeft} ${language === 'az' ? 'gün qalıb' : 'дней осталось'}`
              : (language === 'az' ? 'Müddəti bitib' : 'Срок истек')
            }
          </Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Bell size={20} color="#007AFF" />
          <Text style={styles.infoTitle}>
            {language === 'az' ? 'Avtomatik Yeniləmə Haqqında' : 'Об Автообновлении'}
          </Text>
        </View>
        <Text style={styles.infoDescription}>
          {language === 'az'
            ? 'Avtomatik yeniləmə aktivləşdirildikdə, dərhal ödəniş balansınızdan çıxılır və elanınız müddəti bitdikdən sonra avtomatik olaraq 30 günlük yeniləməyə davam edəcək. Pulsuz elanlarda avtomatik yeniləmə üçün 5 AZN ödəniş tələb olunur. Avtomatik yeniləməni güzəşt müddəti ərzində dayandıraraq istifadə edilməmiş ödənişi geri ala bilərsiniz.'
            : 'При активации автообновления оплата сразу списывается с баланса, и после истечения срока ваше объявление будет автоматически продлеваться на 30 дней. Для бесплатных объявлений требуется оплата 5 AZN для автообновления. Вы можете отключить автообновление в течение льготного периода и вернуть неиспользованную оплату.'
          }
        </Text>
        <View style={styles.benefitsList}>
          <Text style={styles.benefitItem}>
            • {language === 'az' ? '30 günlük avtomatik yeniləmə' : '30-дневное автообновление'}
          </Text>
          <Text style={styles.benefitItem}>
            • {language === 'az' ? 'Pulsuz elanlarda 5 AZN ödəniş' : 'Оплата 5 AZN для бесплатных объявлений'}
          </Text>
          <Text style={styles.benefitItem}>
            • {language === 'az' ? 'Elanınız heç vaxt müddəti bitməyəcək' : 'Ваше объявление никогда не истечет'}
          </Text>
          <Text style={styles.benefitItem}>
            • {language === 'az' ? 'Manual yeniləmə ehtiyacı yoxdur' : 'Нет необходимости в ручном продлении'}
          </Text>
          <Text style={styles.benefitItem}>
            • {language === 'az' ? 'İstənilən vaxt dayandıra bilərsiniz' : 'Можно отключить в любое время'}
          </Text>
          <Text style={styles.benefitItem}>
            • {language === 'az' ? 'İstifadə edilməmiş ödəniş geri qaytarılır' : 'Неиспользованная оплата возвращается'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 12,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  renewalInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  currentPackageCard: {
    backgroundColor: '#FFFFFF',
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  packageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#007AFF',
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  expirationInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  expirationText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  daysLeft: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
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
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 16,
  },
  benefitsList: {
    paddingLeft: 8,
  },
  benefitItem: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 4,
  },
});

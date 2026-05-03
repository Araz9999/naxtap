import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useListingStore } from '@/store/listingStore';
import { useUserStore } from '@/store/userStore';
import { promotionPackages, PromotionPackage, viewPackages, ViewPackage } from '@/constants/adPackages';
import Colors from '@/constants/colors';
import {
  ArrowLeft,
  Star,
  Crown,
  Zap,
  Check,
  Wallet,
  Calendar,
  TrendingUp,
  Eye,
  Target,
  Sparkles,
} from 'lucide-react-native';
import CreativeEffectsSection, { CreativeEffect } from '@/components/CreativeEffectsSection';

import { confirm } from '@/utils/confirm';

import { logger } from '@/utils/logger';
export default function PromoteListingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useLanguageStore();
  const { listings, promoteListing, purchaseViews, applyCreativeEffects } = useListingStore();
  const { currentUser, walletBalance, bonusBalance, spendFromBalance, getTotalBalance } = useUserStore();
  const [selectedPackage, setSelectedPackage] = useState<PromotionPackage | null>(null);
  const [selectedViewPackage, setSelectedViewPackage] = useState<ViewPackage | null>(null);
  const [selectedEffects, setSelectedEffects] = useState<CreativeEffect[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'promotion' | 'views' | 'effects'>('promotion');


  const listing = listings.find(l => l.id === id);

  if (!listing) {
    return (
      <View style={styles.container}>
        <Text style={[styles.errorText, { color: Colors.error || '#EF4444' }]}>
          {language === 'az' ? 'Elan tapılmadı' : 'Объявление не найдено'}
        </Text>
      </View>
    );
  }

  const handlePromote = async () => {
    // ✅ VALIDATION START

    // 1. Check authentication
    if (!currentUser) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Daxil olmamısınız' : 'Вы не вошли в систему',
      );
      return;
    }

    // 2. Check if package is selected
    if (!selectedPackage) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Paket seçilməyib' : 'Пакет не выбран',
      );
      return;
    }

    // 3. Validate package data
    if (!selectedPackage.price || typeof selectedPackage.price !== 'number' || selectedPackage.price <= 0 || !isFinite(selectedPackage.price)) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Paket qiyməti düzgün deyil' : 'Некорректная цена пакета',
      );
      return;
    }

    if (selectedPackage.price > 1000) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Paket qiyməti çox yüksəkdir (maks 1000 AZN)' : 'Цена пакета слишком высока (макс 1000 AZN)',
      );
      return;
    }

    if (!selectedPackage.duration || typeof selectedPackage.duration !== 'number' || selectedPackage.duration <= 0 || !isFinite(selectedPackage.duration)) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Paket müddəti düzgün deyil' : 'Некорректная длительность пакета',
      );
      return;
    }

    if (selectedPackage.duration > 365) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Paket müddəti çox uzundur (maks 365 gün)' : 'Длительность пакета слишком велика (макс 365 дней)',
      );
      return;
    }

    if (!selectedPackage.type || !['premium', 'vip', 'featured'].includes(selectedPackage.type)) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Paket növü düzgün deyil' : 'Некорректный тип пакета',
      );
      return;
    }

    // 4. Check listing ownership
    if (listing.userId !== currentUser.id) {
      Alert.alert(
        language === 'az' ? 'İcazə yoxdur' : 'Нет разрешения',
        language === 'az'
          ? 'Siz bu elanı təşviq edə bilməzsiniz. Yalnız öz elanlarınızı təşviq edə bilərsiniz.'
          : 'Вы не можете продвигать это объявление. Вы можете продвигать только свои собственные объявления.',
      );
      return;
    }

    // 5. Check if listing is deleted
    if (listing.deletedAt) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Silinmiş elanı təşviq etmək mümkün deyil' : 'Невозможно продвигать удаленное объявление',
      );
      return;
    }

    // 6. Check balance
    const totalBalance = walletBalance + bonusBalance;

    if (!isFinite(totalBalance) || totalBalance < 0) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Balans məlumatı düzgün deyil' : 'Некорректная информация о балансе',
      );
      return;
    }

    if (totalBalance < selectedPackage.price) {
      router.push('/wallet');
      return;
    }

    // ✅ VALIDATION END

    // Check if listing expires before package duration
    const currentDate = new Date();
    const listingExpiryDate = new Date(listing.expiresAt);
    const daysUntilExpiry = Math.max(0, Math.ceil((listingExpiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));

    let confirmMessage = language === 'az'
      ? `${selectedPackage.name.az} paketini ${selectedPackage.price} AZN-ə almaq istədiyinizə əminsiniz?`
      : `Вы уверены, что хотите купить пакет ${selectedPackage.name.ru} за ${selectedPackage.price} AZN?`;

    if (daysUntilExpiry < selectedPackage.duration) {
      confirmMessage += language === 'az'
        ? `\n\n⚠️ Diqqət: Elanınızın bitməsinə ${daysUntilExpiry} gün qalır, lakin paket ${selectedPackage.duration} günlükdür. Paket elanınızın bitməsindən sonra ${selectedPackage.duration - daysUntilExpiry} gün əlavə müddətə qədər aktiv olacaq.`
        : `\n\n⚠️ Внимание: До истечения вашего объявления осталось ${daysUntilExpiry} дней, но пакет рассчитан на ${selectedPackage.duration} дней. Пакет будет активен еще ${selectedPackage.duration - daysUntilExpiry} дней после истечения объявления.`;
    }

    const approved = await confirm(confirmMessage, language === 'az' ? 'Təsdiq edin' : 'Подтвердите');
    if (!approved) return;

    setIsProcessing(true);

    // ✅ Store original balance for rollback
    const originalWalletBalance = walletBalance;
    const originalBonusBalance = bonusBalance;
    let spentFromBonusAmount = 0;
    let spentFromWalletAmount = 0;

    try {
      // Process payment
      let remainingAmount = selectedPackage.price;

      if (bonusBalance > 0) {
        spentFromBonusAmount = Math.min(bonusBalance, remainingAmount);
        spendFromBalance(spentFromBonusAmount);
        remainingAmount -= spentFromBonusAmount;
        logger.info('[handlePromote] Spent from bonus:', spentFromBonusAmount);
      }

      if (remainingAmount > 0) {
        spentFromWalletAmount = remainingAmount;
        spendFromBalance(remainingAmount);
        logger.info('[handlePromote] Spent from wallet:', spentFromWalletAmount);
      }

      logger.info('[handlePromote] Total payment:', selectedPackage.price, 'Bonus:', spentFromBonusAmount, 'Wallet:', spentFromWalletAmount);

      const promotionEndDate = new Date(Math.max(
        listingExpiryDate.getTime(),
        currentDate.getTime() + (selectedPackage.duration * 24 * 60 * 60 * 1000),
      ));

      await promoteListing(listing.id, selectedPackage.type, selectedPackage.duration);

      let successMessage = language === 'az'
        ? `Elanınız ${selectedPackage.name.az} paketi ilə təşviq edildi!`
        : `Ваше объявление продвинуто с пакетом ${selectedPackage.name.ru}!`;

      if (daysUntilExpiry < selectedPackage.duration) {
        successMessage += language === 'az'
          ? `\n\nPaket ${promotionEndDate.toLocaleDateString('az-AZ')} tarixinə qədər aktiv olacaq.`
          : `\n\nПакет будет активен до ${promotionEndDate.toLocaleDateString('ru-RU')}.`;
      }

      Alert.alert(language === 'az' ? 'Uğurlu!' : 'Успешно!', successMessage);

      // Clear selection after success
      setSelectedPackage(null);

      router.back();
    } catch (error) {
      // ✅ Payment rollback
      logger.error('[handlePromote] Error, rolling back payment:', error);

      const userStoreState = useUserStore.getState() as any;

      if (spentFromBonusAmount > 0 && typeof userStoreState.addToBonus === 'function') {
        userStoreState.addToBonus(spentFromBonusAmount);
        logger.info('[handlePromote] Rolled back bonus:', spentFromBonusAmount);
      }

      if (spentFromWalletAmount > 0 && typeof userStoreState.addToWallet === 'function') {
        userStoreState.addToWallet(spentFromWalletAmount);
        logger.info('[handlePromote] Rolled back wallet:', spentFromWalletAmount);
      }

      // Show detailed error message
      let errorMessage = language === 'az'
        ? 'Təşviq zamanı xəta baş verdi'
        : 'Произошла ошибка при продвижении';

      if (error instanceof Error) {
        if (error.message.includes('tapılmadı') || error.message.includes('not found')) {
          errorMessage = language === 'az' ? 'Elan tapılmadı' : 'Объявление не найдено';
        } else if (error.message.includes('silinib') || error.message.includes('deleted')) {
          errorMessage = language === 'az' ? 'Elan silinib' : 'Объявление удалено';
        } else if (error.message.includes('vaxtı keçib') || error.message.includes('expired')) {
          errorMessage = language === 'az' ? 'Elanın vaxtı keçib' : 'Объявление истекло';
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          errorMessage = language === 'az' ? 'Şəbəkə xətası. Yenidən cəhd edin.' : 'Ошибка сети. Попробуйте снова.';
        } else if (error.message.includes('Invalid')) {
          errorMessage = language === 'az' ? 'Düzgün olmayan məlumat' : 'Некорректные данные';
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
      setIsProcessing(false);
    }
  };

  const handleSelectEffect = (effect: CreativeEffect) => {
    setSelectedEffects(prev => {
      const isSelected = prev.some(selected => selected.id === effect.id);

      if (isSelected) {
        const newEffects = prev.filter(selected => selected.id !== effect.id);
        logger.info('[PromoteListing] Effect removed:', { effectId: effect.id, remaining: newEffects.length });
        return newEffects;
      } else {
        const newEffects = [...prev, effect];
        logger.info('[PromoteListing] Effect added:', { effectId: effect.id, total: newEffects.length });
        return newEffects;
      }
    });
  };

  const handlePurchaseEffects = async () => {
    // ===== VALIDATION START =====

    // 1. Check user authentication
    if (!currentUser) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Daxil olmamısınız' : 'Вы не вошли в систему',
      );
      return;
    }

    // 2. Check if effects are selected
    if (selectedEffects.length === 0) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Heç bir effekt seçilməyib' : 'Не выбраны эффекты',
      );
      return;
    }

    // 3. Validate each effect structure
    for (const effect of selectedEffects) {
      if (!effect.id || typeof effect.id !== 'string') {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Effekt ID-si düzgün deyil' : 'Некорректный ID эффекта',
        );
        return;
      }

      if (!effect.price || typeof effect.price !== 'number' || effect.price <= 0 || !isFinite(effect.price)) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Effekt qiyməti düzgün deyil' : 'Некорректная цена эффекта',
        );
        return;
      }

      if (effect.price > 100) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Effekt qiyməti çox yüksəkdir (maks 100 AZN)' : 'Цена эффекта слишком высока (макс 100 AZN)',
        );
        return;
      }

      if (!effect.duration || typeof effect.duration !== 'number' || effect.duration <= 0 || !isFinite(effect.duration)) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Effekt müddəti düzgün deyil' : 'Некорректная длительность эффекта',
        );
        return;
      }

      if (effect.duration > 365) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Effekt müddəti çox uzundur (maks 365 gün)' : 'Длительность эффекта слишком велика (макс 365 дней)',
        );
        return;
      }
    }

    // 4. Check for duplicate effects
    const effectIds = selectedEffects.map(e => e.id);
    const uniqueEffectIds = new Set(effectIds);
    if (effectIds.length !== uniqueEffectIds.size) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Eyni effekt 2 dəfə seçilə bilməz' : 'Один и тот же эффект не может быть выбран дважды',
      );
      return;
    }

    // 5. Calculate total price and validate
    const totalPrice = selectedEffects.reduce((sum, effect) => sum + effect.price, 0);

    if (!isFinite(totalPrice) || totalPrice <= 0) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Ümumi qiymət hesablana bilmədi' : 'Не удалось рассчитать общую стоимость',
      );
      return;
    }

    if (totalPrice > 1000) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Ümumi qiymət çox yüksəkdir (maks 1000 AZN)' : 'Общая стоимость слишком велика (макс 1000 AZN)',
      );
      return;
    }

    // 6. Check balance
    const totalBalance = walletBalance + bonusBalance;

    if (totalBalance < totalPrice) {
      router.push('/wallet');
      return;
    }

    // ===== VALIDATION END =====

    // Check if any effect duration exceeds listing expiry
    const currentDate = new Date();
    const listingExpiryDate = new Date(listing.expiresAt);
    const daysUntilExpiry = Math.max(0, Math.ceil((listingExpiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));

    const longestEffect = selectedEffects.reduce((longest, effect) =>
      (effect.duration && effect.duration > (longest.duration || 0)) ? effect : longest
    , selectedEffects[0]);

    let confirmMessage = language === 'az'
      ? `Seçilmiş kreativ effektləri ${totalPrice} AZN-ə almaq istədiyinizə əminsiniz?`
      : `Вы уверены, что хотите купить выбранные креативные эффекты за ${totalPrice} AZN?`;

    if (longestEffect && longestEffect.duration && daysUntilExpiry < longestEffect.duration) {
      confirmMessage += language === 'az'
        ? `\n\n⚠️ Diqqət: Elanınızın bitməsinə ${daysUntilExpiry} gün qalır, lakin "${longestEffect.name?.az || 'Effekt'}" effekti ${longestEffect.duration} günlükdür. Effekt elanınızın bitməsindən sonra ${longestEffect.duration - daysUntilExpiry} gün əlavə müddətə qədər aktiv olacaq və yeni elanlarınızda istifadə edilə bilər.`
        : `\n\n⚠️ Внимание: До истечения вашего объявления осталось ${daysUntilExpiry} дней, но эффект "${longestEffect.name?.ru || 'Эффект'}" рассчитан на ${longestEffect.duration} дней. Эффект будет активен еще ${longestEffect.duration - daysUntilExpiry} дней после истечения объявления и может быть использован для новых объявлений.`;
    }

    const approved = await confirm(confirmMessage, language === 'az' ? 'Təsdiq edin' : 'Подтвердите');
    if (!approved) return;

    setIsProcessing(true);

    // Store original balance for rollback
    const originalWalletBalance = walletBalance;
    const originalBonusBalance = bonusBalance;
    let spentFromBonus = 0;
    let spentFromWallet = 0;

    try {
      // Process payment
      let remainingAmount = totalPrice;

      if (bonusBalance > 0) {
        spentFromBonus = Math.min(bonusBalance, remainingAmount);
        spendFromBalance(spentFromBonus);
        remainingAmount -= spentFromBonus;
        logger.info('[PurchaseEffects] Spent from bonus:', spentFromBonus);
      }

      if (remainingAmount > 0) {
        spentFromWallet = remainingAmount;
        spendFromBalance(remainingAmount);
        logger.info('[PurchaseEffects] Spent from wallet:', spentFromWallet);
      }

      logger.info('[PurchaseEffects] Total payment:', totalPrice, 'Bonus:', spentFromBonus, 'Wallet:', spentFromWallet);

      // Calculate effect end dates
      const effectEndDates = selectedEffects.map(effect => {
        const effectDuration = Math.max(1, effect.duration); // Ensure at least 1 day
        const effectEndDate = new Date(Math.max(
          listingExpiryDate.getTime(),
          currentDate.getTime() + (effectDuration * 24 * 60 * 60 * 1000),
        ));
        return { effect, endDate: effectEndDate };
      });

      // Apply effects
      await applyCreativeEffects(listing.id, selectedEffects, effectEndDates);
      let successMessage = language === 'az'
        ? 'Kreativ effektlər elanınıza tətbiq edildi!'
        : 'Креативные эффекты применены к вашему объявлению!';
      if (longestEffect && longestEffect.duration && daysUntilExpiry < longestEffect.duration && effectEndDates.length > 0) {
        const latestEndDate = effectEndDates.reduce((latest, item) =>
          item.endDate > latest ? item.endDate : latest
        , effectEndDates[0].endDate);
        successMessage += language === 'az'
          ? `\n\nEffektlər ${latestEndDate.toLocaleDateString('az-AZ')} tarixinə qədər aktiv olacaq.`
          : `\n\nЭффекты будут активны до ${latestEndDate.toLocaleDateString('ru-RU')}.`;
      }
      Alert.alert(language === 'az' ? 'Uğurlu!' : 'Успешно!', successMessage);

      // Clear selected effects after successful purchase
      setSelectedEffects([]);

      router.back();
    } catch (error) {
      // Payment rollback
      logger.error('[PurchaseEffects] Error applying effects, rolling back payment:', error);

      // Rollback: Add money back to user's balance
      const userStoreState = useUserStore.getState() as any;

      if (spentFromBonus > 0 && typeof userStoreState.addToBonus === 'function') {
        userStoreState.addToBonus(spentFromBonus);
        logger.info('[PurchaseEffects] Rolled back bonus:', spentFromBonus);
      }

      if (spentFromWallet > 0 && typeof userStoreState.addToWallet === 'function') {
        userStoreState.addToWallet(spentFromWallet);
        logger.info('[PurchaseEffects] Rolled back wallet:', spentFromWallet);
      }

      // Show detailed error message
      let errorMessage = language === 'az'
        ? 'Effekt tətbiqi zamanı xəta baş verdi'
        : 'Произошла ошибка при применении эффектов';

      if (error instanceof Error) {
        if (error.message.includes('tapılmadı') || error.message.includes('not found')) {
          errorMessage = language === 'az' ? 'Elan tapılmadı' : 'Объявление не найдено';
        } else if (error.message.includes('düzgün deyil') || error.message.includes('invalid')) {
          errorMessage = language === 'az' ? 'Effekt məlumatları düzgün deyil' : 'Данные эффектов некорректны';
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
      setIsProcessing(false);
    }
  };

  const handlePurchaseViews = async () => {
    // ✅ VALIDATION START

    // 1. Check authentication
    if (!currentUser) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Daxil olmamısınız' : 'Вы не вошли в систему',
      );
      return;
    }

    // 2. Check if package is selected
    if (!selectedViewPackage) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Paket seçilməyib' : 'Пакет не выбран',
      );
      return;
    }

    // 3. Validate package data
    if (!selectedViewPackage.price || typeof selectedViewPackage.price !== 'number' || selectedViewPackage.price <= 0 || !isFinite(selectedViewPackage.price)) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Paket qiyməti düzgün deyil' : 'Некорректная цена пакета',
      );
      return;
    }

    if (!selectedViewPackage.views || typeof selectedViewPackage.views !== 'number' || selectedViewPackage.views <= 0 || !isFinite(selectedViewPackage.views)) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Baxış sayı düzgün deyil' : 'Некорректное количество просмотров',
      );
      return;
    }

    // 4. Check listing ownership
    if (listing.userId !== currentUser.id) {
      Alert.alert(
        language === 'az' ? 'İcazə yoxdur' : 'Нет разрешения',
        language === 'az'
          ? 'Siz bu elan üçün baxış ala bilməzsiniz. Yalnız öz elanlarınız üçün baxış ala bilərsiniz.'
          : 'Вы не можете покупать просмотры для этого объявления. Вы можете покупать просмотры только для своих объявлений.',
      );
      return;
    }

    // 5. Check if listing is deleted
    if (listing.deletedAt) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Silinmiş elan üçün baxış almaq mümkün deyil' : 'Невозможно покупать просмотры для удаленного объявления',
      );
      return;
    }

    // ✅ VALIDATION END

    if (!currentUser) {
      logger.error('[PromoteListing] No current user for views purchase');
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'İstifadəçi məlumatları tapılmadı' : 'Информация о пользователе не найдена',
      );
      return;
    }

    logger.info('[PromoteListing] Purchasing views:', { packageId: selectedViewPackage.id, views: selectedViewPackage.views, price: selectedViewPackage.price });

    const totalBalance = getTotalBalance();
    if (totalBalance < selectedViewPackage.price) {
      router.push('/wallet');
      return;
    }

    // Check if listing will expire before all views are consumed
    const currentDate = new Date();
    const listingExpiryDate = new Date(listing.expiresAt);
    const daysUntilExpiry = Math.max(0, Math.ceil((listingExpiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));
    const targetViews = listing.views + selectedViewPackage.views;

    // Estimate daily views (assume average 10-50 views per day based on listing activity)
    const listingAgeDays = Math.max(1, Math.ceil((currentDate.getTime() - new Date(listing.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
    const estimatedDailyViews = Math.max(10, Math.min(50, listing.views / listingAgeDays));
    const estimatedDaysToReachTarget = Math.ceil(selectedViewPackage.views / Math.max(1, estimatedDailyViews));

    let confirmMessage = language === 'az'
      ? `${selectedViewPackage.name.az} paketini ${selectedViewPackage.price} AZN-ə almaq istədiyinizə əminsiniz?\n\n📊 Elanınız ${targetViews} baxışa çatana qədər ön sıralarda qalacaq.`
      : `Вы уверены, что хотите купить пакет ${selectedViewPackage.name.ru} за ${selectedViewPackage.price} AZN?\n\n📊 Ваше объявление останется в топе до достижения ${targetViews} просмотров.`;

    if (estimatedDaysToReachTarget > daysUntilExpiry) {
      const unusedViews = Math.ceil(selectedViewPackage.views * (1 - daysUntilExpiry / estimatedDaysToReachTarget));
      confirmMessage += language === 'az'
        ? `\n\n⚠️ DİQQƏT: Elanınızın müddəti ${daysUntilExpiry} gündə bitəcək, lakin təxminən ${estimatedDaysToReachTarget} gün lazımdır ki, bütün baxışlar toplanılsın.\n\n💡 Elan müddəti bitəndə təxminən ${unusedViews} baxış istifadə olunmayacaq, lakin siz yenidən elan yerləşdirəndə bu baxışlar avtomatik olaraq yeni elanınıza tətbiq olunacaq.\n\n🔄 Alternativ: Əvvəlcə elanın müddətini uzadın, sonra baxış alın.`
        : `\n\n⚠️ ВНИМАНИЕ: Ваше объявление истечет через ${daysUntilExpiry} дней, но потребуется примерно ${estimatedDaysToReachTarget} дней для набора всех просмотров.\n\n💡 Когда объявление истечет, примерно ${unusedViews} просмотров останутся неиспользованными, но они автоматически применятся к вашему новому объявлению при повторном размещении.\n\n🔄 Альтернатива: Сначала продлите объявление, затем покупайте просмотры.`;
    }

    const approved = await confirm(confirmMessage, language === 'az' ? 'Təsdiq edin' : 'Подтвердите');
    if (!approved) return;

    setIsProcessing(true);

    // ✅ Store original balance for rollback
    const originalWalletBalance = walletBalance;
    const originalBonusBalance = bonusBalance;
    const spendFromBonus = spendFromBalance;
    const spendFromWallet = spendFromBalance;   // For clarity in this context
    let spentFromBonusAmount = 0;
    let spentFromWalletAmount = 0;

    try {
      // Process payment
      let remainingAmount = selectedViewPackage.price;

      if (bonusBalance > 0) {
        spentFromBonusAmount = Math.min(bonusBalance, remainingAmount);
        spendFromBonus(spentFromBonusAmount);
        remainingAmount -= spentFromBonusAmount;
        logger.info('[handlePurchaseViews] Spent from bonus:', spentFromBonusAmount);
      }

      if (remainingAmount > 0) {
        spentFromWalletAmount = remainingAmount;
        spendFromWallet(remainingAmount);
        logger.info('[handlePurchaseViews] Spent from wallet:', spentFromWalletAmount);
      }

      logger.info('[handlePurchaseViews] Total payment:', selectedViewPackage.price, 'Bonus:', spentFromBonusAmount, 'Wallet:', spentFromWalletAmount);

      await purchaseViews(listing.id, selectedViewPackage.views);

      let successMessage = language === 'az'
        ? `Elanınız ${selectedViewPackage.views} əlavə baxış aldı və ön sıralara keçdi!\n\n🎯 Elanınız ${targetViews} baxışa çatana qədər ön sıralarda qalacaq.`
        : `Ваше объявление получило ${selectedViewPackage.views} дополнительных просмотров и попало в топ!\n\n🎯 Ваше объявление останется в топе до достижения ${targetViews} просмотров.`;

      if (estimatedDaysToReachTarget > daysUntilExpiry) {
        successMessage += language === 'az'
          ? '\n\n💡 Elan müddəti bitəndə istifadə olunmayan baxışlar yeni elanlarınızda avtomatik tətbiq olunacaq.'
          : '\n\n💡 Неиспользованные просмотры автоматически применятся к новым объявлениям после истечения текущего.';
      }

      Alert.alert(language === 'az' ? 'Uğurlu!' : 'Успешно!', successMessage);

      // Clear selection after success
      setSelectedViewPackage(null);

      router.back();
    } catch (error) {
      // ✅ Payment rollback
      logger.error('[handlePurchaseViews] Error, rolling back payment:', error);

      const userStoreState = useUserStore.getState() as any;

      if (spentFromBonusAmount > 0 && typeof userStoreState.addToBonus === 'function') {
        userStoreState.addToBonus(spentFromBonusAmount);
        logger.info('[handlePurchaseViews] Rolled back bonus:', spentFromBonusAmount);
      }

      if (spentFromWalletAmount > 0 && typeof userStoreState.addToWallet === 'function') {
        userStoreState.addToWallet(spentFromWalletAmount);
        logger.info('[handlePurchaseViews] Rolled back wallet:', spentFromWalletAmount);
      }

      // Show detailed error message
      let errorMessage = language === 'az'
        ? 'Baxış alışı zamanı xəta baş verdi'
        : 'Произошла ошибка при покупке просмотров';

      if (error instanceof Error) {
        if (error.message.includes('tapılmadı') || error.message.includes('not found')) {
          errorMessage = language === 'az' ? 'Elan tapılmadı' : 'Объявление не найдено';
        } else if (error.message.includes('silinib') || error.message.includes('deleted')) {
          errorMessage = language === 'az' ? 'Elan silinib' : 'Объявление удалено';
        } else if (error.message.includes('vaxtı keçib') || error.message.includes('expired')) {
          errorMessage = language === 'az' ? 'Elanın vaxtı keçib' : 'Объявление истекло';
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          errorMessage = language === 'az' ? 'Şəbəkə xətası. Yenidən cəhd edin.' : 'Ошибка сети. Попробуйте снова.';
        } else if (error.message.includes('Invalid')) {
          errorMessage = language === 'az' ? 'Düzgün olmayan məlumat' : 'Некорректные данные';
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
      setIsProcessing(false);
    }
  };

  const getPackageIcon = (type: string) => {
    switch (type) {
      case 'featured':
        return <Star size={24} color={Colors.warning} />;
      case 'premium':
        return <Zap size={24} color={Colors.primary || '#0E7490'} />;
      case 'vip':
        return <Crown size={24} color="#FFD700" />;
      default:
        return <TrendingUp size={24} color={Colors.primary || '#0E7490'} />;
    }
  };

  const getPackageColor = (type: string) => {
    switch (type) {
      case 'featured':
        return Colors.warning;
      case 'premium':
        return Colors.primary || '#0E7490';
      case 'vip':
        return '#FFD700';
      default:
        return Colors.primary || '#0E7490';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text || '#1F2937'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'az' ? 'Elanı Təşviq Et' : 'Продвинуть объявление'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Listing Preview */}
        <View style={styles.listingPreview}>
          <Image
            source={{ uri: listing.images[0] || 'https://via.placeholder.com/100' }}
            style={styles.listingImage}
          />
          <View style={styles.listingInfo}>
            <Text style={styles.listingTitle}>
              {listing.title[language as keyof typeof listing.title]}
            </Text>
            <Text style={styles.listingPrice}>
              {listing.price} {listing.currency}
            </Text>
            <Text style={styles.listingLocation}>
              {listing.location[language as keyof typeof listing.location]}
            </Text>
            <View style={styles.expiryInfo}>
              <Calendar size={14} color={Colors.warning || '#F59E0B'} />
              <Text style={styles.expiryText}>
                {language === 'az'
                  ? `Bitir: ${new Date(listing.expiresAt).toLocaleDateString('az-AZ')}`
                  : `Истекает: ${new Date(listing.expiresAt).toLocaleDateString('ru-RU')}`
                }
              </Text>
              <Text style={styles.daysLeft}>
                ({Math.ceil((new Date(listing.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} {language === 'az' ? 'gün qalır' : 'дней осталось'})
              </Text>
            </View>
          </View>
        </View>

        {/* Current Balance */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Wallet size={20} color={Colors.primary || '#0E7490'} />
            <Text style={styles.balanceTitle}>
              {language === 'az' ? 'Cari Balans' : 'Текущий баланс'}
            </Text>
          </View>
          <Text style={styles.balanceAmount}>
            {walletBalance + bonusBalance} AZN
          </Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'promotion' && styles.activeTab]}
            onPress={() => setActiveTab('promotion')}
          >
            <TrendingUp size={20} color={activeTab === 'promotion' ? Colors.primary || '#0E7490' : Colors.textSecondary || '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'promotion' && styles.activeTabText]}>
              {language === 'az' ? 'Təşviq' : 'Продвижение'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'views' && styles.activeTab]}
            onPress={() => setActiveTab('views')}
          >
            <Eye size={20} color={activeTab === 'views' ? Colors.primary || '#0E7490' : Colors.textSecondary || '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'views' && styles.activeTabText]}>
              {language === 'az' ? 'Baxış Al' : 'Купить просмотры'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'effects' && styles.activeTab]}
            onPress={() => setActiveTab('effects')}
          >
            <Sparkles size={20} color={activeTab === 'effects' ? Colors.primary || '#0E7490' : Colors.textSecondary || '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'effects' && styles.activeTabText]}>
              {language === 'az' ? 'Effektlər' : 'Эффекты'}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'promotion' ? (
          /* Promotion Packages */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {language === 'az' ? 'Təşviq Paketləri' : 'Пакеты продвижения'}
            </Text>
            <Text style={styles.sectionDescription}>
              {language === 'az'
                ? 'Elanınızın görünürlüyünü artırmaq üçün uyğun paketi seçin'
                : 'Выберите подходящий пакет для увеличения видимости вашего объявления'
              }
            </Text>

            {promotionPackages.map((pkg) => {
              const isSelected = selectedPackage?.id === pkg.id;
              const packageColor = getPackageColor(pkg.type);

              return (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.packageCard,
                    isSelected && { borderColor: packageColor, borderWidth: 2 },
                    isProcessing && styles.packageCardDisabled,
                  ]}
                  onPress={() => !isProcessing && setSelectedPackage(pkg)}
                  disabled={isProcessing}
                >
                  <View style={styles.packageHeader}>
                    <View style={styles.packageIcon}>
                      {getPackageIcon(pkg.type)}
                    </View>
                    <View style={styles.packageInfo}>
                      <Text style={styles.packageName}>
                        {pkg.name[language as keyof typeof pkg.name]}
                      </Text>
                      <Text style={styles.packagePrice}>
                        {pkg.price} {pkg.currency}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.selectedIndicator, { backgroundColor: packageColor }]}>
                        <Check size={16} color="white" />
                      </View>
                    )}
                  </View>

                  <Text style={styles.packageDescription}>
                    {pkg.description[language as keyof typeof pkg.description]}
                  </Text>

                  <View style={styles.packageFeatures}>
                    <View style={styles.feature}>
                      <Calendar size={16} color={Colors.textSecondary || '#6B7280'} />
                      <Text style={styles.featureText}>
                        {pkg.duration} {language === 'az' ? 'gün' : 'дней'}
                      </Text>
                    </View>
                    <View style={styles.feature}>
                      <TrendingUp size={16} color={Colors.textSecondary || '#6B7280'} />
                      <Text style={styles.featureText}>
                        {language === 'az' ? 'Artırılmış görünürlük' : 'Повышенная видимость'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : activeTab === 'views' ? (
          /* View Packages */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {language === 'az' ? 'Baxış Paketləri' : 'Пакеты просмотров'}
            </Text>
            <View style={styles.viewExplanationCard}>
              <Text style={styles.sectionDescription}>
                {language === 'az'
                  ? '👀 Elanınızı daha çox insana göstərin! Hər baxış yeni bir fürsətdir - alıcılar sizi tapacaq!'
                  : '👀 Покажите ваше объявление большему количеству людей! Каждый просмотр - новая возможность - покупатели найдут вас!'
                }
              </Text>

              <View style={styles.explanationBox}>
                <Text style={styles.explanationTitle}>
                  {language === 'az' ? '🎯 Baxış alma necə işləyir?' : '🎯 Как работает покупка просмотров?'}
                </Text>
                <Text style={styles.explanationText}>
                  {language === 'az'
                    ? `• Hazırda elanınızın ${listing.views} baxışı var\n• Baxış aldıqdan sonra elanınız dərhal ön sıralara keçəcək\n• Elanınız ${listing.views} + alınan baxış sayına çatana qədər ön sıralarda qalacaq\n• Məsələn 100 baxış alsanız, ${listing.views + 100} baxışa çatana qədər ön sıralarda olacaq\n• Bu müddətdə elanınız daha çox görünəcək və daha çox müştəri cəlb edəcək`
                    : `• Сейчас у вашего объявления ${listing.views} просмотров\n• После покупки просмотров ваше объявление сразу попадет в топ\n• Ваше объявление останется в топе до достижения ${listing.views} + купленных просмотров\n• Например, если купите 100 просмотров, будет в топе до ${listing.views + 100} просмотров\n• В этот период ваше объявление будет более заметным и привлечет больше клиентов`
                  }
                </Text>
              </View>
            </View>

            {viewPackages.map((pkg) => {
              const isSelected = selectedViewPackage?.id === pkg.id;

              return (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.packageCard,
                    isSelected && { borderColor: Colors.primary || '#0E7490', borderWidth: 2 },
                    isProcessing && styles.packageCardDisabled,
                  ]}
                  onPress={() => !isProcessing && setSelectedViewPackage(pkg)}
                  disabled={isProcessing}
                >
                  <View style={styles.packageHeader}>
                    <View style={[styles.packageIcon, { backgroundColor: 'rgba(14, 116, 144, 0.1)' }]}>
                      <Eye size={24} color={Colors.primary || '#0E7490'} />
                    </View>
                    <View style={styles.packageInfo}>
                      <Text style={styles.packageName}>
                        {pkg.name[language as keyof typeof pkg.name]}
                      </Text>
                      <Text style={styles.packagePrice}>
                        {pkg.price} {pkg.currency}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.selectedIndicator, { backgroundColor: Colors.primary || '#0E7490' }]}>
                        <Check size={16} color="white" />
                      </View>
                    )}
                  </View>

                  <Text style={styles.packageDescription}>
                    {pkg.description[language as keyof typeof pkg.description]}
                  </Text>

                  <View style={styles.packageFeatures}>
                    <View style={styles.feature}>
                      <Target size={16} color={Colors.textSecondary || '#6B7280'} />
                      <Text style={styles.featureText}>
                        {pkg.views} {language === 'az' ? 'baxış' : 'просмотров'}
                      </Text>
                    </View>
                    <View style={styles.feature}>
                      <Eye size={16} color={Colors.textSecondary || '#6B7280'} />
                      <Text style={styles.featureText}>
                        {pkg.pricePerView.toFixed(3)} AZN / {language === 'az' ? 'baxış' : 'просмотр'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          /* Creative Effects */
          <View style={styles.section}>
            <CreativeEffectsSection
              onSelectEffect={handleSelectEffect}
              selectedEffects={selectedEffects}
              title={language === 'az' ? 'Elan üçün Kreativ Effektlər' : 'Креативные Эффекты для Объявления'}
            />

          </View>
        )}
      </ScrollView>

      {/* Action Button */}
      {((activeTab === 'promotion' && !!selectedPackage) ||
        (activeTab === 'views' && !!selectedViewPackage) ||
        (activeTab === 'effects' && selectedEffects.length > 0)) && (
        <View style={styles.footer}>
          <TouchableOpacity
            testID="action-buy-button"
            style={[styles.promoteButton, isProcessing && styles.disabledButton]}
            onPress={activeTab === 'promotion' ? handlePromote : activeTab === 'views' ? handlePurchaseViews : handlePurchaseEffects}
            disabled={!currentUser || isProcessing}
          >
            <Text style={styles.promoteButtonText}>
              {isProcessing
                ? (language === 'az' ? 'Emal edilir...' : 'Обработка...')
                : activeTab === 'promotion'
                  ? `${language === 'az' ? 'Təşviq Et' : 'Продвинуть'} - ${(selectedPackage?.price ?? 0)} AZN`
                  : activeTab === 'views'
                    ? `${language === 'az' ? 'Baxış Al' : 'Купить просмотры'} - ${(selectedViewPackage?.price ?? 0)} AZN`
                    : `${language === 'az' ? 'Effektlər Al' : 'Купить эффекты'} - ${selectedEffects.length > 0 ? selectedEffects.reduce((sum, effect) => sum + effect.price, 0) : 0} AZN`
              }
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background || '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card || '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border || '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text || '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  listingPreview: {
    flexDirection: 'row',
    backgroundColor: Colors.card || '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  listingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text || '#1F2937',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary || '#0E7490',
    marginBottom: 4,
  },
  listingLocation: {
    fontSize: 14,
    color: Colors.textSecondary || '#6B7280',
    marginBottom: 8,
  },
  expiryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryText: {
    fontSize: 12,
    color: Colors.warning || '#F59E0B',
    fontWeight: '500',
  },
  daysLeft: {
    fontSize: 12,
    color: Colors.textSecondary || '#6B7280',
  },
  balanceCard: {
    backgroundColor: Colors.card || '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text || '#1F2937',
    marginLeft: 8,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary || '#0E7490',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text || '#1F2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textSecondary || '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  viewExplanationCard: {
    backgroundColor: Colors.card || '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  packageCardDisabled: {
    opacity: 0.5,
  },
  explanationBox: {
    backgroundColor: 'rgba(14, 116, 144, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary || '#0E7490',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 13,
    color: Colors.text || '#1F2937',
    lineHeight: 18,
  },
  packageCard: {
    backgroundColor: Colors.card || '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border || '#E5E7EB',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text || '#1F2937',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary || '#0E7490',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageDescription: {
    fontSize: 14,
    color: Colors.textSecondary || '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  packageFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: 12,
    color: Colors.textSecondary || '#6B7280',
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.card || '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border || '#E5E7EB',
  },
  promoteButton: {
    backgroundColor: Colors.primary || '#0E7490',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary || '#6B7280',
    opacity: 0.6,
  },
  promoteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  errorText: {
    fontSize: 16,
    color: Colors.error || '#EF4444',
    textAlign: 'center',
    marginTop: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.card || '#FFFFFF',
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
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
    backgroundColor: Colors.primary || '#0E7490' + '20',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary || '#6B7280',
  },
  activeTabText: {
    color: Colors.primary || '#0E7490',
    fontWeight: '600',
  },

});

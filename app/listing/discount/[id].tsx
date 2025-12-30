import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Switch, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useUserStore } from '@/store/userStore';
import { useDiscountStore } from '@/store/discountStore';
import { useListingStore } from '@/store/listingStore';
import Colors from '@/constants/colors';
import { ArrowLeft, Tag, Percent, Info, Save, Trash2, Plus, HelpCircle, Timer } from 'lucide-react-native';
import CountdownTimer from '@/components/CountdownTimer';

import { logger } from '@/utils/logger';
import { sanitizeTextInput } from '@/utils/inputValidation';
export default function ListingDiscountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { language } = useLanguageStore();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useUserStore();
  const { addDiscount, deleteDiscount, getStoreDiscounts, generateDiscountCode } = useDiscountStore();
  const { updateListing, listings: storeListings } = useListingStore();

  const [discountTitle, setDiscountTitle] = useState('');
  const [discountDescription, setDiscountDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [discountValue, setDiscountValue] = useState('');

  // ✅ BUG FIX: Sanitize numeric input to prevent invalid characters
  const handleDiscountValueChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
    setDiscountValue(sanitized);
  };
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [startDate] = useState(new Date());
  const [endDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [usageLimit, setUsageLimit] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Timer Bar Settings
  const [showTimerBar, setShowTimerBar] = useState(false);
  const [timerTitle, setTimerTitle] = useState('');
  const [timerEndDate, setTimerEndDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [timerBarColor, setTimerBarColor] = useState('#FF6B6B');
  const [enableTimerBar, setEnableTimerBar] = useState(false);

  // Custom time inputs
  const [customDays, setCustomDays] = useState('0');
  const [customHours, setCustomHours] = useState('6');
  const [customMinutes, setCustomMinutes] = useState('0');

  // ✅ Handle time input changes with validation
  const handleTimeInputChange = (text: string, setter: (value: string) => void, max: number) => {
    // Only allow numbers
    const cleaned = text.replace(/[^0-9]/g, '');

    if (cleaned === '') {
      setter('0');
      return;
    }

    const num = parseInt(cleaned, 10);

    if (isNaN(num)) {
      setter('0');
      return;
    }

    // Enforce max limit
    if (num > max) {
      setter(max.toString());
      return;
    }

    setter(num.toString());
  };

  const listing = storeListings.find(item => item.id === id);
  const existingDiscounts = listing?.storeId ? getStoreDiscounts(listing.storeId).filter(discount =>
    discount.applicableListings.includes(listing.id),
  ) : [];

  // Check if listing has individual discount
  const hasIndividualDiscount = listing?.hasDiscount || false;
  const individualDiscountPercentage = listing?.discountPercentage || 0;

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        language === 'az' ? 'Giriş tələb olunur' : 'Требуется вход',
        language === 'az' ? 'Bu funksiyadan istifadə etmək üçün hesabınıza daxil olun' : 'Войдите в аккаунт для использования этой функции',
        [
          { text: language === 'az' ? 'Ləğv et' : 'Отмена', style: 'cancel' },
          { text: language === 'az' ? 'Daxil ol' : 'Войти', onPress: () => router.push('/auth/login') },
        ],
      );

    }
  }, [isAuthenticated, language, router]);

  if (!listing) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>
          {language === 'az' ? 'Elan tapılmadı' : 'Объявление не найдено'}
        </Text>
      </View>
    );
  }

  const handleCreateDiscount = () => {
    logger.debug('[handleCreateDiscount] Button clicked');
    logger.debug('[handleCreateDiscount] Listing storeId:', listing.storeId);
    logger.debug('[handleCreateDiscount] Discount title:', discountTitle);
    logger.debug('[handleCreateDiscount] Discount value:', discountValue);
    logger.debug('[handleCreateDiscount] Discount type:', discountType);
    logger.debug('[handleCreateDiscount] Timer settings:', { enableTimerBar, showTimerBar, timerTitle, timerBarColor });

    // ===== VALIDATION START =====

    // 1. Store discount title validation
    if (listing.storeId && !discountTitle.trim()) {
      logger.debug('[handleCreateDiscount] Validation failed: Missing title');
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Endirim başlığını daxil edin' : 'Введите название скидки',
      );
      return;
    }

    if (listing.storeId && discountTitle.trim().length > 100) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Başlıq maksimum 100 simvol ola bilər' : 'Заголовок не должен превышать 100 символов',
      );
      return;
    }

    // 2. Description validation
    if (discountDescription.trim().length > 500) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Təsvir maksimum 500 simvol ola bilər' : 'Описание не должно превышать 500 символов',
      );
      return;
    }

    // 3. Discount value validation
    if (!discountValue || typeof discountValue !== 'string' || discountValue.trim().length === 0) {
      logger.debug('[handleCreateDiscount] Validation failed: Missing value');
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Endirim dəyəri daxil edin' : 'Введите значение скидки',
      );
      return;
    }

    const value = parseFloat(discountValue.trim());

    if (isNaN(value) || !isFinite(value)) {
      logger.debug('[handleCreateDiscount] Validation failed: Invalid value');
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Düzgün endirim dəyəri daxil edin' : 'Введите корректное значение',
      );
      return;
    }

    if (discountType === 'percentage') {
      if (value < 1 || value > 99) {
        logger.debug('[handleCreateDiscount] Validation failed: Percentage out of range');
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az'
            ? 'Endirim faizi 1-99 arasında olmalıdır'
            : 'Процент скидки должен быть от 1 до 99',
        );
        return;
      }
    } else if (discountType === 'fixed_amount') {
      if (value <= 0) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Endirim məbləği 0-dan böyük olmalıdır' : 'Сумма скидки должна быть больше 0',
        );
        return;
      }

      if (value > 10000) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Endirim məbləği maksimum 10,000 AZN ola bilər' : 'Сумма скидки не должна превышать 10,000 AZN',
        );
        return;
      }

      if (value >= listing.price) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Endirim məbləği məhsul qiymətindən az olmalıdır' : 'Сумма скидки должна быть меньше цены',
        );
        return;
      }
    }

    // 4. Date range validation
    const now = new Date();

    if (startDate >= endDate) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Başlama tarixi bitmə tarixindən əvvəl olmalıdır' : 'Дата начала должна быть раньше даты окончания',
      );
      return;
    }

    const maxDuration = 365 * 24 * 60 * 60 * 1000; // 1 year
    if (endDate.getTime() - startDate.getTime() > maxDuration) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Endirim müddəti maksimum 1 il ola bilər' : 'Максимальная длительность скидки 1 год',
      );
      return;
    }

    // 5. Timer bar validation (if enabled)
    if (enableTimerBar) {
      if (!timerTitle || timerTitle.trim().length === 0) {
        logger.debug('[handleCreateDiscount] Validation failed: Missing timer title');
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Sayğac başlığını daxil edin' : 'Введите заголовок таймера',
        );
        return;
      }

      if (timerTitle.trim().length > 50) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Sayğac başlığı maksimum 50 simvol ola bilər' : 'Заголовок таймера не должен превышать 50 символов',
        );
        return;
      }

      if (timerEndDate <= now) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Sayğac tarixi gələcəkdə olmalıdır' : 'Дата таймера должна быть в будущем',
        );
        return;
      }

      const maxTimerDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
      if (timerEndDate.getTime() - now.getTime() > maxTimerDuration) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Sayğac maksimum 30 günlük ola bilər' : 'Максимальная длительность таймера 30 дней',
        );
        return;
      }
    }

    // ===== VALIDATION END =====

    logger.debug('[handleCreateDiscount] Validation passed, showing confirmation dialog');

    Alert.alert(
      language === 'az' ? 'Endirim tətbiq edilsin?' : 'Применить скидку?',
      language === 'az'
        ? `${discountValue}${discountType === 'percentage' ? '%' : ' ' + listing.currency} endirim tətbiq ediləcək. Davam etmək istəyirsiniz?`
        : `Будет применена скидка ${discountValue}${discountType === 'percentage' ? '%' : ' ' + listing.currency}. Продолжить?`,
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
          onPress: () => logger.info('[ListingDiscount] User cancelled discount creation'),
        },
        {
          text: language === 'az' ? 'Təsdiq et' : 'Подтвердить',
          onPress: () => {
            logger.info('[ListingDiscount] User confirmed, applying discount');
            try {
              if (listing.storeId) {
                logger.info('[ListingDiscount] Creating store discount');
                handleCreateStoreDiscount();
              } else {
                logger.info('[ListingDiscount] Creating individual discount');
                handleCreateIndividualDiscount();
              }
            } catch (error) {
              logger.error('[ListingDiscount] Error applying discount:', error);
              Alert.alert(
                language === 'az' ? 'Xəta!' : 'Ошибка!',
                language === 'az' ? 'Endirim tətbiq edilərkən xəta baş verdi' : 'Произошла ошибка при применении скидки',
              );
            }
          },
        },
      ],
    );
  };

  const handleCreateStoreDiscount = () => {
    logger.info('[ListingDiscount] Creating store discount');

    try {
      // ✅ Use sanitized values
      const sanitizedTitle = sanitizeTextInput(discountTitle);
      const sanitizedDescription = sanitizeTextInput(discountDescription);

      const discountData = {
        storeId: listing.storeId!,
        title: sanitizedTitle,
        description: sanitizedDescription,
        type: discountType,
        value: Number(discountValue),
        minPurchaseAmount: minPurchaseAmount ? Number(minPurchaseAmount) : undefined,
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
        applicableListings: [listing.id],
        startDate,
        endDate,
        usageLimit: usageLimit ? Number(usageLimit) : undefined,
        usedCount: 0,
        isActive,
      };

      logger.info('[ListingDiscount] Discount data:', discountData);
      addDiscount(discountData);
      logger.info('[ListingDiscount] Discount added successfully');

      Alert.alert(
        language === 'az' ? 'Uğurlu!' : 'Успешно!',
        language === 'az' ? 'Mağaza endirimi yaradıldı' : 'Скидка магазина создана',
        [
          {
            text: language === 'az' ? 'Tamam' : 'OK',
            onPress: () => {
              logger.info('[ListingDiscount] Navigating back after store discount creation');
              router.back();
            },
          },
        ],
      );
    } catch (error) {
      logger.error('[ListingDiscount] Error creating store discount:', error);
      Alert.alert(
        language === 'az' ? 'Xəta!' : 'Ошибка!',
        language === 'az' ? 'Mağaza endirimi yaradılarkən xəta baş verdi' : 'Произошла ошибка при создании скидки магазина',
      );
    }
  };

  const handleCreateIndividualDiscount = () => {
    logger.info('[ListingDiscount] Starting individual discount creation');

    try {
      const value = Number(discountValue);
      let discountPercentage = 0;
      const originalPrice = listing.originalPrice || listing.price;
      let finalPrice = listing.price;

      logger.info('[ListingDiscount] Discount type:', discountType, 'Value:', value);
      logger.info('[ListingDiscount] Original price:', originalPrice, 'Current price:', listing.price);

      if (discountType === 'percentage') {
        discountPercentage = value;
        // Use precise calculation, round to 2 decimals
        finalPrice = parseFloat((originalPrice * (1 - value / 100)).toFixed(2));
        logger.debug('[handleCreateIndividualDiscount] Percentage discount - Final price:', finalPrice);
      } else if (discountType === 'fixed_amount') {
        // Use precise calculation, round to 2 decimals
        finalPrice = parseFloat(Math.max(0, originalPrice - value).toFixed(2));
        discountPercentage = originalPrice > 0 ? parseFloat((((originalPrice - finalPrice) / originalPrice) * 100).toFixed(2)) : 0;
        logger.debug('[handleCreateIndividualDiscount] Fixed amount discount:', {
          originalPrice,
          discountAmount: value,
          finalPrice,
          calculatedPercentage: discountPercentage,
        });
      }

      const chosenEndDate = enableTimerBar ? timerEndDate : endDate;

      // ✅ Sanitize timer title
      const sanitizedTimerTitle = enableTimerBar && showTimerBar ? sanitizeTextInput(timerTitle) : undefined;

      logger.info('[ListingDiscount] Timer settings:', {
        enableTimerBar,
        showTimerBar,
        timerTitle: sanitizedTimerTitle,
        chosenEndDate: chosenEndDate.toISOString(),
      });

      const updateData: Partial<typeof listing> = {
        hasDiscount: true,
        originalPrice,
        price: finalPrice, // ✅ Use precise value instead of Math.round
        promotionEndDate: chosenEndDate.toISOString(),
        discountEndDate: chosenEndDate.toISOString(),
        discountPercentage: discountType === 'percentage' ? value : discountPercentage,
        // Timer bar settings
        timerBarEnabled: enableTimerBar,
        timerBarTitle: enableTimerBar ? timerTitle.trim() : undefined,
        timerBarColor: enableTimerBar ? timerBarColor : undefined,
        timerBarEndDate: enableTimerBar ? timerEndDate.toISOString() : undefined,
      };

      logger.debug('[handleCreateIndividualDiscount] Update data:', updateData);
      updateListing(listing.id, updateData);

      logger.info('[ListingDiscount] Listing updated successfully');

      Alert.alert(
        language === 'az' ? 'Uğurlu!' : 'Успешно!',
        language === 'az' ? 'Elan endirimi tətbiq edildi' : 'Скидка на объявление применена',
        [
          {
            text: language === 'az' ? 'Tamam' : 'OK',
            onPress: () => {
              logger.info('[ListingDiscount] Navigating back after individual discount creation');
              router.back();
            },
          },
        ],
      );
    } catch (error) {
      logger.error('[ListingDiscount] Error creating individual discount:', error);
      Alert.alert(
        language === 'az' ? 'Xəta!' : 'Ошибка!',
        language === 'az' ? 'Elan endirimi tətbiq edilərkən xəta baş verdi' : 'Произошла ошибка при применении скидки на объявление',
      );
    }
  };

  const handleDeleteDiscount = (discountId: string) => {
    Alert.alert(
      language === 'az' ? 'Endirimi sil' : 'Удалить скидку',
      language === 'az' ? 'Bu endirimi silmək istəyirsiniz?' : 'Хотите удалить эту скидку?',
      [
        { text: language === 'az' ? 'Ləğv et' : 'Отмена', style: 'cancel' },
        {
          text: language === 'az' ? 'Sil' : 'Удалить',
          style: 'destructive',
          onPress: () => {
            deleteDiscount(discountId);
            Alert.alert(
              language === 'az' ? 'Silindi' : 'Удалено',
              language === 'az' ? 'Endirim silindi' : 'Скидка удалена',
            );
          },
        },
      ],
    );
  };

  const handleRemoveIndividualDiscount = () => {
    Alert.alert(
      language === 'az' ? 'Endirimi sil' : 'Удалить скидку',
      language === 'az' ? 'Bu endirimi silmək istəyirsiniz?' : 'Хотите удалить эту скидку?',
      [
        { text: language === 'az' ? 'Ləğv et' : 'Отмена', style: 'cancel' },
        {
          text: language === 'az' ? 'Sil' : 'Удалить',
          style: 'destructive',
          onPress: () => {
            updateListing(listing.id, {
              hasDiscount: false,
              discountPercentage: undefined,
              originalPrice: undefined,
              promotionEndDate: undefined,
            });
            Alert.alert(
              language === 'az' ? 'Silindi' : 'Удалено',
              language === 'az' ? 'Endirim silindi' : 'Скидка удалена',
            );
          },
        },
      ],
    );
  };

  const handleGenerateCode = (discountId: string) => {
    generateDiscountCode(discountId);
    Alert.alert(
      language === 'az' ? 'Kod yaradıldı' : 'Код создан',
      language === 'az' ? 'Endirim kodu yaradıldı' : 'Промокод создан',
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === 'az' ? 'az-AZ' : 'ru-RU');
  };

  const getDiscountPreview = () => {
    if (!discountValue || isNaN(Number(discountValue))) return null;

    const value = Number(discountValue);
    let discountAmount = 0;

    if (discountType === 'percentage') {
      discountAmount = (listing.price * value) / 100;
      if (maxDiscountAmount && Number(maxDiscountAmount)) {
        discountAmount = Math.min(discountAmount, Number(maxDiscountAmount));
      }
    } else {
      discountAmount = value;
    }

    const finalPrice = Math.max(0, listing.price - discountAmount);

    return {
      originalPrice: listing.price,
      discountAmount,
      finalPrice,
      savings: discountAmount,
    };
  };

  const preview = getDiscountPreview();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: (insets?.bottom ?? 0) + 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ height: insets.top, backgroundColor: Colors.card }} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'az' ? 'Məhsula Endirim' : 'Скидка на товар'}
          </Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => router.push('/discount-help')}
          >
            <HelpCircle size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Listing Info */}
        <View style={styles.listingInfo}>
          <Text style={styles.listingTitle}>{listing.title[language]}</Text>
          <Text style={styles.listingPrice}>{listing.price} {listing.currency}</Text>
        </View>

        {/* Individual Listing Discount */}
        {!listing.storeId && hasIndividualDiscount && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {language === 'az' ? 'Mövcud Endirim' : 'Текущая скидка'}
            </Text>
            <View style={styles.discountCard}>
              <View style={styles.discountHeader}>
                <View style={styles.discountInfo}>
                  <Tag size={16} color={Colors.secondary} />
                  <Text style={styles.discountName}>
                    {language === 'az' ? 'Elan Endirimi' : 'Скидка на объявление'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleRemoveIndividualDiscount()}
                >
                  <Trash2 size={14} color={Colors.error} />
                </TouchableOpacity>
              </View>
              <Text style={styles.discountValue}>
                {individualDiscountPercentage}% {language === 'az' ? 'endirim' : 'скидка'}
              </Text>
              <Text style={styles.discountDates}>
                {language === 'az' ? 'Aktiv' : 'Активна'}
                {listing.promotionEndDate && ` - ${formatDate(new Date(listing.promotionEndDate))}`}
              </Text>
            </View>
          </View>
        )}

        {/* Store Discounts */}
        {listing.storeId && existingDiscounts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {language === 'az' ? 'Mövcud Mağaza Endirimi' : 'Существующие скидки магазина'}
            </Text>
            {existingDiscounts.map((discount) => (
              <View key={discount.id} style={styles.discountCard}>
                <View style={styles.discountHeader}>
                  <View style={styles.discountInfo}>
                    <Tag size={16} color={Colors.secondary} />
                    <Text style={styles.discountName}>{discount.title}</Text>
                  </View>
                  <View style={styles.discountActions}>
                    <TouchableOpacity
                      style={styles.codeButton}
                      onPress={() => handleGenerateCode(discount.id)}
                    >
                      <Plus size={14} color={Colors.primary} />
                      <Text style={styles.codeButtonText}>
                        {language === 'az' ? 'Kod' : 'Код'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteDiscount(discount.id)}
                    >
                      <Trash2 size={14} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.discountValue}>
                  {discount.type === 'percentage'
                    ? `${discount.value}% ${language === 'az' ? 'endirim' : 'скидка'}`
                    : `${discount.value} ${listing.currency} ${language === 'az' ? 'endirim' : 'скидка'}`
                  }
                </Text>
                <Text style={styles.discountDates}>
                  {formatDate(new Date(discount.startDate))} - {formatDate(new Date(discount.endDate))}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Create New Discount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {listing.storeId
              ? (language === 'az' ? 'Yeni Mağaza Endirimi' : 'Новая скидка магазина')
              : (language === 'az' ? 'Elan Endirimi Tətbiq Et' : 'Применить скидку на объявление')
            }
          </Text>

          {!listing.storeId && (
            <View style={styles.infoBox}>
              <Info size={16} color={Colors.primary} />
              <Text style={styles.infoText}>
                {language === 'az'
                  ? 'Bu elan mağazaya aid olmadığı üçün birbaşa endirim tətbiq ediləcək. Endirim dərhal aktiv olacaq.'
                  : 'Поскольку это объявление не принадлежит магазину, скидка будет применена напрямую. Скидка станет активной немедленно.'
                }
              </Text>
            </View>
          )}

          {/* Store discounts need title and description */}
          {listing.storeId && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'Endirim Adı' : 'Название скидки'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={discountTitle}
                  onChangeText={setDiscountTitle}
                  placeholder={language === 'az' ? 'Məs: Yay endirimi' : 'Напр: Летняя скидка'}
                  placeholderTextColor={Colors.textSecondary}
                  returnKeyType="next"
                  maxLength={100}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'Təsvir' : 'Описание'}
                </Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={discountDescription}
                  onChangeText={setDiscountDescription}
                  placeholder={language === 'az' ? 'Endirim haqqında məlumat' : 'Информация о скидке'}
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  returnKeyType="done"
                />
              </View>
            </>
          )}

          {/* Discount Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {language === 'az' ? 'Endirim Növü' : 'Тип скидки'}
            </Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, discountType === 'percentage' && styles.typeButtonActive]}
                onPress={() => setDiscountType('percentage')}
              >
                <Percent size={16} color={discountType === 'percentage' ? 'white' : Colors.primary} />
                <Text style={[styles.typeButtonText, discountType === 'percentage' && styles.typeButtonTextActive]}>
                  {language === 'az' ? 'Faiz' : 'Процент'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, discountType === 'fixed_amount' && styles.typeButtonActive]}
                onPress={() => setDiscountType('fixed_amount')}
              >
                <Text style={[styles.typeButtonText, discountType === 'fixed_amount' && styles.typeButtonTextActive]}>
                  {listing.currency}
                </Text>
                <Text style={[styles.typeButtonText, discountType === 'fixed_amount' && styles.typeButtonTextActive]}>
                  {language === 'az' ? 'Məbləğ' : 'Сумма'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Discount Value */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {language === 'az' ? 'Endirim Dəyəri' : 'Значение скидки'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={discountValue}
              onChangeText={handleDiscountValueChange}
              placeholder={discountType === 'percentage' ? '10' : '50'}
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>

          {/* Preview */}
          {preview && (
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>
                {language === 'az' ? 'Önizləmə' : 'Предварительный просмотр'}
              </Text>
              <View style={styles.previewPrices}>
                <Text style={styles.originalPrice}>
                  {preview.originalPrice} {listing.currency}
                </Text>
                <Text style={styles.discountedPrice}>
                  {preview.finalPrice} {listing.currency}
                </Text>
              </View>
              <Text style={styles.savingsText}>
                {language === 'az' ? 'Qənaət:' : 'Экономия:'} {preview.savings} {listing.currency}
              </Text>
            </View>
          )}

          {/* Advanced Settings Toggle - Only for store discounts */}
          {listing.storeId && (
            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <View style={styles.toggleContent}>
                <Info size={20} color={Colors.primary} />
                <Text style={styles.advancedToggleText}>
                  {language === 'az' ? 'Əlavə Tənzimləmələr' : 'Дополнительные настройки'}
                </Text>
              </View>
              <Switch
                value={showAdvanced}
                onValueChange={setShowAdvanced}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={showAdvanced ? 'white' : Colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {/* Timer Bar Settings */}
          <TouchableOpacity
            style={styles.advancedToggle}
            onPress={() => setShowTimerBar(!showTimerBar)}
          >
            <View style={styles.toggleContent}>
              <Timer size={20} color={Colors.primary} />
              <Text style={styles.advancedToggleText}>
                {language === 'az' ? 'Vaxt Sayğacı Bar' : 'Таймер Бар'}
              </Text>
            </View>
            <Switch
              value={showTimerBar}
              onValueChange={setShowTimerBar}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={showTimerBar ? 'white' : Colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Timer Bar Configuration */}
          {showTimerBar && (
            <View style={styles.timerBarSettings}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'Sayğac Başlığı' : 'Заголовок таймера'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={timerTitle}
                  onChangeText={setTimerTitle}
                  placeholder={language === 'az' ? 'Məs: Məhdud vaxt təklifi!' : 'Напр: Ограниченное по времени предложение!'}
                  placeholderTextColor={Colors.textSecondary}
                  returnKeyType="done"
                  maxLength={50}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'Sayğac Rəngi' : 'Цвет таймера'}
                </Text>
                <View style={styles.colorSelector}>
                  {['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'].map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        timerBarColor === color && styles.selectedColor,
                      ]}
                      onPress={() => setTimerBarColor(color)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'Vaxt təyin edin' : 'Установите время'}
                </Text>

                {/* Quick Duration Buttons */}
                <View style={styles.quickDurationButtons}>
                  <TouchableOpacity
                    style={styles.quickDurationButton}
                    onPress={() => {
                      const newEndDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
                      setTimerEndDate(newEndDate);
                      setCustomDays('1');
                      setCustomHours('0');
                      setCustomMinutes('0');
                      Alert.alert(
                        language === 'az' ? 'Uğurlu' : 'Успешно',
                        language === 'az' ? '1 gün təyin edildi' : 'Установлен 1 день',
                      );
                    }}
                  >
                    <Text style={styles.quickDurationText}>
                      {language === 'az' ? '1 Gün' : '1 День'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickDurationButton}
                    onPress={() => {
                      const newEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                      setTimerEndDate(newEndDate);
                      setCustomDays('3');
                      setCustomHours('0');
                      setCustomMinutes('0');
                      Alert.alert(
                        language === 'az' ? 'Uğurlu' : 'Успешно',
                        language === 'az' ? '3 gün təyin edildi' : 'Установлено 3 дня',
                      );
                    }}
                  >
                    <Text style={styles.quickDurationText}>
                      {language === 'az' ? '3 Gün' : '3 Дня'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickDurationButton}
                    onPress={() => {
                      const newEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                      setTimerEndDate(newEndDate);
                      setCustomDays('7');
                      setCustomHours('0');
                      setCustomMinutes('0');
                      Alert.alert(
                        language === 'az' ? 'Uğurlu' : 'Успешно',
                        language === 'az' ? '7 gün təyin edildi' : 'Установлено 7 дней',
                      );
                    }}
                  >
                    <Text style={styles.quickDurationText}>
                      {language === 'az' ? '7 Gün' : '7 Дней'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.compactTimeContainer}>
                  <View style={styles.compactTimeInputs}>
                    <View style={styles.compactTimeInputGroup}>
                      <Text style={styles.compactTimeInputLabel}>
                        {language === 'az' ? 'Gün' : 'Дни'}
                      </Text>
                      <TextInput
                        style={styles.compactTimeInput}
                        value={customDays}
                        onChangeText={(text) => {
                          const numericValue = text.replace(/[^0-9]/g, '');
                          setCustomDays(numericValue);
                        }}
                        placeholder="0"
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="number-pad"
                        maxLength={3}
                        returnKeyType="next"
                      />
                    </View>
                    <Text style={styles.compactTimeSeparator}>:</Text>
                    <View style={styles.compactTimeInputGroup}>
                      <Text style={styles.compactTimeInputLabel}>
                        {language === 'az' ? 'Saat' : 'Часы'}
                      </Text>
                      <TextInput
                        style={styles.compactTimeInput}
                        value={customHours}
                        onChangeText={(text) => {
                          const numericValue = text.replace(/[^0-9]/g, '');
                          const hours = parseInt(numericValue) || 0;
                          if (hours <= 23) {
                            setCustomHours(numericValue);
                          }
                        }}
                        placeholder="0"
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="number-pad"
                        maxLength={2}
                        returnKeyType="next"
                      />
                    </View>
                    <Text style={styles.compactTimeSeparator}>:</Text>
                    <View style={styles.compactTimeInputGroup}>
                      <Text style={styles.compactTimeInputLabel}>
                        {language === 'az' ? 'Dəqiqə' : 'Минуты'}
                      </Text>
                      <TextInput
                        style={styles.compactTimeInput}
                        value={customMinutes}
                        onChangeText={(text) => {
                          const numericValue = text.replace(/[^0-9]/g, '');
                          const minutes = parseInt(numericValue) || 0;
                          if (minutes <= 59) {
                            setCustomMinutes(numericValue);
                          }
                        }}
                        placeholder="0"
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="number-pad"
                        maxLength={2}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.compactApplyButton}
                    onPress={() => {
                      const days = parseInt(customDays, 10) || 0;
                      const hours = parseInt(customHours, 10) || 0;
                      const minutes = parseInt(customMinutes, 10) || 0;

                      if (days === 0 && hours === 0 && minutes === 0) {
                        Alert.alert(
                          language === 'az' ? 'Xəta' : 'Ошибка',
                          language === 'az' ? 'Ən azı bir vaxt dəyəri daxil edin' : 'Введите хотя бы одно значение времени',
                        );
                        return;
                      }

                      const totalMilliseconds = (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
                      const newEndDate = new Date(Date.now() + totalMilliseconds);
                      setTimerEndDate(newEndDate);
                      Alert.alert(
                        language === 'az' ? 'Uğurlu' : 'Успешно',
                        language === 'az' ? 'Vaxt təyin edildi' : 'Время установлено',
                      );
                    }}
                  >
                    <Text style={styles.compactApplyText}>
                      {language === 'az' ? 'Tətbiq et' : 'Применить'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.currentTimeDisplay}>
                  {language === 'az' ? 'Cari vaxt: ' : 'Текущее время: '}
                  {timerEndDate.toLocaleDateString(language === 'az' ? 'az-AZ' : 'ru-RU')} {timerEndDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
              </View>

              <View style={styles.switchGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'Sayğacı Aktiv Et' : 'Активировать таймер'}
                </Text>
                <Switch
                  value={enableTimerBar}
                  onValueChange={setEnableTimerBar}
                  trackColor={{ false: Colors.border, true: timerBarColor }}
                  thumbColor={enableTimerBar ? 'white' : Colors.textSecondary}
                />
              </View>

              {/* Timer Preview */}
              {enableTimerBar && timerTitle && (
                <View style={styles.timerPreview}>
                  <Text style={styles.previewTitle}>
                    {language === 'az' ? 'Sayğac Önizləməsi' : 'Предварительный просмотр таймера'}
                  </Text>
                  <View style={[styles.customTimerBar, { borderColor: timerBarColor }]}>
                    <View style={styles.timerHeader}>
                      <Timer size={16} color={timerBarColor} />
                      <Text style={[styles.timerTitle, { color: timerBarColor }]}>
                        {timerTitle}
                      </Text>
                    </View>
                    <CountdownTimer
                      endDate={timerEndDate}
                      style={[styles.timerContent, { backgroundColor: `${timerBarColor}15` }] as unknown as Record<string, unknown>}
                      compact={false}
                    />
                  </View>
                </View>
              )}

              <View style={styles.infoBox}>
                <Info size={16} color={Colors.primary} />
                <Text style={styles.infoText}>
                  {language === 'az'
                    ? 'Vaxt sayğacı bar endirimlə birlikdə göstəriləcək və müştərilərdə təcililik hissi yaradacaq. Sayğac bitdikdə endirim avtomatik olaraq deaktiv olacaq.'
                    : 'Таймер бар будет отображаться вместе со скидкой и создаст у покупателей чувство срочности. Когда таймер закончится, скидка автоматически деактивируется.'
                  }
                </Text>
              </View>
            </View>
          )}

          {/* Advanced Settings - Only for store discounts */}
          {listing.storeId && showAdvanced && (
            <View style={styles.advancedSettings}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'Minimum Alış Məbləği' : 'Минимальная сумма покупки'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={minPurchaseAmount}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9.]/g, '');
                    setMinPurchaseAmount(numericValue);
                  }}
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>

              {discountType === 'percentage' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {language === 'az' ? 'Maksimum Endirim Məbləği' : 'Максимальная сумма скидки'}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={maxDiscountAmount}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9.]/g, '');
                      setMaxDiscountAmount(numericValue);
                    }}
                    placeholder="100"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'İstifadə Limiti' : 'Лимит использования'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={usageLimit}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setUsageLimit(numericValue);
                  }}
                  placeholder={language === 'az' ? 'Limitsiz' : 'Без ограничений'}
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>

              <View style={styles.switchGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'Aktiv' : 'Активна'}
                </Text>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: Colors.border, true: Colors.success }}
                  thumbColor={isActive ? 'white' : Colors.textSecondary}
                />
              </View>
            </View>
          )}

          {/* Info Box - Different for store vs individual */}
          {listing.storeId && (
            <View style={styles.infoBox}>
              <Info size={16} color={Colors.primary} />
              <Text style={styles.infoText}>
                {language === 'az'
                  ? 'Mağaza endirimi yaradıldıqdan sonra müştərilər bu məhsulu endirimlə ala biləcəklər. Endirim kodları da yarada bilərsiniz.'
                  : 'После создания скидки магазина покупатели смогут приобрести этот товар со скидкой. Вы также можете создать промокоды.'
                }
              </Text>
            </View>
          )}

          {/* Create Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => {
              logger.info('[ListingDiscount] Apply discount button pressed');
              handleCreateDiscount();
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={language === 'az' ? 'Endirim Tətbiq Et' : 'Применить скидку'}
            testID="apply-discount-button"
          >
            <Save size={20} color="white" />
            <Text style={styles.createButtonText}>
              {listing.storeId
                ? (language === 'az' ? 'Mağaza Endirimi Yarat' : 'Создать скидку магазина')
                : (language === 'az' ? 'Endirim Tətbiq Et' : 'Применить скидку')
              }
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  helpButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
  },
  listingInfo: {
    padding: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  discountCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  discountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  discountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  discountActions: {
    flexDirection: 'row',
    gap: 8,
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    gap: 4,
  },
  codeButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  discountValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.secondary,
    marginBottom: 4,
  },
  discountDates: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.card,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  typeButtonTextActive: {
    color: 'white',
  },
  previewCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  previewPrices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 16,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.success,
  },
  savingsText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '500',
  },
  advancedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  advancedToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  timerBarSettings: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  colorSelector: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: Colors.text,
    borderWidth: 3,
  },
  dateSelector: {
    gap: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.card,
    gap: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  quickDateButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickDateButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    alignItems: 'center',
  },
  quickDateText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  timerPreview: {
    backgroundColor: 'rgba(14, 116, 144, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(14, 116, 144, 0.2)',
  },
  customTimerBar: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  timerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timerContent: {
    borderRadius: 8,
    padding: 8,
  },
  advancedSettings: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  customTimeToggle: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    alignItems: 'center',
  },
  customTimeToggleText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  customTimeContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: 'rgba(14, 116, 144, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(14, 116, 144, 0.2)',
  },
  customTimeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 12,
  },
  customTimeInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  timeInputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  timeInputLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.card,
    textAlign: 'center',
    minWidth: 50,
  },
  applyCustomTimeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  applyCustomTimeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  compactTimeContainer: {
    marginTop: 8,
  },
  compactTimeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  compactTimeInputGroup: {
    alignItems: 'center',
  },
  compactTimeInputLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 3,
    fontWeight: '500',
  },
  compactTimeInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.card,
    textAlign: 'center',
    width: 45,
    height: 36,
  },
  compactTimeSeparator: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
  },
  compactApplyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  compactApplyText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  currentTimeDisplay: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  quickDurationButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickDurationButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  quickDurationText: {
    fontSize: 13,
    color: 'white',
    fontWeight: '600',
  },
});

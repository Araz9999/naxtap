import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useLanguageStore } from '@/store/languageStore';
import { useStoreStore } from '@/store/storeStore';
import { useUserStore } from '@/store/userStore';
import { paymentMethods } from '@/constants/paymentMethods';
import Colors from '@/constants/colors';
import { storeLogger } from '@/utils/logger';
import { validateEmail, validateWebsiteURL, validateAzerbaijanPhone } from '@/utils/inputValidation'; // ✅ Import validation
import {
  Check,
  ArrowLeft,
  Building2,
  Trash2,
  Camera,
  Image as ImageIcon,
  Settings,
} from 'lucide-react-native';

export default function CreateStoreScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { activateStore, getStorePlans, getUserStore, deleteStore, getAllUserStores } = useStoreStore();
  const { isAuthenticated, currentUser } = useUserStore();
  const userStore = getUserStore(currentUser?.id || '');
  const [currentStep, setCurrentStep] = useState<number>(userStore ? 0 : 1);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [storeData, setStoreData] = useState({
    name: '',
    categoryName: '',
    address: '',
    description: '',
    logo: '',
    coverImage: '',
    contactInfo: {
      phone: '',
      email: '',
      website: '',
      whatsapp: '',
    },
  });

  const plans = getStorePlans();
  const userStores = getAllUserStores(currentUser?.id || '');
  const isFirstStore = userStores.length === 0;
  const discount = isFirstStore ? 0 : 0.25;

  // ✅ Log screen access
  useEffect(() => {
    storeLogger.info('[CreateStore] Screen opened:', {
      hasExistingStore: !!userStore,
      storeId: userStore?.id,
      storeName: userStore?.name,
      currentStep,
      isFirstStore,
    });
  }, []);

  const getPlanPrice = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return 100;
    return isFirstStore ? plan.price : Math.round(plan.price * (1 - discount));
  };

  const selectedPlanPrice = selectedPlan ? getPlanPrice(selectedPlan) : 0;

  const handleNext = () => {
    storeLogger.info('[CreateStore] Navigation to next step:', {
      currentStep,
      selectedPlan,
      selectedPayment,
    });

    // Step 1: Package selection validation - CRITICAL CHECK
    if (currentStep === 1) {
      if (!selectedPlan || selectedPlan === '') {
        storeLogger.warn('[CreateStore] Step 1 validation failed: No plan selected');
        Alert.alert(
          language === 'az' ? '❌ Paket Seçilməyib!' : '❌ Пакет не выбран!',
          language === 'az'
            ? 'Zəhmət olmasa əvvəlcə paket seçin. Paket seçmədən növbəti addıma keçə bilməzsiniz.'
            : 'Пожалуйста, сначала выберите пакет. Без выбора пакета нельзя перейти к следующему шагу.',
        );
        return;
      }
      storeLogger.info('[CreateStore] Step 1 validation passed:', {
        selectedPlan,
        price: getPlanPrice(selectedPlan),
      });
    }

    // Step 2: Store information validation
    if (currentStep === 2) {
      // Validation: Store name
      if (!storeData.name.trim()) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Mağaza adı daxil edin' : 'Введите название магазина',
        );
        return;
      }

      if (storeData.name.trim().length < 3) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Mağaza adı ən azı 3 simvol olmalıdır' : 'Название магазина должно быть не менее 3 символов',
        );
        return;
      }

      if (storeData.name.trim().length > 50) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Mağaza adı maksimum 50 simvol ola bilər' : 'Название магазина не должно превышать 50 символов',
        );
        return;
      }

      // Validation: Category name
      if (!storeData.categoryName.trim()) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Kateqoriya adı daxil edin' : 'Введите название категории',
        );
        return;
      }

      if (storeData.categoryName.trim().length < 3) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Kateqoriya adı ən azı 3 simvol olmalıdır' : 'Название категории должно быть не менее 3 символов',
        );
        return;
      }

      // Validation: Address
      if (storeData.address.trim() && storeData.address.trim().length < 5) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Ünvan ən azı 5 simvol olmalıdır' : 'Адрес должен быть не менее 5 символов',
        );
        return;
      }

      // Validation: Email format if provided
      if (storeData.contactInfo.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storeData.contactInfo.email.trim())) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Düzgün email formatı daxil edin' : 'Введите корректный формат email',
        );
        return;
      }

      // Validation: Phone number if provided
      if (storeData.contactInfo.phone.trim() && storeData.contactInfo.phone.trim().length < 9) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Telefon nömrəsi ən azı 9 rəqəm olmalıdır' : 'Номер телефона должен содержать не менее 9 цифр',
        );
        return;
      }

      // Validation: Website URL if provided
      if (storeData.contactInfo.website.trim() && !storeData.contactInfo.website.trim().match(/^https?:\/\/.+/)) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Vebsayt http:// və ya https:// ilə başlamalıdır' : 'Веб-сайт должен начинаться с http:// или https://',
        );
        return;
      }

      // ✅ Validate email if provided
      if (storeData.contactInfo.email && !validateEmail(storeData.contactInfo.email)) {
        storeLogger.warn('[CreateStore] Invalid email:', { email: storeData.contactInfo.email });
        Alert.alert(
          language === 'az' ? 'Email düzgün deyil' : 'Неверный email',
          language === 'az' ? 'Zəhmət olmasa düzgün email daxil edin' : 'Пожалуйста, введите корректный email',
        );
        return;
      }

      // ✅ Validate website if provided
      if (storeData.contactInfo.website && !validateWebsiteURL(storeData.contactInfo.website)) {
        storeLogger.warn('[CreateStore] Invalid website:', { website: storeData.contactInfo.website });
        Alert.alert(
          language === 'az' ? 'Veb sayt düzgün deyil' : 'Неверный веб-сайт',
          language === 'az' ? 'Zəhmət olmasa düzgün URL daxil edin (https://example.com)' : 'Пожалуйста, введите корректный URL (https://example.com)',
        );
        return;
      }

      // ✅ Validate phone if provided
      if (storeData.contactInfo.phone && !validateAzerbaijanPhone(storeData.contactInfo.phone)) {
        storeLogger.warn('[CreateStore] Invalid phone:', { phone: storeData.contactInfo.phone });
        Alert.alert(
          language === 'az' ? 'Telefon nömrəsi düzgün deyil' : 'Неверный номер телефона',
          language === 'az' ? 'Zəhmət olmasa Azərbaycan telefon nömrəsi daxil edin (+994...)' : 'Пожалуйста, введите азербайджанский номер телефона (+994...)',
        );
        return;
      }

      // ✅ Validate WhatsApp if provided
      if (storeData.contactInfo.whatsapp && !validateAzerbaijanPhone(storeData.contactInfo.whatsapp)) {
        storeLogger.warn('[CreateStore] Invalid WhatsApp:', { whatsapp: storeData.contactInfo.whatsapp });
        Alert.alert(
          language === 'az' ? 'WhatsApp nömrəsi düzgün deyil' : 'Неверный номер WhatsApp',
          language === 'az' ? 'Zəhmət olmasa Azərbaycan telefon nömrəsi daxil edin (+994...)' : 'Пожалуйста, введите азербайджанский номер телефона (+994...)',
        );
        return;
      }

      storeLogger.info('[CreateStore] Step 2 validation passed');
    }

    // Skip payment validation - no payment required

    // IMPORTANT: Only move to next step, NO PAYMENT HERE
    storeLogger.info('[CreateStore] Moving to next step:', { from: currentStep, to: currentStep + 1 });
    setCurrentStep(prev => prev + 1);
  };

  const handleCreateStore = async () => {
    storeLogger.debug('🔥 handleCreateStore called - WITH PAYMENT PROCESSING');
    storeLogger.debug('isAuthenticated:', isAuthenticated);
    storeLogger.debug('currentUser:', currentUser?.id);
    storeLogger.debug('selectedPlan:', selectedPlan);

    if (!isAuthenticated || !currentUser) {
      Alert.alert(
        language === 'az' ? 'Giriş Tələb Olunur' : 'Требуется вход',
        language === 'az' ? 'Mağaza yaratmaq üçün hesabınıza daxil olun' : 'Войдите в аккаунт для создания магазина',
      );
      return;
    }

    // CRITICAL VALIDATION: Must have package selected
    if (!selectedPlan || selectedPlan === '') {
      Alert.alert(
        language === 'az' ? '❌ Paket Seçilməyib!' : '❌ Пакет не выбран!',
        language === 'az'
          ? 'XƏTA: Mağaza yaratmaq üçün mütləq paket seçməlisiniz!\n\nZəhmət olmasa:\n1. Geri düyməsinə basın\n2. Paket seçin\n3. Yenidən cəhd edin'
          : 'ОШИБКА: Для создания магазина обязательно нужно выбрать пакет!\n\nПожалуйста:\n1. Нажмите кнопку "Назад"\n2. Выберите пакет\n3. Попробуйте снова',
      );
      return;
    }

    // Get the selected plan details and calculate price
    const selectedPlanData = plans.find(p => p.id === selectedPlan);
    if (!selectedPlanData) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Seçilmiş paket tapılmadı' : 'Выбранный пакет не найден',
      );
      return;
    }

    const finalPrice = getPlanPrice(selectedPlan);
    storeLogger.debug('💰 Final price calculated:', finalPrice, 'AZN');

    // Import wallet functions
    const { walletBalance, spendFromWallet } = useUserStore.getState();

    // Check if user has enough balance
    if (walletBalance < finalPrice) {
      Alert.alert(
        language === 'az' ? '💰 Kifayət qədər balans yoxdur' : '💰 Недостаточно средств',
        language === 'az'
          ? `Mağaza yaratmaq üçün ${finalPrice} AZN lazımdır.\nCari balansınız: ${walletBalance.toFixed(2)} AZN\n\nZəhmət olmasa balansınızı artırın.`
          : `Для создания магазина требуется ${finalPrice} AZN.\nВаш текущий баланс: ${walletBalance.toFixed(2)} AZN\n\nПожалуйста, пополните баланс.`,
      );
      return;
    }

    // Show payment confirmation dialog
    Alert.alert(
      language === 'az' ? '💳 Ödəniş Təsdiqi' : '💳 Подтверждение оплаты',
      language === 'az'
        ? `Seçilmiş paket: ${selectedPlanData.name.az}\nQiymət: ${finalPrice} AZN\nMağaza adı: ${storeData.name}\nKateqoriya: ${storeData.categoryName}\n\nBalansınızdan ${finalPrice} AZN çıxılacaq. Davam etmək istəyirsiniz?`
        : `Выбранный пакет: ${selectedPlanData.name.ru}\nЦена: ${finalPrice} AZN\nНазвание магазина: ${storeData.name}\nКатегория: ${storeData.categoryName}\n\nС вашего баланса будет списано ${finalPrice} AZN. Продолжить?`,
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'az' ? '💳 Ödə və Yarat' : '💳 Оплатить и создать',
          onPress: async () => {
            storeLogger.debug('💳 Processing payment and creating store...');

            try {
              // First, process payment
              const paymentSuccess = spendFromWallet(finalPrice);
              if (!paymentSuccess) {
                Alert.alert(
                  language === 'az' ? 'Ödəniş Xətası' : 'Ошибка оплаты',
                  language === 'az' ? 'Ödəniş zamanı xəta baş verdi' : 'Произошла ошибка при оплате',
                );
                return;
              }

              storeLogger.debug('✅ Payment processed successfully');

              // Then create the store
              await activateStore(currentUser.id, selectedPlan, storeData);

              storeLogger.debug('✅ Store created successfully');

              Alert.alert(
                language === 'az' ? '🎉 Mağaza Yaradıldı!' : '🎉 Магазин создан!',
                language === 'az'
                  ? `Ödəniş uğurlu! Mağazanız yaradıldı.\n\n💳 Ödənilən məbləğ: ${finalPrice} AZN\n📦 Seçilmiş paket: ${selectedPlanData.name.az}\n🏪 Mağaza adı: ${storeData.name}`
                  : `Оплата успешна! Ваш магазин создан.\n\n💳 Списано: ${finalPrice} AZN\n📦 Выбранный пакет: ${selectedPlanData.name.ru}\n🏪 Название: ${storeData.name}`,
                [{ text: 'OK', onPress: () => router.back() }],
              );
            } catch (error) {
              storeLogger.error('❌ Store creation error:', error);

              // ✅ Better error messages
              const errorMessage = error instanceof Error ? error.message : '';
              const isMultiStoreError = errorMessage.includes('already has an active store');

              Alert.alert(
                language === 'az' ? 'Yaratma Xətası' : 'Ошибка создания',
                isMultiStoreError
                  ? (language === 'az'
                    ? 'Sizin artıq aktiv mağazanız var. Əlavə mağaza yaratmaq üçün əvvəlcə mövcud mağazanızı idarə edin.'
                    : 'У вас уже есть активный магазин. Для создания дополнительного магазина управляйте существующим.')
                  : (language === 'az' ? 'Mağaza yaradılarkən xəta baş verdi' : 'Произошла ошибка при создании магазина'),
              );
            }
          },
        },
      ],
    );
  };

  const handleDeleteStore = () => {
    if (!userStore) return;

    Alert.alert(
      language === 'az' ? 'Mağazanı Sil' : 'Удалить магазин',
      language === 'az' ? 'Bu mağazanı silmək istədiyinizə əminsiniz? Bu əməliyyat geri alına bilməz.' : 'Вы уверены, что хотите удалить этот магазин? Это действие нельзя отменить.',
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'az' ? 'Sil' : 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStore(userStore.id);
              Alert.alert(
                language === 'az' ? 'Uğurlu!' : 'Успешно!',
                language === 'az' ? 'Mağaza uğurla silindi' : 'Магазин успешно удален',
              );
              setCurrentStep(1);
            } catch (error) {
              Alert.alert(
                language === 'az' ? 'Xəta' : 'Ошибка',
                language === 'az' ? 'Mağaza silinərkən xəta baş verdi' : 'Произошла ошибка при удалении магазина',
              );
            }
          },
        },
      ],
    );
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.stepCircleActive,
          ]}>
            {currentStep > step ? (
              <Check size={16} color="white" />
            ) : (
              <Text style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive,
              ]}>
                {step}
              </Text>
            )}
          </View>
          {step < 3 && (
            <View style={[
              styles.stepLine,
              currentStep > step && styles.stepLineActive,
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderPlanSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>
        {language === 'az' ? 'Paket Seçin' : 'Выберите пакет'}
      </Text>
      <Text style={styles.stepDescription}>
        {language === 'az'
          ? `Mağazanız üçün uyğun paketi seçin. ${isFirstStore ? 'İlk mağaza yaratmaq' : 'Əlavə mağaza yaratmaq (25% endirim)'}`
          : `Выберите подходящий пакет для вашего магазина. ${isFirstStore ? 'Создание первого магазина' : 'Создание дополнительного магазина (скидка 25%)'}`}
      </Text>

      {!selectedPlan && (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            {language === 'az'
              ? '⚠️ Zəhmət olmasa əvvəlcə paket seçin. Paket seçmədən ödəniş edə bilməzsiniz.'
              : '⚠️ Пожалуйста, сначала выберите пакет. Без выбора пакета оплата невозможна.'}
          </Text>
        </View>
      )}

      {selectedPlan && (
        <View style={styles.selectedPackageInfo}>
          <Text style={styles.selectedPackageText}>
            {language === 'az' ? '✅ Seçilmiş paket:' : '✅ Выбранный пакет:'}
          </Text>
          <Text style={styles.selectedPackageName}>
            {plans.find(p => p.id === selectedPlan)?.name[language as keyof typeof plans[0]['name']]} - {getPlanPrice(selectedPlan)} AZN
          </Text>
        </View>
      )}

      {plans.map((plan) => (
        <TouchableOpacity
          key={plan.id}
          style={[
            styles.planCard,
            selectedPlan === plan.id && styles.planCardSelected,
          ]}
          onPress={() => {
            storeLogger.info('[CreateStore] Plan selected:', {
              planId: plan.id,
              planName: plan.name.az,
              price: getPlanPrice(plan.id),
              maxAds: plan.maxAds,
              isFirstStore,
            });
            setSelectedPlan(plan.id);
          }}
        >
          <View style={styles.planHeader}>
            <Text style={styles.planName}>
              {plan.name[language as keyof typeof plan.name]}
            </Text>
            <Text style={styles.planPrice}>
              {getPlanPrice(plan.id)} AZN
              {!isFirstStore && (
                <Text style={styles.discountText}>
                  {' '}({language === 'az' ? '25% endirim' : 'скидка 25%'})
                </Text>
              )}
            </Text>
          </View>
          <Text style={styles.planAds}>
            {language === 'az' ? `${plan.maxAds}-ə qədər elan` : `До ${plan.maxAds} объявлений`}
          </Text>
          <View style={styles.planFeatures}>
            {plan.features.map((feature, index) => (
              <Text key={index} style={styles.planFeature}>
                • {feature[language as keyof typeof feature]}
              </Text>
            ))}
          </View>
          {selectedPlan === plan.id && (
            <View style={styles.selectedIndicator}>
              <Check size={20} color={Colors.primary} />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const handleProfileImagePicker = () => {
    Alert.alert(
      language === 'az' ? 'Profil şəkli əlavə et' : 'Добавить изображение профиля',
      language === 'az' ? 'Şəkil seçmək üçün seçim edin' : 'Выберите способ добавления фото',
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'az' ? 'Kameradan' : 'Камера',
          onPress: () => pickProfileImageFromCamera(),
        },
        {
          text: language === 'az' ? 'Qalereya' : 'Галерея',
          onPress: () => pickProfileImageFromGallery(),
        },
      ],
    );
  };

  const handleCoverImagePicker = () => {
    Alert.alert(
      language === 'az' ? 'Arxa fon şəkli əlavə et' : 'Добавить фоновое изображение',
      language === 'az' ? 'Şəkil seçmək üçün seçim edin' : 'Выберите способ добавления фото',
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'az' ? 'Kameradan' : 'Камера',
          onPress: () => pickCoverImageFromCamera(),
        },
        {
          text: language === 'az' ? 'Qalereya' : 'Галерея',
          onPress: () => pickCoverImageFromGallery(),
        },
      ],
    );
  };

  const pickProfileImageFromCamera = async () => {
    try {
      storeLogger.debug('📸 Requesting camera permissions for profile image...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'az' ? 'İcazə tələb olunur' : 'Требуется разрешение',
          language === 'az' ? 'Kamera istifadə etmək üçün icazə verin' : 'Предоставьте разрешение для использования камеры',
        );
        return;
      }

      storeLogger.debug('📸 Launching camera for profile image...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      storeLogger.debug('📸 Camera result:', result);
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        const asset = result.assets[0];

        // ✅ Check file size (max 5MB)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            language === 'az' ? 'Şəkil çox böyükdür' : 'Изображение слишком большое',
            language === 'az'
              ? 'Zəhmət olmasa 5MB-dan kiçik şəkil çəkin'
              : 'Пожалуйста, сделайте изображение меньше 5MB',
          );
          return;
        }

        storeLogger.debug('✅ Profile image selected:', asset.uri);
        setStoreData(prev => ({ ...prev, logo: asset.uri }));
        Alert.alert(
          language === 'az' ? 'Uğurlu!' : 'Успешно!',
          language === 'az' ? 'Profil şəkli əlavə edildi' : 'Изображение профиля добавлено',
        );
      }
    } catch (error) {
      storeLogger.error('❌ Camera error:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Şəkil çəkərkən xəta baş verdi' : 'Произошла ошибка при съемке',
      );
    }
  };

  const pickProfileImageFromGallery = async () => {
    try {
      storeLogger.debug('🖼️ Requesting media library permissions for profile image...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'az' ? 'İcazə tələb olunur' : 'Требуется разрешение',
          language === 'az' ? 'Qalereya daxil olmaq üçün icazə verin' : 'Предоставьте разрешение для доступа к галерее',
        );
        return;
      }

      storeLogger.debug('🖼️ Launching image library for profile image...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      storeLogger.debug('🖼️ Gallery result:', result);
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        const asset = result.assets[0];

        // ✅ Check file size (max 5MB)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            language === 'az' ? 'Şəkil çox böyükdür' : 'Изображение слишком большое',
            language === 'az'
              ? 'Zəhmət olmasa 5MB-dan kiçik şəkil seçin'
              : 'Пожалуйста, выберите изображение меньше 5MB',
          );
          return;
        }

        storeLogger.debug('✅ Profile image selected from gallery:', asset.uri);
        setStoreData(prev => ({ ...prev, logo: asset.uri }));
        Alert.alert(
          language === 'az' ? 'Uğurlu!' : 'Успешно!',
          language === 'az' ? 'Profil şəkli əlavə edildi' : 'Изображение профиля добавлено',
        );
      }
    } catch (error) {
      storeLogger.error('❌ Gallery error:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Qalereya açarkən xəta baş verdi' : 'Произошла ошибка при открытии галереи',
      );
    }
  };

  const pickCoverImageFromCamera = async () => {
    try {
      storeLogger.debug('📸 Requesting camera permissions for cover image...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'az' ? 'İcazə tələb olunur' : 'Требуется разрешение',
          language === 'az' ? 'Kamera istifadə etmək üçün icazə verin' : 'Предоставьте разрешение для использования камеры',
        );
        return;
      }

      storeLogger.debug('📸 Launching camera for cover image...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      storeLogger.debug('📸 Camera result for cover:', result);
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        const asset = result.assets[0];

        // ✅ Check file size (max 5MB)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            language === 'az' ? 'Şəkil çox böyükdür' : 'Изображение слишком большое',
            language === 'az'
              ? 'Zəhmət olmasa 5MB-dan kiçik şəkil çəkin'
              : 'Пожалуйста, сделайте изображение меньше 5MB',
          );
          return;
        }

        storeLogger.debug('✅ Cover image selected:', asset.uri);
        setStoreData(prev => ({ ...prev, coverImage: asset.uri }));
        Alert.alert(
          language === 'az' ? 'Uğurlu!' : 'Успешно!',
          language === 'az' ? 'Arxa fon şəkli əlavə edildi' : 'Фоновое изображение добавлено',
        );
      }
    } catch (error) {
      storeLogger.error('❌ Camera error for cover:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Şəkil çəkərkən xəta baş verdi' : 'Произошла ошибка при съемке',
      );
    }
  };

  const pickCoverImageFromGallery = async () => {
    try {
      storeLogger.debug('🖼️ Requesting media library permissions for cover image...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'az' ? 'İcazə tələb olunur' : 'Требуется разрешение',
          language === 'az' ? 'Qalereya daxil olmaq üçün icazə verin' : 'Предоставьте разрешение для доступа к галерее',
        );
        return;
      }

      storeLogger.debug('🖼️ Launching image library for cover image...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      storeLogger.debug('🖼️ Gallery result for cover:', result);
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        const asset = result.assets[0];

        // ✅ Check file size (max 5MB)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            language === 'az' ? 'Şəkil çox böyükdür' : 'Изображение слишком большое',
            language === 'az'
              ? 'Zəhmət olmasa 5MB-dan kiçik şəkil seçin'
              : 'Пожалуйста, выберите изображение меньше 5MB',
          );
          return;
        }

        storeLogger.debug('✅ Cover image selected from gallery:', asset.uri);
        setStoreData(prev => ({ ...prev, coverImage: asset.uri }));
        Alert.alert(
          language === 'az' ? 'Uğurlu!' : 'Успешно!',
          language === 'az' ? 'Arxa fon şəkli əlavə edildi' : 'Фоновое изображение добавлено',
        );
      }
    } catch (error) {
      storeLogger.error('❌ Gallery error for cover:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Qalereya açarkən xəta baş verdi' : 'Произошла ошибка при открытии галереи',
      );
    }
  };

  const renderStoreInfo = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>
        {language === 'az' ? 'Mağaza Məlumatları' : 'Информация о магазине'}
      </Text>

      {/* Store Images Section */}
      <Text style={styles.sectionTitle}>
        {language === 'az' ? 'Mağaza Şəkilləri' : 'Изображения магазина'}
      </Text>

      <View style={styles.imageUploadSection}>
        <View style={styles.imageUploadGroup}>
          <Text style={styles.inputLabel}>
            {language === 'az' ? 'Profil Şəkli' : 'Изображение профиля'}
          </Text>

          {storeData.logo ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: storeData.logo }} style={styles.profileImagePreview} />
              <View style={styles.imageActions}>
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={handleProfileImagePicker}
                >
                  <Camera size={16} color={Colors.primary} />
                  <Text style={styles.changeImageText}>
                    {language === 'az' ? 'Dəyişdir' : 'Изменить'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setStoreData(prev => ({ ...prev, logo: '' }))}
                >
                  <Text style={styles.removeImageText}>
                    {language === 'az' ? 'Sil' : 'Удалить'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.imageUploadButton}
              onPress={handleProfileImagePicker}
            >
              <Camera size={24} color={Colors.primary} />
              <Text style={styles.imageUploadText}>
                {language === 'az' ? 'Profil şəkli əlavə et' : 'Добавить изображение профиля'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.imageUploadGroup}>
          <Text style={styles.inputLabel}>
            {language === 'az' ? 'Arxa Fon Şəkli' : 'Фоновое изображение'}
          </Text>

          {storeData.coverImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: storeData.coverImage }} style={styles.coverImagePreview} />
              <View style={styles.imageActions}>
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={handleCoverImagePicker}
                >
                  <ImageIcon size={16} color={Colors.primary} />
                  <Text style={styles.changeImageText}>
                    {language === 'az' ? 'Dəyişdir' : 'Изменить'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setStoreData(prev => ({ ...prev, coverImage: '' }))}
                >
                  <Text style={styles.removeImageText}>
                    {language === 'az' ? 'Sil' : 'Удалить'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.imageUploadButton}
              onPress={handleCoverImagePicker}
            >
              <ImageIcon size={24} color={Colors.primary} />
              <Text style={styles.imageUploadText}>
                {language === 'az' ? 'Arxa fon şəkli əlavə et' : 'Добавить фоновое изображение'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        {language === 'az' ? 'Əsas Məlumatlar' : 'Основная информация'}
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {language === 'az' ? 'Mağaza Adı *' : 'Название магазина *'}
        </Text>
        <TextInput
          style={styles.input}
          value={storeData.name}
          onChangeText={(text) => {
            // ✅ Sanitize: max 50 chars, normalize spaces
            const sanitized = text.substring(0, 50).replace(/\s+/g, ' ');
            setStoreData(prev => ({ ...prev, name: sanitized }));
          }}
          placeholder={language === 'az' ? 'Mağaza adını daxil edin' : 'Введите название магазина'}
          placeholderTextColor={Colors.textSecondary}
          maxLength={50}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {language === 'az' ? 'Kateqoriya Adı *' : 'Название категории *'}
        </Text>
        <TextInput
          style={styles.input}
          value={storeData.categoryName}
          onChangeText={(text) => {
            // ✅ Sanitize: max 50 chars, normalize spaces
            const sanitized = text.substring(0, 50).replace(/\s+/g, ' ');
            setStoreData(prev => ({ ...prev, categoryName: sanitized }));
          }}
          placeholder={language === 'az' ? 'Kateqoriya adını daxil edin' : 'Введите название категории'}
          placeholderTextColor={Colors.textSecondary}
          maxLength={50}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {language === 'az' ? 'Ünvan' : 'Адрес'}
        </Text>
        <TextInput
          style={styles.input}
          value={storeData.address}
          onChangeText={(text) => setStoreData(prev => ({ ...prev, address: text }))}
          placeholder={language === 'az' ? 'Ünvanı daxil edin' : 'Введите адрес'}
          placeholderTextColor={Colors.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {language === 'az' ? 'Təsvir' : 'Описание'}
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={storeData.description}
          onChangeText={(text) => {
            // ✅ Max 500 characters
            if (text.length <= 500) {
              setStoreData(prev => ({ ...prev, description: text }));
            }
          }}
          placeholder={language === 'az' ? 'Mağaza haqqında məlumat (maks 500 simvol)' : 'Информация о магазине (макс 500 символов)'}
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        <Text style={styles.charCount}>
          {storeData.description.length}/500
        </Text>
      </View>

      <Text style={styles.sectionTitle}>
        {language === 'az' ? 'Əlaqə Məlumatları' : 'Контактная информация'}
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {language === 'az' ? 'Telefon' : 'Телефон'}
        </Text>
        <TextInput
          style={styles.input}
          value={storeData.contactInfo.phone}
          onChangeText={(text) => {
            // ✅ Sanitize: only numbers, +, and spaces
            const sanitized = text.replace(/[^0-9+\s]/g, '');
            setStoreData(prev => ({
              ...prev,
              contactInfo: { ...prev.contactInfo, phone: sanitized },
            }));
          }}
          placeholder="+994 XX XXX XX XX"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={storeData.contactInfo.email}
          onChangeText={(text) => setStoreData(prev => ({
            ...prev,
            contactInfo: { ...prev.contactInfo, email: text },
          }))}
          placeholder="example@email.com"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>WhatsApp</Text>
        <TextInput
          style={styles.input}
          value={storeData.contactInfo.whatsapp}
          onChangeText={(text) => {
            // ✅ Sanitize: only numbers, +, and spaces
            const sanitized = text.replace(/[^0-9+\s]/g, '');
            setStoreData(prev => ({
              ...prev,
              contactInfo: { ...prev.contactInfo, whatsapp: sanitized },
            }));
          }}
          placeholder="+994 XX XXX XX XX"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {language === 'az' ? 'Veb sayt' : 'Веб-сайт'}
        </Text>
        <TextInput
          style={styles.input}
          value={storeData.contactInfo.website}
          onChangeText={(text) => setStoreData(prev => ({
            ...prev,
            contactInfo: { ...prev.contactInfo, website: text },
          }))}
          placeholder="https://example.com"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="url"
        />
      </View>
    </View>
  );

  const renderPaymentSelection = () => {
    const { mobile, digital, bank } = {
      mobile: paymentMethods.filter(method => method.category === 'mobile'),
      digital: paymentMethods.filter(method => method.category === 'digital'),
      bank: paymentMethods.filter(method => method.category === 'bank'),
    };

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>
          {language === 'az' ? 'Ödəniş Üsulu' : 'Способ оплаты'}
        </Text>

        <Text style={styles.sectionTitle}>
          {language === 'az' ? 'Mobil Operatorlar' : 'Мобильные операторы'}
        </Text>
        {mobile.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentMethod,
              selectedPayment === method.id && styles.paymentMethodSelected,
            ]}
            onPress={() => setSelectedPayment(method.id)}
          >
            <Text style={styles.paymentIcon}>{method.icon}</Text>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentName}>{method.name}</Text>
              <Text style={styles.paymentDescription}>{method.description}</Text>
            </View>
            {selectedPayment === method.id && (
              <Check size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>
          {language === 'az' ? 'Rəqəmsal Ödəniş' : 'Цифровые платежи'}
        </Text>
        {digital.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentMethod,
              selectedPayment === method.id && styles.paymentMethodSelected,
            ]}
            onPress={() => setSelectedPayment(method.id)}
          >
            <Text style={styles.paymentIcon}>{method.icon}</Text>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentName}>{method.name}</Text>
              <Text style={styles.paymentDescription}>{method.description}</Text>
            </View>
            {selectedPayment === method.id && (
              <Check size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>
          {language === 'az' ? 'Bank Kartları' : 'Банковские карты'}
        </Text>
        {bank.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentMethod,
              selectedPayment === method.id && styles.paymentMethodSelected,
            ]}
            onPress={() => setSelectedPayment(method.id)}
          >
            <Text style={styles.paymentIcon}>{method.icon}</Text>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentName}>{method.name}</Text>
              <Text style={styles.paymentDescription}>{method.description}</Text>
            </View>
            {selectedPayment === method.id && (
              <Check size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderConfirmation = () => {
    const selectedPlanData = plans.find(p => p.id === selectedPlan);
    const selectedPaymentData = paymentMethods.find(p => p.id === selectedPayment);

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>
          {language === 'az' ? 'Təsdiq' : 'Подтверждение'}
        </Text>

        <View style={styles.confirmationCard}>
          <Text style={styles.confirmationTitle}>
            {language === 'az' ? 'Mağaza Məlumatları' : 'Информация о магазине'}
          </Text>
          <Text style={styles.confirmationItem}>
            <Text style={styles.confirmationLabel}>
              {language === 'az' ? 'Ad: ' : 'Название: '}
            </Text>
            {storeData.name}
          </Text>
          <Text style={styles.confirmationItem}>
            <Text style={styles.confirmationLabel}>
              {language === 'az' ? 'Kateqoriya: ' : 'Категория: '}
            </Text>
            {storeData.categoryName}
          </Text>
          {storeData.address && (
            <Text style={styles.confirmationItem}>
              <Text style={styles.confirmationLabel}>
                {language === 'az' ? 'Ünvan: ' : 'Адрес: '}
              </Text>
              {storeData.address}
            </Text>
          )}
          {storeData.logo && (
            <Text style={styles.confirmationItem}>
              <Text style={styles.confirmationLabel}>
                {language === 'az' ? 'Profil şəkli: ' : 'Изображение профиля: '}
              </Text>
              {language === 'az' ? 'Əlavə edildi' : 'Добавлено'}
            </Text>
          )}
          {storeData.coverImage && (
            <Text style={styles.confirmationItem}>
              <Text style={styles.confirmationLabel}>
                {language === 'az' ? 'Arxa fon şəkli: ' : 'Фоновое изображение: '}
              </Text>
              {language === 'az' ? 'Əlavə edildi' : 'Добавлено'}
            </Text>
          )}
        </View>

        <View style={styles.confirmationCard}>
          <Text style={styles.confirmationTitle}>
            {language === 'az' ? 'Seçilmiş Paket' : 'Выбранный пакет'}
          </Text>
          <Text style={styles.confirmationItem}>
            <Text style={styles.confirmationLabel}>
              {language === 'az' ? 'Paket: ' : 'Пакет: '}
            </Text>
            {selectedPlanData?.name[language as keyof typeof selectedPlanData.name]}
          </Text>
          <Text style={styles.confirmationItem}>
            <Text style={styles.confirmationLabel}>
              {language === 'az' ? 'Qiymət: ' : 'Цена: '}
            </Text>
            {getPlanPrice(selectedPlan)} AZN
            {!isFirstStore && (
              <Text style={styles.discountText}>
                {' '}({language === 'az' ? '25% endirim tətbiq edildi' : 'применена скидка 25%'})
              </Text>
            )}
          </Text>
          <Text style={styles.confirmationItem}>
            <Text style={styles.confirmationLabel}>
              {language === 'az' ? 'Elan sayı: ' : 'Количество объявлений: '}
            </Text>
            {selectedPlanData?.maxAds}
          </Text>
          <Text style={styles.confirmationItem}>
            <Text style={styles.confirmationLabel}>
              {language === 'az' ? 'Mağaza növü: ' : 'Тип магазина: '}
            </Text>
            {isFirstStore
              ? (language === 'az' ? 'İlk mağaza' : 'Первый магазин')
              : (language === 'az' ? 'Əlavə mağaza' : 'Дополнительный магазин')
            }
          </Text>
        </View>

        <View style={styles.confirmationCard}>
          <Text style={styles.confirmationTitle}>
            {language === 'az' ? 'Ödəniş Üsulu' : 'Способ оплаты'}
          </Text>
          <Text style={styles.confirmationItem}>
            {selectedPaymentData?.name}
          </Text>
        </View>
      </View>
    );
  };

  const renderMyStoreSection = () => {
    if (!userStore) return null;

    return (
      <View style={styles.myStoreSection}>
        <Text style={styles.myStoreTitle}>
          {language === 'az' ? 'Mənim Mağazam' : 'Мой магазин'}
        </Text>
        <TouchableOpacity
          style={styles.myStoreCard}
          onPress={() => router.push(`/store/${userStore.id}`)}
        >
          <View style={styles.myStoreHeader}>
            <Building2 size={24} color={Colors.primary} />
            <View style={styles.myStoreInfo}>
              <Text style={styles.myStoreName}>{userStore.name}</Text>
              <Text style={styles.myStoreCategory}>{userStore.categoryName}</Text>
            </View>
          </View>
          <View style={styles.myStoreStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStore.adsUsed}</Text>
              <Text style={styles.statLabel}>
                {language === 'az' ? 'İstifadə edilmiş' : 'Использовано'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStore.maxAds - userStore.adsUsed}</Text>
              <Text style={styles.statLabel}>
                {language === 'az' ? 'Qalan' : 'Осталось'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStore.followers.length}</Text>
              <Text style={styles.statLabel}>
                {language === 'az' ? 'İzləyici' : 'Подписчики'}
              </Text>
            </View>
          </View>
          <View style={styles.myStoreActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/store/add-listing/${userStore.id}`)}
            >
              <Text style={styles.actionButtonText}>
                {language === 'az' ? 'Elan Əlavə Et' : 'Добавить объявление'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => router.push(`/store/promote/${userStore.id}`)}
            >
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                {language === 'az' ? 'Təşviq Et' : 'Продвигать'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Store Settings Section */}
        <View style={styles.storeSettingsSection}>
          <Text style={styles.settingsSectionTitle}>
            {language === 'az' ? 'Mağaza Tənzimləmələri' : 'Настройки магазина'}
          </Text>


          {/* Analytics */}
          <View style={styles.settingsGroup}>
            <Text style={styles.settingsGroupTitle}>
              {language === 'az' ? 'Analitika və Hesabatlar' : 'Аналитика и отчеты'}
            </Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/store-analytics')}
            >
              <View style={styles.settingIcon}>
                <Settings size={20} color={Colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>
                  {language === 'az' ? 'Mağaza Analitikası' : 'Аналитика магазина'}
                </Text>
                <Text style={styles.settingSubtitle}>
                  {language === 'az' ? 'Satış və ziyarətçi statistikaları' : 'Статистика продаж и посетителей'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Reviews */}
          <View style={styles.settingsGroup}>
            <Text style={styles.settingsGroupTitle}>
              {language === 'az' ? 'Reytinq və Rəylər' : 'Рейтинг и отзывы'}
            </Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/store-reviews')}
            >
              <View style={styles.settingIcon}>
                <Settings size={20} color={Colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>
                  {language === 'az' ? 'Rəyləri İdarə Et' : 'Управление отзывами'}
                </Text>
                <Text style={styles.settingSubtitle}>
                  {language === 'az' ? 'Müştəri rəylərini cavabla' : 'Отвечайте на отзывы клиентов'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Payment */}
          <View style={styles.settingsGroup}>
            <Text style={styles.settingsGroupTitle}>
              {language === 'az' ? 'Abunəlik və Ödəniş' : 'Подписка и оплата'}
            </Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/payment-history')}
            >
              <View style={styles.settingIcon}>
                <Settings size={20} color={Colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>
                  {language === 'az' ? 'Ödəniş Tarixçəsi' : 'История платежей'}
                </Text>
                <Text style={styles.settingSubtitle}>
                  {language === 'az' ? 'Keçmiş ödənişləri görün' : 'Просмотр прошлых платежей'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Dangerous Actions */}
          <View style={styles.settingsGroup}>
            <Text style={styles.settingsGroupTitle}>
              {language === 'az' ? 'Təhlükəli Əməliyyatlar' : 'Опасные операции'}
            </Text>

            <TouchableOpacity
              style={styles.deleteStoreButton}
              onPress={handleDeleteStore}
            >
              <Trash2 size={16} color="#ff4444" />
              <Text style={styles.deleteStoreButtonText}>
                {language === 'az' ? 'Mağazanı Sil' : 'Удалить магазин'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.createStoreButtonContainer}>
          <TouchableOpacity
            style={styles.createNewStoreButton}
            onPress={() => setCurrentStep(1)}
          >
            <Text style={styles.createNewStoreButtonText}>
              {language === 'az' ? 'Yeni Mağaza Yarat' : 'Создать новый магазин'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/store-settings')}
            style={styles.settingsButton}
          >
            <Settings size={20} color={Colors.primary} />
            <Text style={styles.settingsButtonText}>
              {language === 'az' ? 'Tənzimləmələr' : 'Настройки'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {language === 'az' ? 'Mağaza yarat' : 'Создать магазин'}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {currentStep > 0 && renderStepIndicator()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 0 && renderMyStoreSection()}
        {currentStep === 1 && renderPlanSelection()}
        {currentStep === 2 && renderStoreInfo()}
        {currentStep === 3 && renderConfirmation()}
      </ScrollView>

      {currentStep > 0 && (
        <View style={styles.footer}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.backStepButton}
              onPress={() => setCurrentStep(prev => prev - 1)}
            >
              <Text style={styles.backStepButtonText}>
                {language === 'az' ? 'Geri' : 'Назад'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              (currentStep === 1 && !selectedPlan) && styles.nextButtonDisabled,
            ]}
            onPress={() => {
              storeLogger.debug('Next/Create button pressed, currentStep:', currentStep);
              storeLogger.debug('selectedPlan:', selectedPlan, 'selectedPayment:', selectedPayment);

              // CRITICAL: Only create store on final step (step 3)
              if (currentStep === 3) {
                storeLogger.debug('🔥 FINAL STEP: Creating store');
                handleCreateStore();
              } else {
                storeLogger.debug('📝 NAVIGATION: Moving to next step');
                handleNext();
              }
            }}
            disabled={currentStep === 1 && !selectedPlan}
          >
            <Text style={[
              styles.nextButtonText,
              (currentStep === 1 && !selectedPlan) && styles.nextButtonTextDisabled,
            ]}>
              {currentStep === 3
                ? (language === 'az' ? 'Mağaza Yarat' : 'Создать магазин')
                : (language === 'az' ? 'Növbəti' : 'Далее')
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: Colors.card,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  stepNumberActive: {
    color: 'white',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: Colors.primary,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  planAds: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  planFeatures: {
    gap: 4,
  },
  planFeature: {
    fontSize: 14,
    color: Colors.text,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 24,
    marginBottom: 16,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentMethodSelected: {
    borderColor: Colors.primary,
  },
  paymentIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  paymentDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  confirmationCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  confirmationItem: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  confirmationLabel: {
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  backStepButton: {
    flex: 1,
    backgroundColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backStepButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  nextButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  nextButtonDisabled: {
    backgroundColor: Colors.border,
    opacity: 0.6,
  },
  nextButtonTextDisabled: {
    color: Colors.textSecondary,
  },
  myStoreSection: {
    padding: 16,
  },
  myStoreTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  myStoreCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  myStoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  myStoreInfo: {
    marginLeft: 12,
    flex: 1,
  },
  myStoreName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  myStoreCategory: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  myStoreStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  myStoreActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    color: Colors.primary,
  },
  createStoreButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  createNewStoreButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createNewStoreButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  storeManagementActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  settingsHeaderButton: {
    padding: 6,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    borderRadius: 6,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 6,
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  deleteStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  deleteStoreButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ff4444',
  },
  storeSettingsSection: {
    marginTop: 20,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  settingsGroup: {
    marginBottom: 20,
  },
  settingsGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.background,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  settingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  discountText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '500',
  },
  charCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  warningCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  selectedPackageInfo: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  selectedPackageText: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '500',
  },
  selectedPackageName: {
    fontSize: 16,
    color: '#155724',
    fontWeight: 'bold',
    marginTop: 4,
  },
  imageUploadSection: {
    marginBottom: 24,
  },
  imageUploadGroup: {
    marginBottom: 16,
  },
  imageUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    gap: 12,
  },
  imageUploadText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  removeImageButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  removeImageText: {
    fontSize: 14,
    color: '#ff4444',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    marginBottom: 12,
  },
  profileImagePreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.border,
    marginBottom: 8,
  },
  coverImagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: Colors.border,
    marginBottom: 8,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 12,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  changeImageText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
});

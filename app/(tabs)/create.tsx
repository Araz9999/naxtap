import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform, KeyboardAvoidingView, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from '@/constants/translations';
import { useUserStore } from '@/store/userStore';
import { useStoreStore } from '@/store/storeStore';
import { useListingStore } from '@/store/listingStore';
import { categories } from '@/constants/categories';
import { locations } from '@/constants/locations';
import { adPackages } from '@/constants/adPackages';
import Colors from '@/constants/colors';
import { Listing } from '@/types/listing';
import { Category, Subcategory } from '@/types/category';
import { Camera, ChevronDown, Plus, Check, Clock, Award, Image as ImageIcon, MapPin, Info, AlertCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { sanitizeNumericInput } from '@/utils/inputValidation';

import { logger } from '@/utils/logger';
export default function CreateListingScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { isAuthenticated, currentUser, canAfford, spendFromBalance, getTotalBalance, hasHydrated } = useUserStore();
  const { getAllUserStores, canAddListing } = useStoreStore();
  const { addListingToStore } = useListingStore();

  // All useState hooks must be at the top level
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState<number | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [contactPreference, setContactPreference] = useState<'phone' | 'message' | 'both'>('both');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [locationSearchQuery, setLocationSearchQuery] = useState('');

  // Category navigation state
  const [categoryNavigationStack, setCategoryNavigationStack] = useState<(Category | Subcategory)[]>([]);
  const [currentCategoryLevel, setCurrentCategoryLevel] = useState<'main' | 'sub' | 'subsub'>('main');

  // New states for ad package selection
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState(adPackages[0].id);
  const [condition, setCondition] = useState<'new' | 'used' | null>(null);
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [deliveryType, setDeliveryType] = useState<string | null>(null);
  const [showDeliveryTypes, setShowDeliveryTypes] = useState(false);
  const [priceByAgreement, setPriceByAgreement] = useState(false);
  const [currency, setCurrency] = useState('AZN');
  const [addToStore, setAddToStore] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [showStoreModal, setShowStoreModal] = useState(false);

  // Check authentication after hooks
  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <View style={styles.authRequiredContainer}>
        <View style={styles.authRequiredContent}>
          <AlertCircle size={64} color={Colors.primary} style={styles.authRequiredIcon} />
          <Text style={styles.authRequiredTitle}>
            {t('accountRequired')}
          </Text>
          <Text style={styles.authRequiredDescription}>
            {t('loginToPostAd')}
          </Text>
          <View style={styles.authRequiredButtons}>
            <TouchableOpacity
              style={styles.authRequiredButton}
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.authRequiredButtonText}>
                {t('login')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authRequiredButton, styles.authRequiredSecondaryButton]}
              onPress={() => router.push('/auth/register')}
            >
              <Text style={[styles.authRequiredButtonText, styles.authRequiredSecondaryButtonText]}>
                {t('register')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const userStores = currentUser ? getAllUserStores(currentUser.id) : [];
  const activeUserStores = userStores.filter(store => store.status === 'active' || store.status === 'grace_period');

  const selectedStore = selectedStoreId ? activeUserStores.find(s => s.id === selectedStoreId) : null;
  const canAddToSelectedStore = selectedStore ? canAddListing(selectedStore.id) : false;

  const selectedCategoryData = categories.find(c => c.id === selectedCategory);
  const selectedPackageData = adPackages.find(p => p.id === selectedPackage);
  const selectedLocationData = locations.find(l => l.id === selectedLocation);

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            language === 'az' ? 'İcazə tələb olunur' : 'Требуется разрешение',
            language === 'az'
              ? 'Qalereya daxil olmaq üçün icazə lazımdır'
              : 'Для доступа к галерее требуется разрешение',
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      // ✅ Validate assets array and file size
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        const asset = result.assets[0];

        // ✅ Check image limit
        if (images.length >= (selectedPackageData?.features.photosCount || 3)) {
          Alert.alert(
            language === 'az' ? 'Limit aşıldı' : 'Лимит превышен',
            language === 'az'
              ? `Seçdiyiniz paket maksimum ${selectedPackageData?.features.photosCount} şəkil əlavə etməyə imkan verir`
              : `Выбранный пакет позволяет добавить максимум ${selectedPackageData?.features.photosCount} изображений`,
          );
          return;
        }

        // ✅ Validate file size (max 10MB)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert(
            language === 'az' ? 'Şəkil çox böyükdür' : 'Изображение слишком большое',
            language === 'az'
              ? 'Maksimum 10MB ölçüsündə şəkil əlavə edin'
              : 'Добавьте изображение размером до 10MB',
          );
          return;
        }

        setImages([...images, asset.uri]);
        logger.info('Image added from gallery', { fileSize: asset.fileSize });
      }
    } catch (error) {
      logger.error('Gallery error:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Şəkil seçilə bilmədi' : 'Не удалось выбрать изображение',
      );
    }
  };

  const takePicture = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az'
            ? 'Kamera ilə şəkil çəkmək veb versiyada mövcud deyil'
            : 'Съемка камерой недоступна в веб-версии',
        );
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'az' ? 'İcazə tələb olunur' : 'Требуется разрешение',
          language === 'az'
            ? 'Kameradan istifadə etmək üçün icazə lazımdır'
            : 'Для использования камеры требуется разрешение',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      // ✅ Validate assets array and file size
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        const asset = result.assets[0];

        // ✅ Check file size (max 10MB - same as gallery for consistency)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert(
            language === 'az' ? 'Şəkil çox böyükdür' : 'Изображение слишком большое',
            language === 'az'
              ? 'Maksimum 10MB ölçüsündə şəkil əlavə edin'
              : 'Добавьте изображение размером до 10MB',
          );
          return;
        }

        if (images.length >= (selectedPackageData?.features.photosCount || 3)) {
          Alert.alert(
            language === 'az' ? 'Limit aşıldı' : 'Лимит превышен',
            language === 'az'
              ? `Seçdiyiniz paket maksimum ${selectedPackageData?.features.photosCount} şəkil əlavə etməyə imkan verir`
              : `Выбранный пакет позволяет добавить максимум ${selectedPackageData?.features.photosCount} изображений`,
          );
          return;
        }
        setImages([...images, asset.uri]);
      }
    } catch (error) {
      logger.error('Camera error:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Şəkil çəkilə bilmədi' : 'Не удалось сделать фото',
      );
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validation: Title
      if (!title.trim()) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Elan başlığını daxil edin' : 'Введите заголовок объявления',
        );
        return;
      }

      if (title.trim().length < 5) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Başlıq ən azı 5 simvol olmalıdır' : 'Заголовок должен быть не менее 5 символов',
        );
        return;
      }

      if (title.trim().length > 100) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Başlıq maksimum 100 simvol ola bilər' : 'Заголовок не должен превышать 100 символов',
        );
        return;
      }

      // Validation: Description
      if (!description.trim()) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Təsvir daxil edin' : 'Введите описание',
        );
        return;
      }

      if (description.trim().length < 10) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Təsvir ən azı 10 simvol olmalıdır' : 'Описание должно быть не менее 10 символов',
        );
        return;
      }

      // Validation: Price (if not by agreement)
      if (!priceByAgreement) {
        if (!price.trim()) {
          Alert.alert(
            language === 'az' ? 'Xəta' : 'Ошибка',
            language === 'az' ? 'Qiymət daxil edin' : 'Введите цену',
          );
          return;
        }

        const priceValue = parseFloat(price);
        if (isNaN(priceValue) || priceValue <= 0) {
          Alert.alert(
            language === 'az' ? 'Xəta' : 'Ошибка',
            language === 'az' ? 'Düzgün qiymət daxil edin' : 'Введите корректную цену',
          );
          return;
        }

        if (priceValue > 1000000) {
          Alert.alert(
            language === 'az' ? 'Xəta' : 'Ошибка',
            language === 'az' ? 'Qiymət maksimum 1,000,000 ola bilər' : 'Цена не должна превышать 1,000,000',
          );
          return;
        }
      }

      // Validation: Location
      if (!selectedLocation) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Yerləşdiyiniz yeri seçin' : 'Выберите местоположение',
        );
        return;
      }

      // Validation: Category
      if (!selectedCategory) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Kateqoriya seçin' : 'Выберите категорию',
        );
        return;
      }

      // Validation: Subcategory (yalnız əgər seçilmiş kateqoriyanın alt kateqoriyası varsa)
      const selectedCategoryData = categories.find(c => c.id === selectedCategory);
      if (selectedCategoryData?.subcategories && selectedCategoryData.subcategories.length > 0 && !selectedSubcategory) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Alt kateqoriya seçin' : 'Выберите подкатегорию',
        );
        return;
      }

      // Validation: SubSubcategory
      if (selectedCategory && selectedSubcategory) {
        const subData = selectedCategoryData?.subcategories.find(s => s.id === selectedSubcategory);
        if (subData?.subcategories && subData.subcategories.length > 0 && !selectedSubSubcategory) {
          Alert.alert(
            language === 'az' ? 'Xəta' : 'Ошибка',
            language === 'az' ? 'Daha alt kateqoriya seçin' : 'Выберите подподкатегорию',
          );
          return;
        }
      }

      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Check if adding to store with available slots (no payment required)
      const isStoreListingWithSlots = addToStore && selectedStore && canAddToSelectedStore;

      if (!isStoreListingWithSlots && selectedPackage !== 'free' && !canAfford(selectedPackageData?.price || 0)) {
        Alert.alert(
          language === 'az' ? 'Balans kifayət etmir' : 'Недостаточно средств',
          language === 'az'
            ? 'Elan yerləşdirmək üçün balansınızı artırın'
            : 'Пополните баланс для размещения объявления',
          [
            {
              text: language === 'az' ? 'Ləğv et' : 'Отмена',
              style: 'cancel',
            },
            {
              text: language === 'az' ? 'Balans artır' : 'Пополнить баланс',
              onPress: () => router.push('/wallet'),
            },
          ],
        );
        return;
      }

      // Show confirmation alert before posting the listing
      Alert.alert(
        language === 'az' ? 'Elanı yerləşdir' : 'Разместить объявление',
        language === 'az'
          ? 'Elanınızı yerləşdirmək istədiyinizə əminsiniz?'
          : 'Вы уверены, что хотите разместить объявление?',
        [
          {
            text: language === 'az' ? 'Ləğv et' : 'Отмена',
            style: 'cancel',
          },
          {
            text: language === 'az' ? 'Bəli, yerləşdir' : 'Да, разместить',
            onPress: () => handleSubmit(),
          },
        ],
      );
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Check if adding to store with available slots (no payment required)
    const isStoreListingWithSlots = addToStore && selectedStore && canAddToSelectedStore;

    // Check free ad limit for non-store listings only
    if (selectedPackage === 'free' && !isStoreListingWithSlots) {
      const { canPostFreeAd, incrementFreeAds } = useUserStore.getState();
      if (!canPostFreeAd()) {
        Alert.alert(
          language === 'az' ? 'Limit aşıldı' : 'Лимит превышен',
          language === 'az'
            ? 'Ay ərzində maksimum 3 pulsuz elan yerləşdirə bilərsiniz'
            : 'Вы можете размещать максимум 3 бесплатных объявления в месяц',
        );
        return;
      }
      incrementFreeAds();
    }

    // Check store limit if adding to store
    if (addToStore && selectedStore && !canAddToSelectedStore) {
      Alert.alert(
        language === 'az' ? 'Mağaza limiti dolub' : 'Лимит магазина исчерпан',
        language === 'az'
          ? 'Mağazanızda daha çox elan yerləşdirmək üçün paketi yüksəldin'
          : 'Для размещения большего количества объявлений в магазине улучшите пакет',
      );
      return;
    }

    // Show confirmation alert for paid listings
    if (!isStoreListingWithSlots && selectedPackage !== 'free') {
      const packagePrice = selectedPackageData?.price || 0;
      Alert.alert(
        language === 'az' ? 'Elan yerləşdirməni təsdiq edin' : 'Подтвердите размещение объявления',
        language === 'az'
          ? `${selectedPackageData?.name[language]} paketi ilə elan yerləşdirmək üçün ${packagePrice} AZN ödəniş ediləcək. Davam etmək istədiyinizə əminsiniz?`
          : `Для размещения объявления с пакетом ${selectedPackageData?.name[language]} будет списано ${packagePrice} AZN. Вы уверены, что хотите продолжить?`,
        [
          {
            text: language === 'az' ? 'Ləğv et' : 'Отмена',
            style: 'cancel',
          },
          {
            text: language === 'az' ? 'Təsdiq et' : 'Подтвердить',
            onPress: () => processListingSubmission(),
          },
        ],
      );
      return;
    }

    // For free listings or store listings with slots, proceed directly
    processListingSubmission();
  };

  const processListingSubmission = async () => {
    const isStoreListingWithSlots = addToStore && selectedStore && canAddToSelectedStore;

    try {
      // ✅ Process payment only if not adding to store with available slots
      if (!isStoreListingWithSlots && selectedPackage !== 'free') {
        const packagePrice = selectedPackageData?.price || 0;

        // ✅ Check if can afford first
        if (!canAfford(packagePrice)) {
          Alert.alert(
            language === 'az' ? 'Balans kifayət etmir' : 'Недостаточно средств',
            language === 'az'
              ? 'Balansınızı artırın'
              : 'Пополните баланс',
            [
              {
                text: language === 'az' ? 'Ləğv et' : 'Отмена',
                style: 'cancel',
              },
              {
                text: language === 'az' ? 'Balans artır' : 'Пополнить баланс',
                onPress: () => router.push('/wallet'),
              },
            ],
          );
          return;
        }

        // ✅ Actually spend and check success
        const paymentSuccess = spendFromBalance(packagePrice);
        if (!paymentSuccess) {
          Alert.alert(
            language === 'az' ? 'Ödəniş xətası' : 'Ошибка оплаты',
            language === 'az'
              ? 'Balansınızdan ödəniş çıxıla bilmədi. Yenidən cəhd edin.'
              : 'Не удалось списать средства с баланса. Попробуйте еще раз.',
          );
          return;
        }

        logger.info('Payment successful for listing', { packagePrice, package: selectedPackage });
      }

      // ✅ Calculate expiration date with validation
      const now = new Date();
      const duration = Math.max(1, Math.min(365, selectedPackageData?.duration || 3)); // 1-365 days
      const expirationDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

      // ✅ Validate result
      if (isNaN(expirationDate.getTime())) {
        logger.error('Invalid expiration date calculated, using fallback');
        expirationDate.setTime(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      }

      // Create the listing object
      const newListing: Listing = {
        id: Date.now().toString(),
        title: {
          az: title,
          ru: title,
          en: title,
        },
        description: {
          az: description,
          ru: description,
          en: description,
        },
        price: priceByAgreement ? 0 : (parseFloat(price) || 0),
        currency: currency as 'AZN' | 'USD',
        priceByAgreement,
        images,
        categoryId: selectedCategory!,
        subcategoryId: selectedSubcategory || 0,
        subSubcategoryId: selectedSubSubcategory || undefined,
        location: {
          az: selectedLocationData?.name.az || '',
          ru: selectedLocationData?.name.ru || '',
          en: selectedLocationData?.name.en || '',
        },
        userId: currentUser.id,
        createdAt: new Date().toISOString(),
        expiresAt: expirationDate.toISOString(),
        views: 0,
        favorites: 0,
        isFeatured: selectedPackageData?.features.featured || false,
        isPremium: selectedPackageData?.features.priorityPlacement || false,
        isVip: selectedPackage === 'vip',
        adType: selectedPackage as 'free' | 'standard' | 'colored' | 'auto-renewal' | 'premium' | 'vip',
        contactPreference,
      };

      // Add to store if selected, otherwise add normally
      if (addToStore && selectedStore) {
        await addListingToStore(newListing, selectedStore.id);
      } else {
        await addListingToStore(newListing);
      }

      Alert.alert(
        language === 'az' ? 'Uğurlu' : 'Успешно',
        language === 'az'
          ? (isStoreListingWithSlots
            ? 'Elan mağazanıza pulsuz əlavə edildi'
            : addToStore
              ? 'Elan mağazanıza uğurla əlavə edildi'
              : 'Elanınız uğurla yerləşdirildi')
          : (isStoreListingWithSlots
            ? 'Объявление бесплатно добавлено в ваш магазин'
            : addToStore
              ? 'Объявление успешно добавлено в ваш магазин'
              : 'Ваше объявление успешно размещено'),
        [
          {
            text: 'OK',
            onPress: () => router.push('/'),
          },
        ],
      );
    } catch {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az'
          ? 'Elan yerləşdirilərkən xəta baş verdi'
          : 'Произошла ошибка при размещении объявления',
      );
    }
  };

  const filteredCategories = categorySearchQuery
    ? categories.filter(category =>
      category.name[language].toLowerCase().includes(categorySearchQuery.toLowerCase()),
    )
    : categories;

  const renderStoreModal = () => {
    return (
      <Modal
        visible={showStoreModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStoreModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'az' ? 'Mağaza seçin' : 'Выберите магазин'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowStoreModal(false)}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={activeUserStores}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const canAdd = canAddListing(item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      !canAdd && styles.disabledModalItem,
                    ]}
                    onPress={() => {
                      if (canAdd) {
                        setSelectedStoreId(item.id);
                        setShowStoreModal(false);
                      }
                    }}
                    disabled={!canAdd}
                  >
                    <View style={styles.storeModalItemContent}>
                      <Text style={[
                        styles.modalItemText,
                        !canAdd && styles.disabledModalItemText,
                      ]}>
                        {item.name}
                      </Text>
                      <Text style={styles.storeModalItemSubtext}>
                        {language === 'az'
                          ? `${item.adsUsed}/${item.maxAds} elan istifadə edilib`
                          : `${item.adsUsed}/${item.maxAds} объявлений использовано`}
                      </Text>
                      {!canAdd && (
                        <Text style={styles.storeModalItemWarning}>
                          {language === 'az' ? 'Limit dolub' : 'Лимит исчерпан'}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    );
  };

  // Category navigation functions
  const handleCategoryPress = (category: Category | Subcategory) => {
    logger.info('[CategoryPress] Level:', currentCategoryLevel, 'Category:', category.name, 'Has subcategories:', !!category.subcategories, 'Count:', category.subcategories?.length || 0);

    if (currentCategoryLevel === 'main') {
      // Əsas kateqoriya seçimi
      setSelectedCategory(category.id);
      setSelectedSubcategory(null);
      setSelectedSubSubcategory(null);
      if (category.subcategories && category.subcategories.length > 0) {
        // Alt kateqoriyalar var, naviqasiyanı davam etdir
        logger.info('[CategoryPress] Moving to sub level with', category.subcategories.length, 'subcategories');
        setCategoryNavigationStack([category as Category]);
        setCurrentCategoryLevel('sub');
      } else {
        // Alt kateqoriya yoxdur, modal-ı bağla
        logger.info('[CategoryPress] No subcategories, closing modal');
        setShowCategoryModal(false);
      }
    } else if (currentCategoryLevel === 'sub') {
      // Alt kateqoriya seçimi
      setSelectedSubcategory(category.id);
      setSelectedSubSubcategory(null);
      if (category.subcategories && category.subcategories.length > 0) {
        // Daha alt kateqoriyalar var, naviqasiyanı davam etdir
        logger.info('[CategoryPress] Moving to subsub level with', category.subcategories.length, 'subcategories');
        setCategoryNavigationStack([...categoryNavigationStack, category as Subcategory]);
        setCurrentCategoryLevel('subsub');
      } else {
        // Daha alt kateqoriya yoxdur, modal-ı bağla
        logger.info('[CategoryPress] No more subcategories, closing modal');
        setShowCategoryModal(false);
      }
    } else if (currentCategoryLevel === 'subsub') {
      // Daha alt kateqoriya seçimi (3-cü səviyyə)
      logger.info('[CategoryPress] Selecting final subcategory');
      setSelectedSubSubcategory(category.id);
      setShowCategoryModal(false);
    }
  };

  const handleCategoryBack = () => {
    if (currentCategoryLevel === 'subsub') {
      // Geri dön alt kateqoriyaya
      setCurrentCategoryLevel('sub');
      setCategoryNavigationStack(categoryNavigationStack.slice(0, -1));
      // SubSubcategory-ni reset et, amma subcategory qalsın
      setSelectedSubSubcategory(null);
    } else if (currentCategoryLevel === 'sub') {
      // Geri dön əsas kateqoriyaya
      setCurrentCategoryLevel('main');
      setCategoryNavigationStack([]);
      // Subcategory reset et, amma main category qalsın
      setSelectedSubcategory(null);
      setSelectedSubSubcategory(null);
      // Main category-ni SAXLA (reset etmə!)
      // setSelectedCategory(null); // BU XƏTA IDI!
    }
  };

  const renderCategoryModal = () => {
    let currentCategories: Array<Category | Subcategory> = [];
    let title = language === 'az' ? 'Kateqoriya seçin' : 'Выберите категорию';

    if (currentCategoryLevel === 'main') {
      currentCategories = filteredCategories;
      title = language === 'az' ? 'Kateqoriya seçin' : 'Выберите категорию';
    } else if (currentCategoryLevel === 'sub') {
      const parentCategory = categoryNavigationStack[0];
      currentCategories = parentCategory?.subcategories || [];
      title = parentCategory?.name[language] || '';
      logger.info('[CategoryModal] Sub level - Parent:', parentCategory?.name, 'Subcategories:', currentCategories.length, 'Stack length:', categoryNavigationStack.length);
    } else if (currentCategoryLevel === 'subsub') {
      const parentSubcategory = categoryNavigationStack[categoryNavigationStack.length - 1];
      currentCategories = parentSubcategory?.subcategories || [];
      title = parentSubcategory?.name[language] || '';
      logger.info('[CategoryModal] SubSub level - Parent:', parentSubcategory?.name, 'Subcategories:', currentCategories.length, 'Stack length:', categoryNavigationStack.length);
    }

    logger.info('[CategoryModal] Rendering - Level:', currentCategoryLevel, 'Categories:', currentCategories.length, 'Navigation stack:', categoryNavigationStack.map(c => c.name[language]).join(' > '));

    return (
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          // Modal bağlananda yalnız navigation state-i reset et
          // Seçilmiş kateqoriyaları saxla
          setShowCategoryModal(false);
          setCurrentCategoryLevel('main');
          setCategoryNavigationStack([]);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              {currentCategoryLevel !== 'main' && (
                <TouchableOpacity
                  style={styles.categoryBackButton}
                  onPress={handleCategoryBack}
                >
                  <ChevronLeft size={24} color={Colors.primary} />
                </TouchableOpacity>
              )}

              <Text style={[styles.modalTitle, currentCategoryLevel !== 'main' && styles.modalTitleWithBack]}>
                {title}
              </Text>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  // Close button - yalnız modal-ı bağla, seçimləri saxla
                  setShowCategoryModal(false);
                  setCurrentCategoryLevel('main');
                  setCategoryNavigationStack([]);
                }}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            {currentCategoryLevel === 'main' && (
              <View style={styles.searchContainer}>
                <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={language === 'az' ? 'Kateqoriyalarda axtarın...' : 'Поиск в категориях...'}
                  placeholderTextColor={Colors.placeholder}
                  value={categorySearchQuery}
                  onChangeText={setCategorySearchQuery}
                />
              </View>
            )}

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {currentCategories.length === 0 ? (
                <View style={styles.emptySearchContainer}>
                  <Text style={styles.emptySearchText}>
                    {language === 'az' ? 'Heç bir kateqoriya tapılmadı' : 'Категорий не найдено'}
                  </Text>
                </View>
              ) : (
                currentCategories.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.modalItem}
                    onPress={() => handleCategoryPress(item)}
                  >
                    <Text style={styles.modalItemText}>{item.name[language]}</Text>
                    {((currentCategoryLevel === 'main' && (item.subcategories?.length ?? 0) > 0) ||
                      (currentCategoryLevel === 'sub' && (item.subcategories?.length ?? 0) > 0)) && (
                      <ChevronRight size={20} color={Colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Breadcrumb */}
            {categoryNavigationStack.length > 0 && (
              <View style={styles.breadcrumb}>
                <Text style={styles.breadcrumbText}>
                  {categoryNavigationStack.map(item => item.name[language]).join(' >> ')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const renderLocationModal = () => {
    // ✅ Filter locations based on search query
    const filteredLocations = locationSearchQuery
      ? locations.filter(loc =>
        loc.name[language].toLowerCase().includes(locationSearchQuery.toLowerCase()),
      )
      : locations;

    return (
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowLocationModal(false);
          setLocationSearchQuery('');
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'az' ? 'Yer seçin' : 'Выберите местоположение'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowLocationModal(false);
                  setLocationSearchQuery('');
                }}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* ✅ Search input */}
            <View style={styles.searchContainer}>
              <Search size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={language === 'az' ? 'Axtar...' : 'Поиск...'}
                placeholderTextColor={Colors.textSecondary}
                value={locationSearchQuery}
                onChangeText={setLocationSearchQuery}
              />
            </View>

            {/* ✅ Show message if no results */}
            {filteredLocations.length === 0 ? (
              <View style={styles.emptySearchContainer}>
                <MapPin size={48} color={Colors.textSecondary} />
                <Text style={styles.emptySearchText}>
                  {language === 'az' ? 'Heç bir yer tapılmadı' : 'Местоположений не найдено'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredLocations}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedLocation === item.id && styles.selectedModalItem,
                    ]}
                    onPress={() => {
                      // ✅ Validate selection
                      if (!item?.id) {
                        logger.error('[CreateListing] Invalid location selected');
                        return;
                      }

                      setSelectedLocation(item.id);
                      setShowLocationModal(false);
                      setLocationSearchQuery('');
                      logger.info('[CreateListing] Location selected:', item.id);
                    }}
                  >
                    <Text style={[
                      styles.modalItemText,
                      selectedLocation === item.id && styles.selectedModalItemText,
                    ]}>
                      {item.name[language]}
                    </Text>
                    {selectedLocation === item.id && (
                      <Check size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const renderStepOne = () => {
    return (
      <View style={styles.form}>
        <Text style={styles.title}>
          {language === 'az' ? 'Yeni elan yerləşdir' : 'Разместить новое объявление'}
        </Text>

        <View style={styles.imageSection}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionTitle}>
              {language === 'az' ? 'Şəkillər' : 'Изображения'}
            </Text>
            <Text style={styles.optionalLabel}>
              {language === 'az' ? '(İstəyə bağlı)' : '(Необязательно)'}
            </Text>
          </View>
          <View style={styles.imageHeaderRow}>
            <Text style={styles.imageLimit}>
              {language === 'az'
                ? `${images.length}/${selectedPackageData?.features.photosCount} şəkil`
                : `${images.length}/${selectedPackageData?.features.photosCount} изображений`}
            </Text>
            <TouchableOpacity onPress={() => Alert.alert(
              language === 'az' ? 'Şəkillər haqqında' : 'О фотографиях',
              language === 'az'
                ? 'Yaxşı keyfiyyətli və aydın şəkillər elanınızın daha tez satılmasına kömək edəcək.'
                : 'Качественные и четкие фотографии помогут быстрее продать ваш товар.',
            )}>
              <Info size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImages(images.filter((_, i) => i !== index))}
                >
                  <Text style={styles.removeImageText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < (selectedPackageData?.features.photosCount || 3) && (
              <View style={styles.addImageButtonsContainer}>
                <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                  <ImageIcon size={24} color={Colors.primary} />
                  <Text style={styles.addImageText}>
                    {language === 'az' ? 'Qalereyadan' : 'Из галереи'}
                  </Text>
                </TouchableOpacity>
                {Platform.OS !== 'web' && (
                  <TouchableOpacity style={styles.addImageButton} onPress={takePicture}>
                    <Camera size={24} color={Colors.primary} />
                    <Text style={styles.addImageText}>
                      {language === 'az' ? 'Kamera ilə' : 'Камерой'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {language === 'az' ? 'Başlıq' : 'Заголовок'}
          </Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={language === 'az' ? 'Elanın başlığı' : 'Заголовок объявления'}
            placeholderTextColor={Colors.placeholder}
            maxLength={70}
          />
          <Text style={styles.charCount}>{title.length}/70</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {language === 'az' ? 'Təsvir' : 'Описание'}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder={language === 'az' ? 'Elanın təsviri' : 'Описание объявления'}
            placeholderTextColor={Colors.placeholder}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.charCount}>{description.length}/1000</Text>
        </View>


        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {language === 'az' ? 'Qiymət' : 'Цена'}
          </Text>

          <TouchableOpacity
            style={styles.agreementOption}
            onPress={() => setPriceByAgreement(!priceByAgreement)}
          >
            <View style={[
              styles.checkbox,
              priceByAgreement && styles.checkedCheckbox,
            ]}>
              {priceByAgreement && <Check size={16} color="white" />}
            </View>
            <Text style={styles.agreementOptionText}>
              {language === 'az' ? 'Razılaşma yolu ilə' : 'По договоренности'}
            </Text>
          </TouchableOpacity>

          {!priceByAgreement && (
            <>
              <View style={styles.priceContainer}>
                <TextInput
                  style={styles.priceInput}
                  value={price}
                  onChangeText={(text) => setPrice(sanitizeNumericInput(text, 2))}
                  placeholder="0"
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.currency}>
                  {currency}
                </Text>
              </View>

              <View style={styles.currencyOptions}>
                {['AZN', 'USD'].map((curr) => (
                  <TouchableOpacity
                    key={curr}
                    style={[
                      styles.currencyOption,
                      currency === curr && styles.selectedCurrencyOption,
                    ]}
                    onPress={() => setCurrency(curr)}
                  >
                    <Text style={[
                      styles.currencyOptionText,
                      currency === curr && styles.selectedCurrencyOptionText,
                    ]}>
                      {curr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {language === 'az' ? 'Yer' : 'Местоположение'}
          </Text>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => setShowLocationModal(true)}
          >
            <MapPin size={20} color={Colors.textSecondary} style={styles.locationIcon} />
            <Text style={selectedLocation ? styles.locationText : styles.locationPlaceholder}>
              {selectedLocation
                ? selectedLocationData?.name[language]
                : language === 'az' ? 'Şəhər, rayon seçin' : 'Выберите город, район'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {language === 'az' ? 'Kateqoriya' : 'Категория'}
          </Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={selectedCategory ? styles.pickerText : styles.pickerPlaceholder}>
              {selectedCategory
                ? categories.find(c => c.id === selectedCategory)?.name[language]
                : language === 'az' ? 'Kateqoriya seçin' : 'Выберите категорию'}
            </Text>
            <ChevronDown size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {selectedCategory && (selectedCategoryData?.subcategories?.length ?? 0) > 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {language === 'az' ? 'Alt kateqoriya' : 'Подкатегория'}
            </Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => {
                if (selectedCategoryData) {
                  setCurrentCategoryLevel('sub');
                  setCategoryNavigationStack([selectedCategoryData]);
                  setShowCategoryModal(true);
                }
              }}
            >
              <Text style={selectedSubcategory ? styles.pickerText : styles.pickerPlaceholder}>
                {selectedSubcategory
                  ? selectedCategoryData?.subcategories.find(s => s.id === selectedSubcategory)?.name[language]
                  : language === 'az' ? 'Alt kateqoriya seçin' : 'Выберите подкатегорию'}
              </Text>
              <ChevronDown size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {selectedCategory && selectedSubcategory && (selectedCategoryData?.subcategories.find(s => s.id === selectedSubcategory)?.subcategories?.length ?? 0) > 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {language === 'az' ? 'Daha alt kateqoriya' : 'Подподкатегория'}
            </Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => {
                const selectedSubcategoryData = selectedCategoryData?.subcategories.find(s => s.id === selectedSubcategory);
                if (selectedCategoryData && selectedSubcategoryData) {
                  setCurrentCategoryLevel('subsub');
                  setCategoryNavigationStack([selectedCategoryData, selectedSubcategoryData]);
                  setShowCategoryModal(true);
                }
              }}
            >
              <Text style={selectedSubSubcategory ? styles.pickerText : styles.pickerPlaceholder}>
                {selectedSubSubcategory
                  ? selectedCategoryData?.subcategories.find(s => s.id === selectedSubcategory)?.subcategories?.find(ss => ss.id === selectedSubSubcategory)?.name[language]
                  : language === 'az' ? 'Daha alt kateqoriya seçin' : 'Выберите подподкатегорию'}
              </Text>
              <ChevronDown size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>
              {language === 'az' ? 'Vəziyyəti' : 'Состояние'}
            </Text>
            <Text style={styles.optionalLabel}>
              {language === 'az' ? '(İstəyə bağlı)' : '(Необязательно)'}
            </Text>
          </View>
          <View style={styles.conditionOptions}>
            <TouchableOpacity
              style={[
                styles.conditionOption,
                condition === 'new' && styles.selectedConditionOption,
              ]}
              onPress={() => setCondition(condition === 'new' ? null : 'new')}
            >
              <Text style={[
                styles.conditionOptionText,
                condition === 'new' && styles.selectedConditionOptionText,
              ]}>
                {language === 'az' ? 'Yeni' : 'Новое'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.conditionOption,
                condition === 'used' && styles.selectedConditionOption,
              ]}
              onPress={() => setCondition(condition === 'used' ? null : 'used')}
            >
              <Text style={[
                styles.conditionOptionText,
                condition === 'used' && styles.selectedConditionOptionText,
              ]}>
                {language === 'az' ? 'İşlənmiş' : 'Б/у'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>
              {language === 'az' ? 'Çatdırılma' : 'Доставка'}
            </Text>
            <Text style={styles.optionalLabel}>
              {language === 'az' ? '(İstəyə bağlı)' : '(Необязательно)'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deliveryOption}
            onPress={() => setDeliveryAvailable(!deliveryAvailable)}
          >
            <View style={[
              styles.checkbox,
              deliveryAvailable && styles.checkedCheckbox,
            ]}>
              {deliveryAvailable && <Check size={16} color="white" />}
            </View>
            <Text style={styles.deliveryOptionText}>
              {language === 'az' ? 'Çatdırılma mümkündür' : 'Возможна доставка'}
            </Text>
          </TouchableOpacity>

          {deliveryAvailable && (
            <View style={styles.deliveryTypeContainer}>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowDeliveryTypes(!showDeliveryTypes)}
              >
                <Text style={deliveryType ? styles.pickerText : styles.pickerPlaceholder}>
                  {deliveryType
                    ? deliveryType
                    : language === 'az' ? 'Çatdırılma növünü seçin' : 'Выберите тип доставки'}
                </Text>
                <ChevronDown size={20} color={Colors.textSecondary} />
              </TouchableOpacity>

              {showDeliveryTypes && (
                <View style={styles.pickerOptions}>
                  {[
                    { id: 'free', name: { az: 'Pulsuz çatdırılma', ru: 'Бесплатная доставка', en: 'Free delivery' } },
                    { id: 'paid', name: { az: 'Ödənişli çatdırılma', ru: 'Платная доставка', en: 'Paid delivery' } },
                    { id: 'regions', name: { az: 'Rayonlara çatdırılma', ru: 'Доставка в регионы', en: 'Regional delivery' } },
                    { id: 'pickup', name: { az: 'Ünvandan götürmə', ru: 'Самовывоз', en: 'Pickup' } },
                  ].map(type => {
                    const typeName = type.name[language as 'az' | 'ru' | 'en'];
                    return (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.pickerOption,
                          deliveryType === typeName && styles.selectedPickerOption,
                        ]}
                        onPress={() => {
                          setDeliveryType(typeName);
                          setShowDeliveryTypes(false);
                        }}
                      >
                        <Text style={[
                          styles.pickerOptionText,
                          deliveryType === typeName && styles.selectedPickerOptionText,
                        ]}>
                          {typeName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {language === 'az' ? 'Əlaqə üsulu' : 'Способ связи'}
          </Text>
          <View style={styles.contactOptions}>
            <TouchableOpacity
              style={[
                styles.contactOption,
                contactPreference === 'phone' && styles.selectedContactOption,
              ]}
              onPress={() => setContactPreference('phone')}
            >
              <Text style={[
                styles.contactOptionText,
                contactPreference === 'phone' && styles.selectedContactOptionText,
              ]}>
                {language === 'az' ? 'Telefon' : 'Телефон'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.contactOption,
                contactPreference === 'message' && styles.selectedContactOption,
              ]}
              onPress={() => setContactPreference('message')}
            >
              <Text style={[
                styles.contactOptionText,
                contactPreference === 'message' && styles.selectedContactOptionText,
              ]}>
                {language === 'az' ? 'Mesaj' : 'Сообщение'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.contactOption,
                contactPreference === 'both' && styles.selectedContactOption,
              ]}
              onPress={() => setContactPreference('both')}
            >
              <Text style={[
                styles.contactOptionText,
                contactPreference === 'both' && styles.selectedContactOptionText,
              ]}>
                {language === 'az' ? 'Hər ikisi' : 'Оба'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Store Option */}
        {activeUserStores.length > 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {language === 'az' ? 'Mağaza' : 'Магазин'}
            </Text>
            <TouchableOpacity
              style={styles.storeOption}
              onPress={() => setAddToStore(!addToStore)}
            >
              <View style={[
                styles.checkbox,
                addToStore && styles.checkedCheckbox,
              ]}>
                {addToStore && <Check size={16} color="white" />}
              </View>
              <View style={styles.storeOptionContent}>
                <Text style={styles.storeOptionText}>
                  {language === 'az' ? 'Mağazaya əlavə et' : 'Добавить в магазин'}
                </Text>
                <Text style={styles.storeOptionSubtext}>
                  {language === 'az' ? 'İzləyənlər bildiriş alacaq' : 'Подписчики получат уведомление'}
                </Text>
              </View>
            </TouchableOpacity>

            {addToStore && (
              <View style={styles.storeSelectionContainer}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowStoreModal(true)}
                >
                  <Text style={selectedStore ? styles.pickerText : styles.pickerPlaceholder}>
                    {selectedStore
                      ? selectedStore.name
                      : language === 'az' ? 'Mağaza seçin' : 'Выберите магазин'}
                  </Text>
                  <ChevronDown size={20} color={Colors.textSecondary} />
                </TouchableOpacity>

                {selectedStore && (
                  <View style={styles.storeUsageInfo}>
                    <Text style={styles.storeUsageText}>
                      {language === 'az'
                        ? `${selectedStore.adsUsed}/${selectedStore.maxAds} elan istifadə edilib`
                        : `${selectedStore.adsUsed}/${selectedStore.maxAds} объявлений использовано`}
                    </Text>
                    {!canAddToSelectedStore && (
                      <Text style={styles.storeUsageWarning}>
                        {language === 'az' ? 'Limit dolub - paketi yüksəldin' : 'Лимит исчерпан - улучшите пакет'}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderStepTwo = () => {
    return (
      <View style={styles.form}>
        <Text style={styles.title}>
          {language === 'az' ? 'Elan paketi seçin' : 'Выберите пакет объявления'}
        </Text>

        <View style={styles.packagesContainer}>
          {adPackages.map(pkg => (
            <TouchableOpacity
              key={pkg.id}
              style={[
                styles.packageCard,
                selectedPackage === pkg.id && styles.selectedPackageCard,
              ]}
              onPress={() => setSelectedPackage(pkg.id)}
            >
              <View style={styles.packageHeader}>
                <Text style={styles.packageName}>{pkg.name[language]}</Text>
                <Text style={styles.packagePrice}>
                  {pkg.price > 0 ? `${pkg.price} ${pkg.currency}` : language === 'az' ? 'Pulsuz' : 'Бесплатно'}
                </Text>
              </View>

              <View style={styles.packageFeatures}>
                <View style={styles.packageFeature}>
                  <Clock size={16} color={Colors.textSecondary} />
                  <Text style={styles.packageFeatureText}>
                    {language === 'az'
                      ? `${pkg.duration} gün`
                      : `${pkg.duration} дней`}
                  </Text>
                </View>

                <View style={styles.packageFeature}>
                  <ImageIcon size={16} color={Colors.textSecondary} />
                  <Text style={styles.packageFeatureText}>
                    {language === 'az'
                      ? `${pkg.features.photosCount} şəkil`
                      : `${pkg.features.photosCount} фото`}
                  </Text>
                </View>

                {pkg.features.priorityPlacement && (
                  <View style={styles.packageFeature}>
                    <Award size={16} color={Colors.textSecondary} />
                    <Text style={styles.packageFeatureText}>
                      {language === 'az'
                        ? 'Prioritet yerləşdirmə'
                        : 'Приоритетное размещение'}
                    </Text>
                  </View>
                )}

                {pkg.features.featured && (
                  <View style={styles.packageFeature}>
                    <Award size={16} color={Colors.secondary} />
                    <Text style={styles.packageFeatureText}>
                      {language === 'az' ? 'VIP elan' : 'VIP объявление'}
                    </Text>
                  </View>
                )}
              </View>

              {selectedPackage === pkg.id && (
                <View style={styles.selectedPackageCheck}>
                  <Check size={20} color="white" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Info - Show only if not adding to store with available slots */}
        {(() => {
          const isStoreListingWithSlots = addToStore && selectedStore && canAddToSelectedStore;

          if (isStoreListingWithSlots) {
            return (
              <View style={styles.balanceInfo}>
                <View style={styles.paymentStatusSuccess}>
                  <Check size={16} color={Colors.success} />
                  <Text style={styles.paymentStatusText}>
                    {language === 'az'
                      ? 'Mağazanızda boş yer var - ödəniş tələb olunmur'
                      : 'В вашем магазине есть свободное место - оплата не требуется'}
                  </Text>
                </View>
                <View style={styles.storeUsageInfo}>
                  <Text style={styles.storeUsageText}>
                    {language === 'az'
                      ? `${selectedStore.adsUsed + 1}/${selectedStore.maxAds} elan istifadə ediləcək`
                      : `${selectedStore.adsUsed + 1}/${selectedStore.maxAds} объявлений будет использовано`}
                  </Text>
                </View>
              </View>
            );
          }

          if (selectedPackage !== 'free') {
            return (
              <View style={styles.balanceInfo}>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>
                    {language === 'az' ? 'Cari balansınız:' : 'Ваш текущий баланс:'}
                  </Text>
                  <Text style={styles.balanceAmount}>
                    {getTotalBalance().toFixed(2)} AZN
                  </Text>
                </View>

                <View style={styles.packageCostRow}>
                  <Text style={styles.packageCostLabel}>
                    {language === 'az' ? 'Paket qiyməti:' : 'Стоимость пакета:'}
                  </Text>
                  <Text style={styles.packageCostAmount}>
                    {selectedPackageData?.price} AZN
                  </Text>
                </View>

                {canAfford(selectedPackageData?.price || 0) ? (
                  <View style={styles.paymentStatusSuccess}>
                    <Check size={16} color={Colors.success} />
                    <Text style={styles.paymentStatusText}>
                      {language === 'az'
                        ? 'Balansınızdan avtomatik ödəniş ediləcək'
                        : 'Оплата будет автоматически списана с баланса'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.paymentStatusError}>
                    <AlertCircle size={16} color={Colors.error} />
                    <Text style={styles.paymentStatusText}>
                      {language === 'az'
                        ? `Balansınız kifayət etmir. ${((selectedPackageData?.price || 0) - getTotalBalance()).toFixed(2)} AZN əlavə edin.`
                        : `Недостаточно средств. Добавьте ${((selectedPackageData?.price || 0) - getTotalBalance()).toFixed(2)} AZN.`}
                    </Text>
                  </View>
                )}

                {!canAfford(selectedPackageData?.price || 0) && (
                  <TouchableOpacity
                    style={styles.topUpButton}
                    onPress={() => router.push('/wallet')}
                  >
                    <Plus size={16} color="white" />
                    <Text style={styles.topUpButtonText}>
                      {language === 'az' ? 'Balans artır' : 'Пополнить баланс'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }

          return null;
        })()}

        <View style={styles.rulesContainer}>
          <AlertCircle size={20} color={Colors.textSecondary} />
          <Text style={styles.rulesText}>
            {language === 'az'
              ? 'Elan yerləşdirməklə siz saytın qaydaları və şərtləri ilə razılaşırsınız.'
              : 'Размещая объявление, вы соглашаетесь с правилами и условиями сайта.'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stepIndicator}>
          <View style={[styles.step, currentStep >= 1 && styles.activeStep]}>
            <Text style={[styles.stepText, currentStep >= 1 && styles.activeStepText]}>1</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={[styles.step, currentStep >= 2 && styles.activeStep]}>
            <Text style={[styles.stepText, currentStep >= 2 && styles.activeStepText]}>2</Text>
          </View>
        </View>

        {currentStep === 1 ? renderStepOne() : renderStepTwo()}

        <View style={styles.navigationButtons}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handlePrevStep}>
              <Text style={styles.backButtonText}>
                {language === 'az' ? 'Geri' : 'Назад'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              currentStep === 1 && styles.fullWidthButton,
            ]}
            onPress={handleNextStep}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === 1
                ? (language === 'az' ? 'Davam et' : 'Продолжить')
                : (language === 'az' ? 'Elanı yerləşdir' : 'Разместить объявление')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {renderCategoryModal()}
      {renderLocationModal()}
      {renderStoreModal()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  step: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStep: {
    backgroundColor: Colors.primary,
  },
  stepText: {
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  activeStepText: {
    color: 'white',
  },
  stepLine: {
    flex: 0.2,
    height: 2,
    backgroundColor: Colors.border,
  },
  form: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: Colors.text,
  },
  imageSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    color: Colors.text,
  },
  imageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageLimit: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  imageList: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addImageButtonsContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  addImageButton: {
    width: 100,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.card,
  },
  addImageText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: Colors.text,
  },
  optionalLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  textArea: {
    minHeight: 100,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  priceInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  currency: {
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
  },
  locationIcon: {
    marginRight: 8,
  },
  locationText: {
    fontSize: 16,
    color: Colors.text,
  },
  locationPlaceholder: {
    fontSize: 16,
    color: Colors.placeholder,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
  },
  pickerText: {
    fontSize: 16,
    color: Colors.text,
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: Colors.placeholder,
  },
  pickerOptions: {
    marginTop: 4,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    maxHeight: 200,
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedPickerOption: {
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
  },
  pickerOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedPickerOptionText: {
    color: Colors.primary,
    fontWeight: '500',
  },
  conditionOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  conditionOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedConditionOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  conditionOptionText: {
    color: Colors.text,
  },
  selectedConditionOptionText: {
    color: 'white',
  },
  deliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCheckbox: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  deliveryOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  deliveryTypeContainer: {
    marginTop: 12,
  },
  contactOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  selectedContactOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  contactOptionText: {
    color: Colors.text,
  },
  selectedContactOptionText: {
    color: 'white',
  },
  storeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 116, 144, 0.05)',
  },
  storeOptionContent: {
    flex: 1,
  },
  storeOptionText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  storeOptionSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  packagesContainer: {
    marginBottom: 20,
  },
  packageCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  selectedPackageCard: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(14, 116, 144, 0.05)',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary,
  },
  packageFeatures: {
    gap: 8,
  },
  packageFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  packageFeatureText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  selectedPackageCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentSection: {
    marginBottom: 20,
  },
  paymentIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  paymentCategorySection: {
    marginBottom: 16,
  },
  paymentCategoryTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    paddingHorizontal: 16,
    textTransform: 'uppercase' as const,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  rulesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 116, 144, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  rulesText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  navigationButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    marginBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  backButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  fullWidthButton: {
    flex: 1,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  modalTitleWithBack: {
    textAlign: 'left',
    marginLeft: 12,
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: 'bold',
  },
  categoryBackButton: {
    padding: 8,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    fontSize: 16,
    color: Colors.text,
  },
  agreementOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginBottom: 12,
  },
  agreementOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  categoriesContainer: {
    paddingVertical: 8,
  },
  breadcrumb: {
    padding: 16,
    backgroundColor: 'rgba(14, 116, 144, 0.05)',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  breadcrumbText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  currencyOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyOption: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectedCurrencyOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  currencyOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  selectedCurrencyOptionText: {
    color: 'white',
  },
  vehicleFormContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vehicleFormTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  requiredStar: {
    color: '#ff4444',
    fontSize: 14,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  selectedCurrencyButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  currencyButtonText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  selectedCurrencyButtonText: {
    color: 'white',
  },
  storeSelectionContainer: {
    marginTop: 12,
  },
  storeUsageInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(14, 116, 144, 0.05)',
    borderRadius: 6,
  },
  storeUsageText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  storeUsageWarning: {
    fontSize: 12,
    color: '#ff4444',
    marginTop: 2,
  },
  storeModalItemContent: {
    flex: 1,
  },
  storeModalItemSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  storeModalItemWarning: {
    fontSize: 12,
    color: '#ff4444',
    marginTop: 2,
  },
  disabledModalItem: {
    opacity: 0.5,
  },
  disabledModalItemText: {
    color: Colors.textSecondary,
  },
  balanceInfo: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  packageCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  packageCostLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  packageCostAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  paymentStatusSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  paymentStatusError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  paymentStatusText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    color: Colors.text,
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  topUpButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  authRequiredContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authRequiredContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  authRequiredIcon: {
    marginBottom: 24,
  },
  authRequiredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  authRequiredDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  authRequiredButtons: {
    width: '100%',
    gap: 12,
  },
  authRequiredButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  authRequiredSecondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  authRequiredButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authRequiredSecondaryButtonText: {
    color: Colors.primary,
  },
  emptySearchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptySearchText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  selectedModalItem: {
    backgroundColor: Colors.primaryLight || 'rgba(0, 122, 255, 0.1)',
  },
  selectedModalItemText: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

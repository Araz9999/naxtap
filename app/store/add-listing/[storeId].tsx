import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLanguageStore } from '@/store/languageStore';
import { useStoreStore } from '@/store/storeStore';
import { useListingStore } from '@/store/listingStore';
import { useUserStore } from '@/store/userStore';
import { categories } from '@/constants/categories';
import { locations } from '@/constants/locations';
import Colors from '@/constants/colors';
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  MapPin,
  ChevronDown,
  Check,
  AlertCircle,
  Package,
} from 'lucide-react-native';
import { Listing } from '@/types/listing';

import { storeLogger } from '@/utils/logger';
export default function AddStoreListingScreen() {
  const router = useRouter();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { language } = useLanguageStore();
  const { stores, canAddListing, getStoreUsage } = useStoreStore();
  const { addListingToStore } = useListingStore();
  const { currentUser } = useUserStore();

  const store = stores.find(s => s.id === storeId);
  const storeUsage = store ? getStoreUsage(store.id) : { used: 0, max: 0, remaining: 0 };
  const canAdd = store ? canAddListing(store.id) : false;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState<number | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [condition, setCondition] = useState<'new' | 'used' | null>(null);
  const [deliveryAvailable, setDeliveryAvailable] = useState<boolean | null>(null);
  const [contactPreference, setContactPreference] = useState<'phone' | 'message' | 'both' | null>(null);
  const [priceByAgreement, setPriceByAgreement] = useState(false);
  const [currency, setCurrency] = useState('AZN');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');

  const selectedLocationData = locations.find(l => l.id === selectedLocation);
  const selectedCategoryData = categories.find(c => c.id === selectedCategory);

  if (!store || !currentUser || store.userId !== currentUser.id) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'az' ? 'Xəta' : 'Ошибка'}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={Colors.error} />
          <Text style={styles.errorText}>
            {language === 'az' ? 'Mağaza tapılmadı və ya icazəniz yoxdur' : 'Магазин не найден или у вас нет доступа'}
          </Text>
        </View>
      </View>
    );
  }

  if (!canAdd) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'az' ? 'Limit dolub' : 'Лимит исчерпан'}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Package size={48} color={Colors.textSecondary} />
          <Text style={styles.errorText}>
            {language === 'az'
              ? `Mağazanızda maksimum ${storeUsage.max} elan yerləşdirə bilərsiniz. Hazırda ${storeUsage.used} elan istifadə edilib.`
              : `В вашем магазине можно разместить максимум ${storeUsage.max} объявлений. Сейчас используется ${storeUsage.used}.`}
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/store/upgrade')}
          >
            <Text style={styles.upgradeButtonText}>
              {language === 'az' ? 'Paketi yüksəlt' : 'Улучшить пакет'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            language === 'az' ? 'İcazə tələb olunur' : 'Требуется разрешение',
            language === 'az' ? 'Qalereya icazəsi lazımdır' : 'Требуется разрешение галереи',
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8, // BUG FIX: Reduced quality for better performance
      });

      // BUG FIX: Validate assets array exists and has items
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        const asset = result.assets[0];

        // ✅ Check file size (max 5MB) - same as camera
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            language === 'az' ? 'Şəkil çox böyükdür' : 'Изображение слишком большое',
            language === 'az'
              ? 'Maksimum 5MB ölçüsündə şəkil əlavə edin'
              : 'Добавьте изображение размером до 5MB',
          );
          return;
        }

        if (images.length >= 5) {
          Alert.alert(
            language === 'az' ? 'Limit aşıldı' : 'Лимит превышен',
            language === 'az'
              ? 'Maksimum 5 şəkil əlavə edə bilərsiniz'
              : 'Можно добавить максимум 5 изображений',
          );
          return;
        }
        setImages([...images, asset.uri]);
      }
    } catch (error) {
      storeLogger.error('Gallery error:', error);
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
        quality: 0.8, // BUG FIX: Reduced quality for better performance
      });

      // BUG FIX: Validate assets array exists and has items
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        const asset = result.assets[0];

        // ✅ Check file size (max 5MB)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            language === 'az' ? 'Şəkil çox böyükdür' : 'Изображение слишком большое',
            language === 'az'
              ? 'Maksimum 5MB ölçüsündə şəkil əlavə edin'
              : 'Добавьте изображение размером до 5MB',
          );
          return;
        }

        if (images.length >= 5) {
          Alert.alert(
            language === 'az' ? 'Limit aşıldı' : 'Лимит превышен',
            language === 'az'
              ? 'Maksimum 5 şəkil əlavə edə bilərsiniz'
              : 'Можно добавить максимум 5 изображений',
          );
          return;
        }
        setImages([...images, asset.uri]);
      }
    } catch (error) {
      storeLogger.error('Camera error:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Şəkil çəkilə bilmədi' : 'Не удалось сделать фото',
      );
    }
  };

  const handleSubmit = async () => {
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

    // Show confirmation dialog
    Alert.alert(
      language === 'az' ? 'Təsdiq' : 'Подтверждение',
      language === 'az'
        ? 'Elanı mağazaya əlavə etmək istədiyinizdən əminsiniz?'
        : 'Вы уверены, что хотите добавить объявление в магазин?',
      [
        {
          text: language === 'az' ? 'Xeyr' : 'Нет',
          style: 'cancel',
        },
        {
          text: language === 'az' ? 'Bəli' : 'Да',
          onPress: () => submitListing(),
        },
      ],
    );
  };

  const submitListing = async () => {
    setIsSubmitting(true);

    try {
      // ✅ Generate unique ID with random component
      const listingId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const newListing: Listing = {
        id: listingId,
        title: {
          az: title.trim(),
          ru: title.trim(),
        },
        description: {
          az: description,
          ru: description,
        },
        price: priceByAgreement ? 0 : (parseFloat(price) || 0),
        currency: currency as 'AZN' | 'USD',
        images,
        categoryId: selectedCategory!,
        subcategoryId: selectedSubcategory ?? 0,
        subSubcategoryId: selectedSubSubcategory || undefined,
        location: {
          az: selectedLocationData?.name.az || '',
          ru: selectedLocationData?.name.ru || '',
        },
        storeId,
        storeAddress: store.address,
        storeContact: store.contactInfo,
        userId: currentUser.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        views: 0,
        favorites: 0,
        isFeatured: false,
        isPremium: false,
        isVip: false,
        adType: 'free',
        contactPreference: contactPreference || 'both',
        priceByAgreement,
        condition: condition || undefined,
        deliveryAvailable: deliveryAvailable !== null ? deliveryAvailable : undefined,
      };

      await addListingToStore(newListing, storeId);

      Alert.alert(
        language === 'az' ? 'Uğurlu!' : 'Успешно!',
        language === 'az'
          ? 'Elan mağazanıza uğurla əlavə edildi'
          : 'Объявление успешно добавлено в ваш магазин',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      storeLogger.error('Failed to add listing to store:', error);

      // ✅ Provide specific error feedback
      const errorMessage = error instanceof Error ? error.message : '';
      const isLimitError = errorMessage.toLowerCase().includes('limit') || errorMessage.toLowerCase().includes('maximum');

      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        isLimitError
          ? (language === 'az'
            ? 'Mağaza limiti dolub. Paketi yüksəldin.'
            : 'Лимит магазина исчерпан. Улучшите пакет.')
          : (language === 'az'
            ? 'Elan əlavə edilərkən xəta baş verdi'
            : 'Произошла ошибка при добавлении объявления'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'az' ? 'Yeni elan əlavə et' : 'Добавить объявление'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.storeInfo}>
        <Package size={20} color={Colors.primary} />
        <View style={styles.storeDetails}>
          <Text style={styles.storeName}>{store.name}</Text>
          <Text style={styles.storeUsageText}>
            {language === 'az'
              ? `${storeUsage.remaining} elan qalıb`
              : `Осталось ${storeUsage.remaining} объявлений`}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Images */}
          <View style={styles.imageSection}>
            <Text style={styles.sectionTitle}>
              {language === 'az' ? 'Şəkillər' : 'Изображения'}
              <Text style={styles.optionalText}> ({language === 'az' ? 'istəyə bağlı' : 'необязательно'})</Text>
            </Text>
            <Text style={styles.imageLimit}>
              {language === 'az'
                ? `${images.length}/5 şəkil`
                : `${images.length}/5 изображений`}
            </Text>
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
              {images.length < 5 && (
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

          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {language === 'az' ? 'Başlıq *' : 'Заголовок *'}
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

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {language === 'az' ? 'Təsvir *' : 'Описание *'}
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

          {/* Price */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {language === 'az' ? 'Qiymət *' : 'Цена *'}
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
                    onChangeText={setPrice}
                    placeholder="0"
                    placeholderTextColor={Colors.placeholder}
                    keyboardType="numeric"
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

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {language === 'az' ? 'Yer *' : 'Местоположение *'}
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

          {/* Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {language === 'az' ? 'Kateqoriya *' : 'Категория *'}
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

          {/* Condition */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {language === 'az' ? 'Vəziyyəti' : 'Состояние'}
              <Text style={styles.optionalText}> ({language === 'az' ? 'istəyə bağlı' : 'необязательно'})</Text>
            </Text>
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

          {/* Delivery */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {language === 'az' ? 'Çatdırılma' : 'Доставка'}
              <Text style={styles.optionalText}> ({language === 'az' ? 'istəyə bağlı' : 'необязательно'})</Text>
            </Text>
            <View style={styles.deliveryOptions}>
              <TouchableOpacity
                style={[
                  styles.deliveryOption,
                  deliveryAvailable === true && styles.selectedDeliveryOption,
                ]}
                onPress={() => setDeliveryAvailable(deliveryAvailable === true ? null : true)}
              >
                <View style={[
                  styles.checkbox,
                  deliveryAvailable === true && styles.checkedCheckbox,
                ]}>
                  {deliveryAvailable === true && <Check size={16} color="white" />}
                </View>
                <Text style={[
                  styles.deliveryOptionText,
                  deliveryAvailable === true && styles.selectedDeliveryOptionText,
                ]}>
                  {language === 'az' ? 'Çatdırılma mümkündür' : 'Возможна доставка'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deliveryOption,
                  deliveryAvailable === false && styles.selectedDeliveryOption,
                ]}
                onPress={() => setDeliveryAvailable(deliveryAvailable === false ? null : false)}
              >
                <View style={[
                  styles.checkbox,
                  deliveryAvailable === false && styles.checkedCheckbox,
                ]}>
                  {deliveryAvailable === false && <Check size={16} color="white" />}
                </View>
                <Text style={[
                  styles.deliveryOptionText,
                  deliveryAvailable === false && styles.selectedDeliveryOptionText,
                ]}>
                  {language === 'az' ? 'Çatdırılma yoxdur' : 'Доставка недоступна'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Contact Preference */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {language === 'az' ? 'Əlaqə üsulu' : 'Способ связи'}
              <Text style={styles.optionalText}> ({language === 'az' ? 'istəyə bağlı' : 'необязательно'})</Text>
            </Text>
            <View style={styles.contactOptions}>
              <TouchableOpacity
                style={[
                  styles.contactOption,
                  contactPreference === 'phone' && styles.selectedContactOption,
                ]}
                onPress={() => setContactPreference(contactPreference === 'phone' ? null : 'phone')}
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
                onPress={() => setContactPreference(contactPreference === 'message' ? null : 'message')}
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
                onPress={() => setContactPreference(contactPreference === 'both' ? null : 'both')}
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
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting
              ? (language === 'az' ? 'Əlavə edilir...' : 'Добавляется...')
              : (language === 'az' ? 'Elan əlavə et' : 'Добавить объявление')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Location Selection Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowLocationModal(false);
          setLocationSearchQuery('');
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowLocationModal(false);
              setLocationSearchQuery('');
            }}>
              <Text style={styles.modalCancelText}>
                {language === 'az' ? 'Ləğv et' : 'Отмена'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {language === 'az' ? 'Yer seçin' : 'Выберите место'}
            </Text>
            <View style={styles.modalPlaceholder} />
          </View>

          {/* ✅ Search input */}
          <View style={styles.searchContainer}>
            <MapPin size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={language === 'az' ? 'Axtar...' : 'Поиск...'}
              placeholderTextColor={Colors.textSecondary}
              value={locationSearchQuery}
              onChangeText={setLocationSearchQuery}
            />
          </View>

          {/* ✅ Filtered locations */}
          <FlatList
            data={locationSearchQuery
              ? locations.filter(loc =>
                loc.name[language].toLowerCase().includes(locationSearchQuery.toLowerCase()),
              )
              : locations
            }
            keyExtractor={(item) => item.id}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <MapPin size={48} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>
                  {language === 'az' ? 'Heç bir yer tapılmadı' : 'Местоположений не найдено'}
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  selectedLocation === item.id && styles.selectedModalItem,
                ]}
                onPress={() => {
                  // ✅ Validate location selection
                  if (!item?.id) {
                    storeLogger.error('[AddStoreListing] Invalid location selected');
                    return;
                  }

                  setSelectedLocation(item.id);
                  setShowLocationModal(false);
                  setLocationSearchQuery('');
                  storeLogger.info('[AddStoreListing] Location selected:', item.id);
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
        </View>
      </Modal>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Text style={styles.modalCancelText}>
                {language === 'az' ? 'Ləğv et' : 'Отмена'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {language === 'az' ? 'Kateqoriya seçin' : 'Выберите категорию'}
            </Text>
            <View style={styles.modalPlaceholder} />
          </View>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  selectedCategory === item.id && styles.selectedModalItem,
                ]}
                onPress={() => {
                  setSelectedCategory(item.id);
                  setSelectedSubcategory(null);
                  setShowCategoryModal(false);
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  selectedCategory === item.id && styles.selectedModalItemText,
                ]}>
                  {item.name[language]}
                </Text>
                {selectedCategory === item.id && (
                  <Check size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 116, 144, 0.05)',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  storeDetails: {
    marginLeft: 12,
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  storeUsageText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  imageSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: Colors.text,
  },
  imageLimit: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
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
    textAlignVertical: 'top',
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
  agreementOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
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
  optionalText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: 'normal',
  },
  deliveryOptions: {
    gap: 8,
  },
  deliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  selectedDeliveryOption: {
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    borderColor: Colors.primary,
  },
  deliveryOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedDeliveryOptionText: {
    color: Colors.primary,
    fontWeight: '500',
  },
  contactOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  contactOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedContactOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  contactOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  selectedContactOptionText: {
    color: 'white',
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  upgradeButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  modalCancelText: {
    fontSize: 16,
    color: Colors.primary,
  },
  modalPlaceholder: {
    width: 60,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectedModalItem: {
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  selectedModalItemText: {
    color: Colors.primary,
    fontWeight: '500',
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
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 8,
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
    marginTop: 16,
    textAlign: 'center',
  },
});

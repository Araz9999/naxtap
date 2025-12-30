import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
  Modal,
  FlatList,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useListingStore } from '@/store/listingStore';
import { useUserStore } from '@/store/userStore';
import { categories } from '@/constants/categories';
import { locations } from '@/constants/locations';
import Colors from '@/constants/colors';
import { prompt } from '@/utils/confirm';
import { LocalizedText } from '@/types/category';
import {
  ArrowLeft,
  Save,
  Camera,
  MapPin,
  DollarSign,
  FileText,
  Tag,
  ChevronDown,
  X,
  RefreshCw,
} from 'lucide-react-native';
import AutoRenewalManager from '@/components/AutoRenewalManager';

import { logger } from '@/utils/logger';
type FormData = {
  title: LocalizedText;
  description: LocalizedText;
  price: string;
  currency: string;
  categoryId: number;
  subcategoryId: number;
  subSubcategoryId?: number;
  location: LocalizedText;
  locationId: string;
  images: string[];
  condition: string;
  deliveryAvailable: boolean;
};

export default function EditListingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useLanguageStore();
  const { listings, updateListing } = useListingStore();
  const { currentUser, isAuthenticated } = useUserStore();

  const listing = listings.find(l => l.id === id);

  const [formData, setFormData] = useState<FormData>({
    title: { az: '', ru: '', en: '' },
    description: { az: '', ru: '', en: '' },
    price: '',
    currency: 'AZN',
    categoryId: 0,
    subcategoryId: 0,
    subSubcategoryId: 0,
    location: { az: '', ru: '', en: '' },
    locationId: '',
    images: [] as string[],
    condition: '',
    deliveryAvailable: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [selectedCategoryLevel, setSelectedCategoryLevel] = useState(0);
  const [categoryPath, setCategoryPath] = useState<any[]>([]);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');

  const currencies = ['AZN', 'USD', 'EUR', 'TRY', 'RUB'];

  useEffect(() => {
    try {
      if (listing) {
        // ✅ Validate listing data
        if (!listing.title || !listing.description || typeof listing.price !== 'number') {
          logger.error('[EditListingScreen] Invalid listing data');
          Alert.alert(
            language === 'az' ? 'Xəta' : 'Ошибка',
            language === 'az' ? 'Elan məlumatları düzgün deyil' : 'Данные объявления неверны',
          );
          return;
        }

        // ✅ Validate ownership
        if (listing.userId !== currentUser?.id) {
          logger.error('[EditListingScreen] User is not owner');
          Alert.alert(
            language === 'az' ? 'Xəta' : 'Ошибка',
            language === 'az' ? 'Bu elanı redaktə etmək icazəniz yoxdur' : 'У вас нет прав для редактирования этого объявления',
            [{ text: 'OK', onPress: () => router.back() }],
          );
          return;
        }

        const selectedLocation = locations.find(loc =>
          loc.name.az === listing.location.az || loc.name.ru === listing.location.ru,
        );

        setFormData({
          title: listing.title || { az: '', ru: '', en: '' },
          description: listing.description || { az: '', ru: '', en: '' },
          price: listing.price.toString(),
          currency: listing.currency || 'AZN',
          categoryId: listing.categoryId || 0,
          subcategoryId: listing.subcategoryId || 0,
          subSubcategoryId: listing.subSubcategoryId || 0,
          location: listing.location || { az: '', ru: '', en: '' },
          locationId: selectedLocation?.id || '',
          images: Array.isArray(listing.images) ? listing.images : [],
          condition: listing.condition || '',
          deliveryAvailable: listing.deliveryAvailable || false,
        });

        logger.debug('[EditListingScreen] Listing data loaded:', listing.id);
      }
    } catch (error) {
      logger.error('[EditListingScreen] Error loading listing data:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Elan məlumatlarını yükləyərkən xəta' : 'Ошибка при загрузке данных объявления',
      );
    }
  }, [listing, language, currentUser]);

  if (!listing) {
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
          <Text style={styles.errorText}>
            {language === 'az' ? 'Elan tapılmadı' : 'Объявление не найдено'}
          </Text>
        </View>
      </View>
    );
  }

  const selectedCategory = categories.find(cat => cat.id === formData.categoryId);
  const subcategories = selectedCategory?.subcategories || [];
  const selectedLocation = locations.find(loc => loc.id === formData.locationId);

  const handleImagePicker = () => {
    Alert.alert(
      language === 'az' ? 'Şəkil əlavə et' : 'Добавить фото',
      language === 'az' ? 'Şəkil seçmək üçün seçim edin' : 'Выберите способ добавления фото',
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'az' ? 'Kameradan' : 'Камера',
          onPress: () => pickImageFromCamera(),
        },
        {
          text: language === 'az' ? 'Qalereya' : 'Галерея',
          onPress: () => pickImageFromGallery(),
        },
        {
          text: language === 'az' ? 'URL daxil et' : 'Ввести URL',
          onPress: async () => {
            const url = await prompt(
              language === 'az' ? 'Şəkil URL-ni daxil edin' : 'Введите URL изображения',
              language === 'az' ? 'Şəkil URL' : 'URL изображения',
            );
            if (url && url.trim()) {
              setFormData(prev => ({
                ...prev,
                images: [...prev.images, url.trim()],
              }));
            }
          },
        },
      ],
    );
  };

  const pickImageFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'az' ? 'İcazə tələb olunur' : 'Требуется разрешение',
          language === 'az' ? 'Kamera istifadə etmək üçün icazə verin' : 'Предоставьте разрешение для использования камеры',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      // ✅ Validate result and file size
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        const asset = result.assets[0];

        // ✅ Check file size (max 10MB)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert(
            language === 'az' ? 'Şəkil çox böyükdür' : 'Изображение слишком большое',
            language === 'az'
              ? 'Maksimum 10MB ölçüsündə şəkil əlavə edin'
              : 'Добавьте изображение размером до 10MB',
          );
          return;
        }

        setFormData(prev => ({
          ...prev,
          images: [...prev.images, asset.uri],
        }));

        logger.info('Image added from camera', { fileSize: asset.fileSize });
      }
    } catch (error) {
      logger.error('Camera error:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Şəkil çəkərkən xəta baş verdi' : 'Произошла ошибка при съемке',
      );
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'az' ? 'İcazə tələb olunur' : 'Требуется разрешение',
          language === 'az' ? 'Qalereya daxil olmaq üçün icazə verin' : 'Предоставьте разрешение для доступа к галерее',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      // ✅ Validate result and file size
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        const asset = result.assets[0];

        // ✅ Check file size (max 10MB)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert(
            language === 'az' ? 'Şəkil çox böyükdür' : 'Изображение слишком большое',
            language === 'az'
              ? 'Maksimum 10MB ölçüsündə şəkil əlavə edin'
              : 'Добавьте изображение размером до 10MB',
          );
          return;
        }

        setFormData(prev => ({
          ...prev,
          images: [...prev.images, asset.uri],
        }));

        logger.info('Image added from gallery', { fileSize: asset.fileSize });
      }
    } catch (error) {
      logger.error('Gallery error:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Şəkil seçərkən xəta baş verdi' : 'Произошла ошибка при выборе изображения',
      );
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleCategorySelect = (category: any, level: number) => {
    if (level === 0) {
      // Main category selected
      setFormData(prev => ({ ...prev, categoryId: category.id, subcategoryId: 0 }));
      setCategoryPath([category]);
      setSelectedCategoryLevel(1);
    } else if (level === 1) {
      // Subcategory selected
      setFormData(prev => ({ ...prev, subcategoryId: category.id }));
      setCategoryPath(prev => [...prev.slice(0, 1), category]);
      if (category.subcategories && category.subcategories.length > 0) {
        setSelectedCategoryLevel(2);
      } else {
        setShowCategoryModal(false);
        setSelectedCategoryLevel(0);
        setCategoryPath([]);
      }
    } else {
      // Sub-subcategory selected (3-cü səviyyə)
      setFormData(prev => ({ ...prev, subSubcategoryId: category.id }));
      setShowCategoryModal(false);
      setSelectedCategoryLevel(0);
      setCategoryPath([]);
    }
  };

  const handleLocationSelect = (location: any) => {
    setFormData(prev => ({
      ...prev,
      location: location.name,
      locationId: location.id,
    }));
    setShowLocationModal(false);
  };

  const handleCurrencySelect = (currency: string) => {
    setFormData(prev => ({ ...prev, currency }));
    setShowCurrencyModal(false);
  };

  const getCurrentCategories = () => {
    if (selectedCategoryLevel === 0) {
      return categories;
    } else if (selectedCategoryLevel === 1) {
      return categoryPath[0]?.subcategories || [];
    } else {
      return categoryPath[1]?.subcategories || [];
    }
  };

  const handleSave = async () => {
    // ✅ Validate authentication
    if (!isAuthenticated || !currentUser) {
      logger.error('[EditListingScreen] User not authenticated');
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Hesaba daxil olmalısınız' : 'Вы должны войти в систему',
      );
      return;
    }

    // ✅ Validate listing
    if (!listing || !listing.id) {
      logger.error('[EditListingScreen] Invalid listing');
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Elan tapılmadı' : 'Объявление не найдено',
      );
      return;
    }

    // ✅ Check if already saving
    if (isLoading) {
      logger.warn('[EditListingScreen] Save already in progress');
      return;
    }

    // ✅ Validate title (all languages)
    if (!formData.title.az?.trim() || !formData.title.ru?.trim() || !formData.title.en?.trim()) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Bütün dillərdə başlıq daxil edin' : 'Введите заголовок на всех языках',
      );
      return;
    }

    // ✅ Validate title length
    if (formData.title.az.trim().length < 3 || formData.title.az.trim().length > 100) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Başlıq 3-100 simvol arasında olmalıdır' : 'Заголовок должен быть от 3 до 100 символов',
      );
      return;
    }

    // ✅ Validate description (all languages)
    if (!formData.description.az?.trim() || !formData.description.ru?.trim() || !formData.description.en?.trim()) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Bütün dillərdə təsvir daxil edin' : 'Введите описание на всех языках',
      );
      return;
    }

    // ✅ Validate description length
    if (formData.description.az.trim().length < 10 || formData.description.az.trim().length > 2000) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Təsvir 10-2000 simvol arasında olmalıdır' : 'Описание должно быть от 10 до 2000 символов',
      );
      return;
    }

    // ✅ Validate price
    if (!formData.price.trim()) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Qiymət daxil edin' : 'Введите цену',
      );
      return;
    }

    const priceValue = parseFloat(formData.price);
    if (isNaN(priceValue) || !isFinite(priceValue) || priceValue < 0 || priceValue > 1000000) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Düzgün qiymət daxil edin (0-1,000,000)' : 'Введите корректную цену (0-1,000,000)',
      );
      return;
    }

    // ✅ Validate category
    if (!formData.categoryId || formData.categoryId === 0) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Kateqoriya seçin' : 'Выберите категорию',
      );
      return;
    }

    // ✅ Validate location
    if (!formData.locationId || !formData.locationId.trim()) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Yer seçin' : 'Выберите местоположение',
      );
      return;
    }

    // ✅ Validate images
    if (!Array.isArray(formData.images) || formData.images.length === 0) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Ən azı 1 şəkil əlavə edin' : 'Добавьте хотя бы 1 фото',
      );
      return;
    }

    if (formData.images.length > 10) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Maksimum 10 şəkil əlavə edə bilərsiniz' : 'Максимум 10 фото',
      );
      return;
    }

    setIsLoading(true);
    try {
      logger.debug('[EditListingScreen] Saving listing:', listing.id);

      // ✅ Prepare update data
      const updatedListing = {
        ...listing,
        title: {
          az: formData.title.az.trim(),
          ru: formData.title.ru.trim(),
          en: formData.title.en.trim(),
        },
        description: {
          az: formData.description.az.trim(),
          ru: formData.description.ru.trim(),
          en: formData.description.en.trim(),
        },
        price: parseFloat(formData.price),
        currency: formData.currency,
        categoryId: formData.categoryId,
        subcategoryId: formData.subcategoryId,
        subSubcategoryId: formData.subSubcategoryId || undefined,
        location: formData.location,
        images: formData.images,
        condition: formData.condition.trim(),
        deliveryAvailable: formData.deliveryAvailable,
        updatedAt: new Date().toISOString(),
      };

      updateListing(listing.id, updatedListing);

      logger.info('[EditListingScreen] Listing updated successfully:', listing.id);

      Alert.alert(
        language === 'az' ? 'Uğurlu!' : 'Успешно!',
        language === 'az'
          ? `"${formData.title.az.trim()}" elanı yeniləndi`
          : `Объявление "${formData.title.ru.trim()}" обновлено`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
        { cancelable: false },
      );
    } catch (error) {
      logger.error('[EditListingScreen] Error updating listing:', error);

      let errorMessage = language === 'az'
        ? 'Elan yenilənərkən xəta baş verdi'
        : 'Произошла ошибка при обновлении объявления';

      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('tapılmadı')) {
          errorMessage = language === 'az'
            ? 'Elan tapılmadı'
            : 'Объявление не найдено';
        } else if (error.message.includes('permission') || error.message.includes('icazə')) {
          errorMessage = language === 'az'
            ? 'Bu əməliyyat üçün icazəniz yoxdur'
            : 'У вас нет прав для этой операции';
        } else if (error.message.includes('network') || error.message.includes('şəbəkə')) {
          errorMessage = language === 'az'
            ? 'Şəbəkə xətası. Yenidən cəhd edin'
            : 'Ошибка сети. Попробуйте снова';
        }
      }

      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        errorMessage,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.flex}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {language === 'az' ? 'Elanı Redaktə Et' : 'Редактировать объявление'}
            </Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={isLoading}>
              <Save size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Images */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'az' ? 'Şəkillər' : 'Фотографии'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
                {formData.images.map((image, index) => (
                  <View key={index} style={styles.imageItem}>
                    <Image source={{ uri: image }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <X size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addImageButton} onPress={handleImagePicker}>
                  <Camera size={24} color={Colors.textSecondary} />
                  <Text style={styles.addImageText}>
                    {language === 'az' ? 'Şəkil əlavə et' : 'Добавить фото'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Title */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'az' ? 'Başlıq' : 'Заголовок'}
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Azərbaycan dili</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.title.az}
                  onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    title: { ...prev.title, az: text },
                  }))}
                  placeholder={language === 'az' ? 'Elanın başlığını daxil edin' : 'Введите заголовок объявления'}
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Русский язык</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.title.ru}
                  onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    title: { ...prev.title, ru: text },
                  }))}
                  placeholder={language === 'az' ? 'Elanın başlığını daxil edin' : 'Введите заголовок объявления'}
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>English</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.title.en}
                  onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    title: { ...prev.title, en: text },
                  }))}
                  placeholder={language === 'az' ? 'Elanın başlığını daxil edin' : 'Enter listing title'}
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'az' ? 'Təsvir' : 'Описание'}
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Azərbaycan dili</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.description.az}
                  onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    description: { ...prev.description, az: text },
                  }))}
                  placeholder={language === 'az' ? 'Elanın təsvirini daxil edin' : 'Введите описание объявления'}
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Русский язык</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.description.ru}
                  onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    description: { ...prev.description, ru: text },
                  }))}
                  placeholder={language === 'az' ? 'Elanın təsvirini daxil edin' : 'Введите описание объявления'}
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>English</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.description.en}
                  onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    description: { ...prev.description, en: text },
                  }))}
                  placeholder={language === 'az' ? 'Elanın təsvirini daxil edin' : 'Enter listing description'}
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Price */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'az' ? 'Qiymət' : 'Цена'}
              </Text>
              <View style={styles.priceContainer}>
                <DollarSign size={20} color={Colors.primary} />
                <TextInput
                  style={styles.priceInput}
                  value={formData.price}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.currencyButton}
                  onPress={() => setShowCurrencyModal(true)}
                >
                  <Text style={styles.currency}>{formData.currency}</Text>
                  <ChevronDown size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Category */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'az' ? 'Kateqoriya' : 'Категория'}
              </Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowCategoryModal(true)}
              >
                <Tag size={20} color={Colors.primary} />
                <Text style={styles.selectButtonText}>
                  {selectedCategory
                    ? selectedCategory.name[language as keyof typeof selectedCategory.name]
                    : (language === 'az' ? 'Kateqoriya seçin' : 'Выберите категорию')
                  }
                </Text>
                <ChevronDown size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Location */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'az' ? 'Yer' : 'Местоположение'}
              </Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowLocationModal(true)}
              >
                <MapPin size={20} color={Colors.primary} />
                <Text style={styles.selectButtonText}>
                  {selectedLocation
                    ? selectedLocation.name[language as keyof typeof selectedLocation.name]
                    : (language === 'az' ? 'Yer seçin' : 'Выберите местоположение')
                  }
                </Text>
                <ChevronDown size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Condition */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'az' ? 'Vəziyyət' : 'Состояние'}
              </Text>
              <TextInput
                style={styles.textInput}
                value={formData.condition}
                onChangeText={(text) => setFormData(prev => ({ ...prev, condition: text }))}
                placeholder={language === 'az' ? 'Məhsulun vəziyyətini qeyd edin' : 'Укажите состояние товара'}
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            {/* Auto Renewal */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.autoRenewalButton}
                onPress={() => router.push(`/listing/auto-renewal/${listing.id}`)}
              >
                <View style={styles.autoRenewalHeader}>
                  <RefreshCw size={24} color={Colors.primary} />
                  <View style={styles.autoRenewalInfo}>
                    <Text style={styles.autoRenewalTitle}>
                      {language === 'az' ? 'Avtomatik Yeniləmə' : 'Автообновление'}
                    </Text>
                    <Text style={styles.autoRenewalSubtitle}>
                      {listing.autoRenewalEnabled
                        ? (language === 'az' ? 'Aktiv' : 'Активно')
                        : (language === 'az' ? 'Deaktiv' : 'Неактивно')
                      }
                    </Text>
                  </View>
                  <View style={[styles.statusIndicator, {
                    backgroundColor: listing.autoRenewalEnabled ? '#34C759' : '#FF3B30',
                  }]} />
                </View>
                <Text style={styles.autoRenewalDescription}>
                  {language === 'az'
                    ? 'Elanınızın müddəti bitdikdə avtomatik olaraq yenilənməsi üçün tənzimləyin'
                    : 'Настройте автоматическое продление объявления после истечения срока'
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButtonLarge, isLoading && styles.disabledButton]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading && <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />}
              <Text style={styles.saveButtonText}>
                {isLoading
                  ? (language === 'az' ? 'Yadda saxlanılır...' : 'Сохранение...')
                  : (language === 'az' ? 'Dəyişiklikləri Yadda Saxla' : 'Сохранить изменения')
                }
              </Text>
            </TouchableOpacity>
          </View>

          {/* Category Modal */}
          <Modal
            visible={showCategoryModal}
            animationType="slide"
            presentationStyle="pageSheet"
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => {
                  setShowCategoryModal(false);
                  setSelectedCategoryLevel(0);
                  setCategoryPath([]);
                }}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {language === 'az' ? 'Kateqoriya seçin' : 'Выберите категорию'}
                </Text>
                <View style={{ width: 24 }} />
              </View>

              {selectedCategoryLevel > 0 && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    if (selectedCategoryLevel === 1) {
                      setSelectedCategoryLevel(0);
                      setCategoryPath([]);
                    } else {
                      setSelectedCategoryLevel(selectedCategoryLevel - 1);
                      setCategoryPath(prev => prev.slice(0, -1));
                    }
                  }}
                >
                  <ArrowLeft size={20} color={Colors.primary} />
                  <Text style={styles.backButtonText}>
                    {language === 'az' ? 'Geri' : 'Назад'}
                  </Text>
                </TouchableOpacity>
              )}

              <FlatList
                data={getCurrentCategories()}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.categoryItem}
                    onPress={() => handleCategorySelect(item, selectedCategoryLevel)}
                  >
                    <Text style={styles.categoryItemText}>
                      {item.name[language as keyof typeof item.name]}
                    </Text>
                    {item.subcategories && item.subcategories.length > 0 && (
                      <ChevronDown size={16} color={Colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </Modal>

          {/* Location Modal */}
          <Modal
            visible={showLocationModal}
            animationType="slide"
            presentationStyle="pageSheet"
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => {
                  setShowLocationModal(false);
                  setLocationSearchQuery('');
                }}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {language === 'az' ? 'Yer seçin' : 'Выберите местоположение'}
                </Text>
                <View style={{ width: 24 }} />
              </View>

              {/* ✅ Search input */}
              <View style={styles.searchContainer}>
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
                  ? locations.filter(loc => {
                    const nameForLang = loc.name?.[language as keyof typeof loc.name] ?? '';
                    return nameForLang.toLowerCase().includes(locationSearchQuery.toLowerCase());
                  })
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
                      styles.categoryItem,
                      formData.locationId === item.id && styles.selectedCategoryItem,
                    ]}
                    onPress={() => {
                      // ✅ Validate location selection
                      if (!item?.id) {
                        logger.error('[EditListing] Invalid location selected');
                        return;
                      }

                      handleLocationSelect(item);
                      setLocationSearchQuery('');
                      logger.info('[EditListing] Location changed:', item.id);
                    }}
                  >
                    <Text style={[
                      styles.categoryItemText,
                      formData.locationId === item.id && styles.selectedCategoryItemText,
                    ]}>
                      {item.name?.[language as keyof typeof item.name] ?? ''}
                    </Text>
                    {formData.locationId === item.id && (
                      <Text style={styles.selectedIndicator}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </Modal>

          {/* Currency Modal */}
          <Modal
            visible={showCurrencyModal}
            animationType="slide"
            presentationStyle="pageSheet"
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {language === 'az' ? 'Pul vahidi seçin' : 'Выберите валюту'}
                </Text>
                <View style={{ width: 24 }} />
              </View>

              <FlatList
                data={currencies}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.categoryItem}
                    onPress={() => handleCurrencySelect(item)}
                  >
                    <Text style={styles.categoryItemText}>{item}</Text>
                    {formData.currency === item && (
                      <Text style={styles.selectedIndicator}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  saveButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  imagesContainer: {
    flexDirection: 'row',
  },
  imageItem: {
    marginRight: 12,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
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
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 8,
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginRight: 4,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryItemText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  selectedIndicator: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectButtonText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButtonLarge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
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
  },
  autoRenewalButton: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  autoRenewalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  autoRenewalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  autoRenewalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  autoRenewalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  autoRenewalDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  selectedCategoryItem: {
    backgroundColor: Colors.primaryLight || 'rgba(0, 122, 255, 0.1)',
  },
  selectedCategoryItemText: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

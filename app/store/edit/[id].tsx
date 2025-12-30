import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useStoreStore } from '@/store/storeStore';
import { useUserStore } from '@/store/userStore';
import Colors from '@/constants/colors';
// import { logger } from '@/utils/logger';
import {
  ArrowLeft,
  Store,
  Save,
  MapPin,
  Phone,
  Mail,
  Globe,
  MessageCircle,
} from 'lucide-react-native';
import { logger } from '@/utils/logger';
import { validateEmail, validateAzerbaijanPhone, validateWebsiteURL, validateStoreName } from '@/utils/inputValidation';

export default function EditStoreScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useLanguageStore();
  const { stores, editStore } = useStoreStore();
  const { currentUser } = useUserStore();

  const store = stores.find(s => s.id === id);

  const [formData, setFormData] = useState({
    name: '',
    categoryName: '',
    address: '',
    description: '',
    contactInfo: {
      phone: '',
      email: '',
      website: '',
      whatsapp: '',
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // ✅ Warn on back if unsaved changes
  const handleBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        language === 'az' ? 'Yadda saxlanılmamış dəyişikliklər' : 'Несохраненные изменения',
        language === 'az'
          ? 'Dəyişiklikləriniz yadda saxlanılmayıb. Geri qayıtmaq istədiyinizə əminsinizmi?'
          : 'Ваши изменения не сохранены. Вы уверены, что хотите вернуться?',
        [
          { text: language === 'az' ? 'Ləğv et' : 'Отмена', style: 'cancel' },
          {
            text: language === 'az' ? 'Geri qayıt' : 'Вернуться',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ],
      );
    } else {
      router.back();
    }
  };

  useEffect(() => {
    try {
      if (store) {
        // ✅ Validate store data
        if (!store.name || !store.categoryName || !store.address) {
          logger.error('[EditStoreScreen] Invalid store data');
          Alert.alert(
            language === 'az' ? 'Xəta' : 'Ошибка',
            language === 'az' ? 'Mağaza məlumatları düzgün deyil' : 'Данные магазина неверны',
          );
          return;
        }

        // ✅ Null-safe access to contactInfo
        const contactInfo = store.contactInfo || {};

        setFormData({
          name: store.name || '',
          categoryName: store.categoryName || '',
          address: store.address || '',
          description: store.description || '',
          contactInfo: {
            phone: contactInfo.phone || '',
            email: contactInfo.email || '',
            website: contactInfo.website || '',
            whatsapp: contactInfo.whatsapp || '',
          },
        });

        // ✅ Reset unsaved changes flag
        setHasUnsavedChanges(false);
        setValidationErrors({});

        logger.debug('[EditStoreScreen] Store data loaded:', store.id);
      }
    } catch (error) {
      logger.error('[EditStoreScreen] Error loading store data:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Mağaza məlumatlarını yükləyərkən xəta' : 'Ошибка при загрузке данных магазина',
      );
    }
  }, [store, language]);

  const handleSave = async () => {
    // ✅ Validate authentication
    if (!currentUser || !currentUser.id) {
      logger.error('[EditStoreScreen] User not authenticated');
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Hesaba daxil olmalısınız' : 'Вы должны войти в систему',
      );
      return;
    }

    // ✅ Validate store
    if (!store || !store.id) {
      logger.error('[EditStoreScreen] Invalid store');
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Mağaza tapılmadı' : 'Магазин не найден',
      );
      return;
    }

    // ✅ Check if already saving
    if (isLoading) {
      logger.warn('[EditStoreScreen] Save already in progress');
      return;
    }

    // Validation: Store name
    const nameValidation = validateStoreName(formData.name.trim());
    if (!formData.name.trim() || !nameValidation?.isValid) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        (nameValidation && nameValidation.error) || (language === 'az' ? 'Mağaza adı düzgün deyil' : 'Неверное название магазина'),
      );
      return;
    }

    if (formData.name.trim().length < 3) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Mağaza adı ən azı 3 simvol olmalıdır' : 'Название магазина должно быть не менее 3 символов',
      );
      return;
    }

    if (formData.name.trim().length > 50) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Mağaza adı maksimum 50 simvol ola bilər' : 'Название магазина не должно превышать 50 символов',
      );
      return;
    }

    // Validation: Address
    if (!formData.address.trim()) {
      logger.warn('[EditStore] Address is required');
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Ünvan tələb olunur' : 'Адрес обязателен',
      );
      return;
    }

    if (formData.address.trim().length < 5) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Ünvan ən azı 5 simvol olmalıdır' : 'Адрес должен быть не менее 5 символов',
      );
      return;
    }

    // ✅ Validation: Description length if provided
    if (formData.description.trim() && formData.description.trim().length > 1000) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Təsvir maksimum 1000 simvol ola bilər' : 'Описание не должно превышать 1000 символов',
      );
      return;
    }

    // ✅ Validation: Email format if provided (enhanced regex)
    const emailTrimmed = formData.contactInfo.email.trim();
    if (emailTrimmed) {
      // Enhanced email regex
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

      if (!emailRegex.test(emailTrimmed) || emailTrimmed.length > 255) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Düzgün email formatı daxil edin' : 'Введите корректный формат email',
        );
        return;
      }
    }

    // ✅ Validation: Phone number if provided (enhanced)
    const phoneTrimmed = formData.contactInfo.phone.trim();
    if (phoneTrimmed) {
      // Remove non-digit characters for validation
      const phoneDigits = phoneTrimmed.replace(/\D/g, '');

      if (phoneDigits.length < 9 || phoneDigits.length > 15) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Telefon nömrəsi 9-15 rəqəm olmalıdır' : 'Номер телефона должен содержать 9-15 цифр',
        );
        return;
      }
    }

    // ✅ Validation: WhatsApp number if provided (enhanced)
    const whatsappTrimmed = formData.contactInfo.whatsapp.trim();
    if (whatsappTrimmed) {
      // Remove non-digit characters for validation
      const whatsappDigits = whatsappTrimmed.replace(/\D/g, '');

      if (whatsappDigits.length < 9 || whatsappDigits.length > 15) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'WhatsApp nömrəsi 9-15 rəqəm olmalıdır' : 'Номер WhatsApp должен содержать 9-15 цифр',
        );
        return;
      }
    }

    // ✅ Validation: Website URL if provided (enhanced)
    const websiteTrimmed = formData.contactInfo.website.trim();
    if (websiteTrimmed) {
      try {
        const url = new URL(websiteTrimmed);

        // Check protocol
        if (!['http:', 'https:'].includes(url.protocol)) {
          Alert.alert(
            language === 'az' ? 'Xəta' : 'Ошибка',
            language === 'az' ? 'Vebsayt http:// və ya https:// ilə başlamalıdır' : 'Веб-сайт должен начинаться с http:// или https://',
          );
          return;
        }

        // Check URL length
        if (websiteTrimmed.length > 2083) {
          Alert.alert(
            language === 'az' ? 'Xəta' : 'Ошибка',
            language === 'az' ? 'Vebsayt ünvanı çox uzundur' : 'URL веб-сайта слишком длинный',
          );
          return;
        }
      } catch (error) {
        logger.error('[EditStoreScreen] Invalid website URL:', error);
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Düzgün vebsayt ünvanı daxil edin' : 'Введите корректный URL веб-сайта',
        );
        return;
      }
    }

    setIsLoading(true);

    try {
      logger.debug('[EditStoreScreen] Saving store:', store.id);

      // ✅ Prepare update data
      const updateData = {
        name: formData.name.trim(),
        categoryName: formData.categoryName.trim(),
        address: formData.address.trim(),
        description: formData.description.trim(),
        contactInfo: {
          phone: formData.contactInfo.phone.trim() || undefined,
          email: formData.contactInfo.email.trim() || undefined,
          website: formData.contactInfo.website.trim() || undefined,
          whatsapp: formData.contactInfo.whatsapp.trim() || undefined,
        },
      };

      await editStore(store.id, updateData);

      logger.info('[EditStoreScreen] Store updated successfully:', store.id);

      logger.info('[EditStore] Store updated successfully:', store.id);

      Alert.alert(
        language === 'az' ? 'Uğurlu!' : 'Успешно!',
        language === 'az'
          ? `"${formData.name.trim()}" mağazası yeniləndi`
          : `Магазин "${formData.name.trim()}" обновлен`,
        [{
          text: 'OK',
          onPress: () => router.back(),
        }],
        { cancelable: false },
      );
    } catch (error) {
      logger.error('[EditStoreScreen] Error updating store:', error);

      let errorMessage = language === 'az'
        ? 'Mağaza yenilənərkən xəta baş verdi'
        : 'Ошибка при обновлении магазина';

      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('tapılmadı')) {
          errorMessage = language === 'az'
            ? 'Mağaza tapılmadı'
            : 'Магазин не найден';
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

  if (!store) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'az' ? 'Mağazanı redaktə et' : 'Редактировать магазин'}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Store size={64} color={Colors.textSecondary} />
          <Text style={styles.errorTitle}>
            {language === 'az' ? 'Mağaza tapılmadı' : 'Магазин не найден'}
          </Text>
        </View>
      </View>
    );
  }

  if (store.userId !== currentUser?.id) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'az' ? 'Mağazanı redaktə et' : 'Редактировать магазин'}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Store size={64} color={Colors.textSecondary} />
          <Text style={styles.errorTitle}>
            {language === 'az' ? 'İcazə yoxdur' : 'Нет доступа'}
          </Text>
          <Text style={styles.errorDescription}>
            {language === 'az' ? 'Bu mağazanı redaktə etmək icazəniz yoxdur' : 'У вас нет прав для редактирования этого магазина'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'az' ? 'Mağazanı redaktə et' : 'Редактировать магазин'}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveButton}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Save size={24} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Store Basic Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'az' ? 'Əsas məlumatlar' : 'Основная информация'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'Mağaza adı' : 'Название магазина'} *
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    validationErrors.name && styles.textInputError,
                  ]}
                  value={formData.name}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, name: text }));
                    setHasUnsavedChanges(true);

                    // ✅ Real-time validation
                    if (text.trim().length > 0 && text.trim().length < 3) {
                      setValidationErrors(prev => ({
                        ...prev,
                        name: language === 'az' ? 'Minimum 3 simvol' : 'Минимум 3 символа',
                      }));
                    } else {
                      setValidationErrors(prev => {
                        const { name, ...rest } = prev;
                        return rest;
                      });
                    }
                  } }
                  placeholder={language === 'az' ? 'Mağaza adını daxil edin' : 'Введите название магазина'}
                  placeholderTextColor={Colors.textSecondary}
                  maxLength={50}
                  returnKeyType="next"
                  blurOnSubmit={false} />
                {validationErrors.name && (
                  <Text style={styles.errorText}>{validationErrors.name}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'Kateqoriya' : 'Категория'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.categoryName}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, categoryName: text }));
                    setHasUnsavedChanges(true);
                  } }
                  placeholder={language === 'az' ? 'Kateqoriya adını daxil edin' : 'Введите название категории'}
                  placeholderTextColor={Colors.textSecondary}
                  maxLength={50}
                  returnKeyType="next"
                  blurOnSubmit={false} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'Ünvan' : 'Адрес'} *
                </Text>
                <View style={styles.inputWithIcon}>
                  <MapPin size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.textInputWithIcon,
                      validationErrors.address && styles.textInputError,
                    ]}
                    value={formData.address}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, address: text }));
                      setHasUnsavedChanges(true);

                      // ✅ Real-time validation
                      if (text.trim().length > 0 && text.trim().length < 5) {
                        setValidationErrors(prev => ({
                          ...prev,
                          address: language === 'az' ? 'Minimum 5 simvol' : 'Минимум 5 символов',
                        }));
                      } else {
                        setValidationErrors(prev => {
                          const { address, ...rest } = prev;
                          return rest;
                        });
                      }
                    } }
                    placeholder={language === 'az' ? 'Mağaza ünvanını daxil edin' : 'Введите адрес магазина'}
                    placeholderTextColor={Colors.textSecondary}
                    multiline
                    maxLength={200}
                    returnKeyType="next"
                    blurOnSubmit={false} />
                </View>
                {validationErrors.address && (
                  <Text style={styles.errorText}>{validationErrors.address}</Text>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {language === 'az' ? 'Təsvir' : 'Описание'}
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => {
                  setFormData(prev => ({ ...prev, description: text }));
                  setHasUnsavedChanges(true);
                } }
                placeholder={language === 'az' ? 'Mağaza haqqında məlumat' : 'Информация о магазине'}
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={4}
                maxLength={1000}
                returnKeyType="next"
                blurOnSubmit={false} />
              <Text style={styles.charCount}>
                {formData.description.length}/1000 {language === 'az' ? 'simvol' : 'символов'}
              </Text>
            </View>

            {/* Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'az' ? 'Əlaqə məlumatları' : 'Контактная информация'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'Telefon' : 'Телефон'}
                </Text>
                <View style={styles.inputWithIcon}>
                  <Phone size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.textInputWithIcon,
                      validationErrors.phone && styles.textInputError,
                    ]}
                    value={formData.contactInfo.phone}
                    onChangeText={(text) => {
                      const filtered = text.replace(/[^0-9+\-() ]/g, '');
                      setFormData(prev => ({
                        ...prev,
                        contactInfo: { ...prev.contactInfo, phone: filtered },
                      }));
                      setHasUnsavedChanges(true);

                      if (filtered.trim().length > 0) {
                        const phoneDigits = filtered.replace(/\D/g, '');
                        if (phoneDigits.length < 9) {
                          setValidationErrors(prev => ({
                            ...prev,
                            phone: language === 'az' ? 'Minimum 9 rəqəm' : 'Минимум 9 цифр',
                          }));
                        } else {
                          setValidationErrors(prev => {
                            const { phone, ...rest } = prev;
                            return rest;
                          });
                        }
                      } else {
                        setValidationErrors(prev => {
                          const { phone, ...rest } = prev;
                          return rest;
                        });
                      }
                    } }
                    placeholder={language === 'az' ? 'Telefon nömrəsi' : 'Номер телефона'}
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="phone-pad"
                    maxLength={20}
                    returnKeyType="next"
                    blurOnSubmit={false} />
                </View>
                {validationErrors.phone && (
                  <Text style={styles.errorText}>{validationErrors.phone}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'E-poçt' : 'Email'}
                </Text>
                <View style={styles.inputWithIcon}>
                  <Mail size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.textInputWithIcon,
                      validationErrors.email && styles.textInputError,
                    ]}
                    value={formData.contactInfo.email}
                    onChangeText={(text) => {
                      setFormData(prev => ({
                        ...prev,
                        contactInfo: { ...prev.contactInfo, email: text },
                      }));
                      setHasUnsavedChanges(true);

                      if (text.trim().length > 0) {
                        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
                        if (!emailRegex.test(text.trim())) {
                          setValidationErrors(prev => ({
                            ...prev,
                            email: language === 'az' ? 'Düzgün email formatı' : 'Корректный формат email',
                          }));
                        } else {
                          setValidationErrors(prev => {
                            const { email, ...rest } = prev;
                            return rest;
                          });
                        }
                      } else {
                        setValidationErrors(prev => {
                          const { email, ...rest } = prev;
                          return rest;
                        });
                      }
                    } }
                    placeholder={language === 'az' ? 'E-poçt ünvanı' : 'Email адрес'}
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={255}
                    returnKeyType="next"
                    blurOnSubmit={false} />
                </View>
                {validationErrors.email && (
                  <Text style={styles.errorText}>{validationErrors.email}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'Veb sayt' : 'Веб-сайт'}
                </Text>
                <View style={styles.inputWithIcon}>
                  <Globe size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.textInputWithIcon,
                      validationErrors.website && styles.textInputError,
                    ]}
                    value={formData.contactInfo.website}
                    onChangeText={(text) => {
                      setFormData(prev => ({
                        ...prev,
                        contactInfo: { ...prev.contactInfo, website: text },
                      }));
                      setHasUnsavedChanges(true);

                      if (text.trim().length > 0) {
                        if (!text.trim().match(/^https?:\/\/.+/)) {
                          setValidationErrors(prev => ({
                            ...prev,
                            website: language === 'az' ? 'http:// və ya https:// ilə başlamalıdır' : 'Должен начинаться с http:// или https://',
                          }));
                        } else {
                          setValidationErrors(prev => {
                            const { website, ...rest } = prev;
                            return rest;
                          });
                        }
                      } else {
                        setValidationErrors(prev => {
                          const { website, ...rest } = prev;
                          return rest;
                        });
                      }
                    } }
                    placeholder={language === 'az' ? 'Veb sayt ünvanı' : 'Адрес веб-сайта'}
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="url"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={2083}
                    returnKeyType="next"
                    blurOnSubmit={false} />
                </View>
                {validationErrors.website && (
                  <Text style={styles.errorText}>{validationErrors.website}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'WhatsApp' : 'WhatsApp'}
                </Text>
                <View style={styles.inputWithIcon}>
                  <MessageCircle size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.textInputWithIcon,
                      validationErrors.whatsapp && styles.textInputError,
                    ]}
                    value={formData.contactInfo.whatsapp}
                    onChangeText={(text) => {
                      const filtered = text.replace(/[^0-9+\-() ]/g, '');
                      setFormData(prev => ({
                        ...prev,
                        contactInfo: { ...prev.contactInfo, whatsapp: filtered },
                      }));
                      setHasUnsavedChanges(true);

                      if (filtered.trim().length > 0) {
                        const whatsappDigits = filtered.replace(/\D/g, '');
                        if (whatsappDigits.length < 9) {
                          setValidationErrors(prev => ({
                            ...prev,
                            whatsapp: language === 'az' ? 'Minimum 9 rəqəm' : 'Минимум 9 цифр',
                          }));
                        } else {
                          setValidationErrors(prev => {
                            const { whatsapp, ...rest } = prev;
                            return rest;
                          });
                        }
                      } else {
                        setValidationErrors(prev => {
                          const { whatsapp, ...rest } = prev;
                          return rest;
                        });
                      }
                    } }
                    placeholder={language === 'az' ? 'WhatsApp nömrəsi' : 'Номер WhatsApp'}
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="phone-pad"
                    maxLength={20}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss} />
                </View>
                {validationErrors.whatsapp && (
                  <Text style={styles.errorText}>{validationErrors.whatsapp}</Text>
                )}
              </View>

            </View>

            {/* Save Button */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[
                  styles.saveButtonLarge,
                  isLoading && styles.saveButtonDisabled,
                  !hasUnsavedChanges && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={isLoading || !hasUnsavedChanges || Object.keys(validationErrors).length > 0}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Save size={20} color="white" />
                )}
                <Text style={styles.saveButtonText}>
                  {isLoading
                    ? (language === 'az' ? 'Yadda saxlanılır...' : 'Сохранение...')
                    : !hasUnsavedChanges
                      ? (language === 'az' ? 'Dəyişiklik yoxdur' : 'Нет изменений')
                      : (language === 'az' ? 'Dəyişiklikləri yadda saxla' : 'Сохранить изменения')
                  }
                </Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
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
  saveButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
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
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  textInputWithIcon: {
    paddingLeft: 44,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    top: 16,
    zIndex: 1,
  },
  saveButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.textSecondary,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  textInputError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    marginLeft: 4,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
});

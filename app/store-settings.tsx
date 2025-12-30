import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  Platform,
  FlatList,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  Settings,
  Bell,
  Shield,
  CreditCard,
  Users,
  BarChart3,
  Palette,
  Globe,
  MessageSquare,
  Star,
  Clock,
  Package,
  Percent,
  Eye,
  ChevronRight,
  Edit3,
  Trash2,
  RefreshCw,
  Crown,
  Zap,
  Target,
  TrendingUp,
  Calendar,
  DollarSign,
  Gift,
  Store,
  Plus,
  ArrowUpDown,
} from 'lucide-react-native';
import { useStoreStore } from '@/store/storeStore';
import { useUserStore } from '@/store/userStore';
import { useLanguageStore } from '@/store/languageStore';
import { getColors } from '@/constants/colors';
import { useThemeStore } from '@/store/themeStore';
import { validateEmail, validateAzerbaijanPhone, validateWebsiteURL, validateStoreName } from '@/utils/inputValidation';
import { logger } from '@/utils/logger';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<any>;
  type: 'toggle' | 'navigation' | 'action';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  color?: string;
  badge?: string;
}

interface RenewalPackage {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  discount: number;
  duration: number;
  features: string[];
  popular?: boolean;
  urgent?: boolean;
}

const renewalPackages: RenewalPackage[] = [
  {
    id: 'early_renewal',
    name: 'Erkən Yeniləmə',
    description: 'Müddət bitməzdən əvvəl yeniləyin və endirim qazanın',
    originalPrice: 100,
    discountedPrice: 80,
    discount: 20,
    duration: 30,
    features: ['20% endirim', 'Bonus 5 gün', 'Prioritet dəstək', 'Reklam krediti'],
    popular: true,
  },
  {
    id: 'last_minute',
    name: 'Son Dəqiqə Təklifi',
    description: 'Müddət bitməzdən 3 gün əvvəl',
    originalPrice: 100,
    discountedPrice: 90,
    discount: 10,
    duration: 30,
    features: ['10% endirim', 'Dərhal aktivləşmə', 'Məlumat itkisi yoxdur'],
    urgent: true,
  },
  {
    id: 'grace_period',
    name: 'Güzəşt Müddəti Paketi',
    description: 'Güzəşt müddətində yeniləyin (7 gün ərzində)',
    originalPrice: 100,
    discountedPrice: 93,
    discount: 7,
    duration: 30,
    features: ['7% endirim', 'Məlumatlar qorunur', 'Reytinq saxlanılır', 'İzləyicilər qalır'],
  },
  {
    id: 'reactivation',
    name: 'Reaktivasiya Paketi',
    description: 'Deaktiv mağazanı yenidən aktivləşdirin',
    originalPrice: 100,
    discountedPrice: 100,
    discount: 0,
    duration: 30,
    features: ['Bütün məlumatlar bərpa olunur', 'Əvvəlki reytinq qorunur', 'İzləyici bazası bərpa olunur', 'Elan tarixçəsi saxlanılır'],
  },
  {
    id: 'premium_renewal',
    name: 'Premium Yeniləmə',
    description: 'Əlavə xüsusiyyətlərlə yeniləyin',
    originalPrice: 150,
    discountedPrice: 135,
    discount: 10,
    duration: 30,
    features: ['Premium xüsusiyyətlər', 'Prioritet dəstək', 'Analitika plus', 'Reklam krediti 2x'],
  },
];

export default function StoreSettingsScreen() {
  const router = useRouter();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { language } = useLanguageStore();
  const { currentUser } = useUserStore();
  const { themeMode, colorTheme } = useThemeStore();
  const colors = getColors(themeMode, colorTheme);
  const {
    stores,
    getAllUserStores,
    getActiveStoreForUser,
    switchActiveStore,
    getUserStoreSettings,
    updateUserStoreSettings,
    editStore,
    renewStore,
    getExpirationInfo,
    deleteStore,
    reactivateStore,
    canUserCreateNewStore,
    getUserStoreLimit,
  } = useStoreStore();

  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    whatsapp: '',
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get user stores and current store
  const userStores = getAllUserStores(currentUser?.id || '');
  const currentStore = storeId
    ? stores.find(s => s.id === storeId && s.userId === currentUser?.id)
    : getActiveStoreForUser(currentUser?.id || '');

  // Settings state - load from store-specific settings
  const [settings, setSettings] = useState({
    notifications: true,
    autoRenewal: false,
    publicProfile: true,
    showContact: true,
    allowMessages: true,
    showRating: true,
    analyticsSharing: false,
    promotionalEmails: true,
    smsNotifications: false,
    weeklyReports: true,
    listingExpirationNotifications: true,
    autoArchiveExpired: true,
  });

  // Load settings for current store
  useEffect(() => {
    if (currentUser?.id && currentStore?.id) {
      logger.info('[StoreSettings] Loading settings for store:', {
        userId: currentUser.id,
        storeId: currentStore.id,
      });

      const storeSettings = getUserStoreSettings(currentUser.id, currentStore.id);
      setSettings(storeSettings as typeof settings);

      logger.info('[StoreSettings] Settings loaded successfully');
    } else {logger.warn('[StoreSettings] Cannot load settings - missing user or store:', { hasUser: !!currentUser?.id, hasStore: !!currentStore?.id});}
  }, [currentUser?.id, currentStore?.id, getUserStoreSettings]);

  const store = currentStore;
  const expirationInfo = store ? getExpirationInfo(store.id) : null;

  // Handle settings updates
  const handleSettingToggle = async (key: string, value: boolean) => {
    // ✅ VALIDATION START

    // 1. Check if already saving
    if (isSavingSettings) {
      return;
    }

    // 2. Validate key
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      Alert.alert('Xəta', 'Düzgün olmayan tənzimləmə açarı');
      return;
    }

    // 3. Validate value type
    if (typeof value !== 'boolean') {
      Alert.alert('Xəta', 'Düzgün olmayan tənzimləmə dəyəri');
      return;
    }

    // 4. Check authentication
    if (!currentUser || !currentUser.id) {
      Alert.alert('Xəta', 'Daxil olmamısınız');
      return;
    }

    // 5. Check store
    if (!store || !store.id) {
      Alert.alert('Xəta', 'Mağaza tapılmadı');
      return;
    }

    // 6. Check ownership
    if (store.userId !== currentUser.id) {
      Alert.alert(
        'İcazə yoxdur',
        'Siz bu mağazanın tənzimləmələrini dəyişdirə bilməzsiniz',
      );
      return;
    }

    // ✅ VALIDATION END

    // Optimistic update
    const previousSettings = { ...settings };
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    setIsSavingSettings(true);

    try {
      await updateUserStoreSettings(currentUser.id, store.id, { [key]: value });

      // Success (silent - no alert needed for settings toggle)
    } catch (error) {
      // Rollback on error
      setSettings(previousSettings);

      let errorMessage = 'Tənzimləmə yadda saxlanmadı';

      if (error instanceof Error) {
        if (error.message.includes('tapılmadı') || error.message.includes('not found')) {
          errorMessage = 'Mağaza tapılmadı';
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          errorMessage = 'Şəbəkə xətası. Yenidən cəhd edin.';
        } else if (error.message.includes('Invalid')) {
          errorMessage = 'Düzgün olmayan məlumat';
        }
      }

      Alert.alert('Xəta', errorMessage);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleStoreSwitch = async (selectedStoreId: string) => {
    if (!currentUser?.id) {
      logger.error('[StoreSettings] No current user for store switch');
      return;
    }

    if (!selectedStoreId || typeof selectedStoreId !== 'string') {
      logger.error('[StoreSettings] Invalid store ID for switch:', selectedStoreId);
      return;
    }

    logger.info('[StoreSettings] Switching active store:', {
      userId: currentUser.id,
      newStoreId: selectedStoreId,
      currentStoreId: store?.id,
    });

    try {
      await switchActiveStore(currentUser.id, selectedStoreId);

      logger.info('[StoreSettings] Active store switched successfully:', selectedStoreId);
      setShowStoreSelector(false);

      // Reload settings for new store
      const newSettings = getUserStoreSettings(currentUser.id, selectedStoreId);
      setSettings(newSettings as typeof settings);

      logger.info('[StoreSettings] Settings loaded for new store');
    } catch (error) {
      logger.error('[StoreSettings] Failed to switch store:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Mağaza dəyişdirilə bilmədi' : 'Не удалось переключить магазин',
      );
    }
  };

  if (!store) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Mağaza Tənzimləmələri' }} />
        <View style={styles.noStoreContainer}>
          <Store size={64} color={colors.textSecondary} />
          <Text style={[styles.noStoreTitle, { color: colors.text }]}>Mağaza tapılmadı</Text>
          <Text style={[styles.noStoreSubtitle, { color: colors.textSecondary }]}>
            {userStores.length === 0
              ? 'Hələ mağazanız yoxdur. Yeni mağaza yaradın.'
              : 'Bu mağazaya giriş icazəniz yoxdur.'
            }
          </Text>
          {userStores.length === 0 && canUserCreateNewStore(currentUser?.id || '') && (
            <TouchableOpacity
              style={[styles.createStoreButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/store/create')}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={[styles.createStoreButtonText, { color: '#FFFFFF' }]}>Yeni Mağaza Yarat</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const handleEditStore = () => {
    if (!store) {
      logger.error('[StoreSettings] No store for editing');
      return;
    }

    logger.info('[StoreSettings] Opening edit modal:', { storeId: store.id, storeName: store.name });

    setEditForm({
      name: store.name,
      description: store.description || '',
      phone: store.contactInfo.phone || '',
      email: store.contactInfo.email || '',
      website: store.contactInfo.website || '',
      whatsapp: store.contactInfo.whatsapp || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    // ✅ VALIDATION START

    // 1. Check if already saving
    if (isLoading) {
      Alert.alert('Xəta', 'Məlumatlar artıq yadda saxlanılır');
      return;
    }

    // 2. Check authentication
    if (!currentUser || !currentUser.id) {
      Alert.alert('Xəta', 'Daxil olmamısınız');
      return;
    }

    // 3. Check store
    if (!store || !store.id) {
      Alert.alert('Xəta', 'Mağaza tapılmadı');
      return;
    }

    // 4. Check ownership
    if (store.userId !== currentUser.id) {
      Alert.alert(
        'İcazə yoxdur',
        'Siz bu mağazanı redaktə edə bilməzsiniz',
      );
      return;
    }

    // 5. Validate store name
    if (!editForm.name || typeof editForm.name !== 'string') {
      Alert.alert('Xəta', 'Mağaza adı düzgün deyil');
      return;
    }

    const trimmedName = editForm.name.trim();

    if (trimmedName.length === 0) {
      Alert.alert('Xəta', 'Mağaza adı daxil edilməlidir');
      return;
    }

    if (trimmedName.length < 3) {
      Alert.alert('Xəta', 'Mağaza adı ən azı 3 simvol olmalıdır');
      return;
    }

    if (trimmedName.length > 50) {
      Alert.alert('Xəta', 'Mağaza adı maksimum 50 simvol ola bilər');
      return;
    }

    // 6. Validate description
    if (editForm.description && typeof editForm.description === 'string') {
      const trimmedDescription = editForm.description.trim();
      if (trimmedDescription.length > 1000) {
        Alert.alert('Xəta', 'Təsvir maksimum 1000 simvol ola bilər');
        return;
      }
    }

    // 7. Validate email if provided
    if (editForm.email && typeof editForm.email === 'string') {
      const trimmedEmail = editForm.email.trim();
      if (trimmedEmail.length > 0) {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!emailRegex.test(trimmedEmail)) {
          Alert.alert('Xəta', 'Düzgün email formatı daxil edin');
          return;
        }
        if (trimmedEmail.length > 255) {
          Alert.alert('Xəta', 'Email maksimum 255 simvol ola bilər');
          return;
        }
      }
    }

    // 8. Validate phone if provided
    if (editForm.phone && typeof editForm.phone === 'string') {
      const phoneDigits = editForm.phone.replace(/\D/g, '');
      if (phoneDigits.length > 0 && (phoneDigits.length < 9 || phoneDigits.length > 15)) {
        Alert.alert('Xəta', 'Telefon nömrəsi 9-15 rəqəm olmalıdır');
        return;
      }
    }

    // 9. Validate WhatsApp if provided
    if (editForm.whatsapp && typeof editForm.whatsapp === 'string') {
      const whatsappDigits = editForm.whatsapp.replace(/\D/g, '');
      if (whatsappDigits.length > 0 && (whatsappDigits.length < 9 || whatsappDigits.length > 15)) {
        Alert.alert('Xəta', 'WhatsApp nömrəsi 9-15 rəqəm olmalıdır');
        return;
      }
    }

    // 10. Validate website if provided
    if (editForm.website && typeof editForm.website === 'string') {
      const trimmedWebsite = editForm.website.trim();
      if (trimmedWebsite.length > 0) {
        if (!trimmedWebsite.match(/^https?:\/\/.+/)) {
          Alert.alert('Xəta', 'Vebsayt http:// və ya https:// ilə başlamalıdır');
          return;
        }
        try {
          const url = new URL(trimmedWebsite);
          if (!['http:', 'https:'].includes(url.protocol)) {
            Alert.alert('Xəta', 'Yalnız HTTP və ya HTTPS protokolu dəstəklənir');
            return;
          }
          if (trimmedWebsite.length > 2083) {
            Alert.alert('Xəta', 'Vebsayt ünvanı çox uzundur (maks 2083 simvol)');
            return;
          }
        } catch {
          Alert.alert('Xəta', 'Düzgün URL formatı daxil edin');
          return;
        }
      }
    }

    // ✅ VALIDATION END

    setIsLoading(true);

    try {
      logger.info('[StoreSettings] Updating store:', {
        storeId: store.id,
        name: editForm.name.trim(),
        hasEmail: !!editForm.email.trim(),
        hasPhone: !!editForm.phone.trim(),
      });

      await editStore(store.id, {
        name: trimmedName,
        description: editForm.description?.trim() || '',
        contactInfo: {
          ...store.contactInfo,
          phone: editForm.phone?.trim() || undefined,
          email: editForm.email?.trim() || undefined,
          website: editForm.website?.trim() || undefined,
          whatsapp: editForm.whatsapp?.trim() || undefined,
        },
      });

      setShowEditModal(false);
      Alert.alert(
        'Uğurlu',
        `"${trimmedName}" mağazasının məlumatları yeniləndi`,
        [{ text: 'OK' }],
        { cancelable: false },
      );
    } catch (error) {
      let errorMessage = 'Məlumatlar yenilənə bilmədi';

      if (error instanceof Error) {
        if (error.message.includes('tapılmadı') || error.message.includes('not found')) {
          errorMessage = 'Mağaza tapılmadı';
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          errorMessage = 'Şəbəkə xətası. Yenidən cəhd edin.';
        } else if (error.message.includes('Invalid')) {
          errorMessage = 'Düzgün olmayan məlumat';
        }
      }

      Alert.alert('Xəta', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStore = () => {
    // ✅ VALIDATION START

    // 1. Check authentication
    if (!currentUser || !currentUser.id) {
      Alert.alert('Xəta', 'Daxil olmamısınız');
      return;
    }

    // 2. Check store
    if (!store || !store.id) {
      Alert.alert('Xəta', 'Mağaza tapılmadı');
      return;
    }

    // 3. Check ownership
    if (store.userId !== currentUser.id) {
      Alert.alert(
        'İcazə yoxdur',
        'Siz bu mağazanı silə bilməzsiniz. Yalnız öz mağazanızı silə bilərsiniz.',
      );
      return;
    }

    // 4. Check if already being deleted
    if (isLoading) {
      Alert.alert('Xəta', 'Əməliyyat artıq icra olunur');
      return;
    }

    // 5. Check if store is already deleted
    if (store.status === 'archived' || store.archivedAt) {
      Alert.alert('Xəta', 'Mağaza artıq silinib');
      return;
    }

    // ✅ VALIDATION END

    // Get store data for confirmation
    const followersCount = Array.isArray(store.followers) ? store.followers.length : 0;

    // First confirmation
    Alert.alert(
      '⚠️ Mağazanı Sil',
      `"${store.name}" mağazasını silmək istədiyinizə əminsiniz?\n\n⚠️ Bu əməliyyat geri qaytarıla bilməz!\n• Bütün məlumatlar silinəcək\n• ${followersCount} izləyici bildiriş alacaq\n• Mağazaya giriş mümkün olmayacaq`,
      [
        {
          text: 'Ləğv et',
          style: 'cancel',
          onPress: () => logger.info('[StoreSettings] Delete cancelled'),
        },
        {
          text: 'Davam et',
          style: 'destructive',
          onPress: () => {
            // Second confirmation after 300ms
            setTimeout(() => {
              Alert.alert(
                '🔴 SON XƏBƏRDARLIQ',
                `"${store.name}" mağazasını həqiqətən silmək istəyirsiniz?\n\n❌ Bu əməliyyat GERİ QAYTARILA BİLMƏZ!\n\nBu son təsdiqdir. Əminsinizsə, "MƏN ƏMİNƏM" düyməsinə basın.`,
                [
                  { text: 'Ləğv et', style: 'cancel' },
                  {
                    text: 'MƏN ƏMİNƏM',
                    style: 'destructive',
                    onPress: async () => {
                      setIsLoading(true);

                      try {
                        await deleteStore(store.id);

                        Alert.alert(
                          '✅ Uğurlu!',
                          `"${store.name}" mağazası silindi.\n\n${followersCount > 0 ? `${followersCount} izləyiciyə bildiriş göndərildi.\n\n` : ''}Siz indi yeni mağaza yarada bilərsiniz.`,
                          [{ text: 'OK', onPress: () => router.back() }],
                          { cancelable: false },
                        );
                      } catch (error) {
                        let errorMessage = 'Mağaza silinə bilmədi';

                        if (error instanceof Error) {
                          if (error.message.includes('tapılmadı') || error.message.includes('not found')) {
                            errorMessage = 'Mağaza tapılmadı';
                          } else if (error.message.includes('silinib') || error.message.includes('already deleted') || error.message.includes('archived')) {
                            errorMessage = 'Mağaza artıq silinib';
                          } else if (error.message.includes('active listings') || error.message.includes('aktiv elan')) {
                            const match = error.message.match(/(\d+)/);
                            const count = match ? match[1] : '?';
                            errorMessage = `Mağazada ${count} aktiv elan var. Əvvəlcə bütün elanları silməlisiniz.`;
                          } else if (error.message.includes('network') || error.message.includes('timeout')) {
                            errorMessage = 'Şəbəkə xətası. Yenidən cəhd edin.';
                          } else if (error.message.includes('Invalid')) {
                            errorMessage = 'Düzgün olmayan məlumat';
                          }
                        }

                        Alert.alert('Xəta', errorMessage);
                      } finally {
                        setIsLoading(false);
                      }
                    },
                  },
                ],
              );
            }, 300);
          },
        },
      ],
    );
  };

  const handleRenewal = async (packageId: string) => {
    if (!store) {
      logger.error('[StoreSettings] No store for renewal');
      return;
    }

    if (!packageId || typeof packageId !== 'string') {
      logger.error('[StoreSettings] Invalid package ID:', packageId);
      return;
    }

    const renewalPackage = renewalPackages.find(p => p.id === packageId);
    if (!renewalPackage) {
      logger.error('[StoreSettings] Renewal package not found:', packageId);
      return;
    }

    logger.info('[StoreSettings] Initiating renewal:', {
      storeId: store.id,
      packageId,
      packageName: renewalPackage.name,
      price: renewalPackage.discountedPrice,
    });

    try {
      // In a real app, this would handle payment
      await renewStore(store.id, store.plan.id);

      logger.info('[StoreSettings] Store renewed successfully:', store.id);
      setShowRenewalModal(false);

      Alert.alert('Uğurlu', 'Mağaza yeniləndi');
    } catch (error) {
      logger.error('[StoreSettings] Failed to renew store:', error);
      Alert.alert('Xəta', 'Yeniləmə uğursuz oldu');
    }
  };

  const settingsSections = [
    {
      title: 'Ümumi Tənzimləmələr',
      items: [
        {
          id: 'edit_store',
          title: 'Mağazanı Redaktə Et',
          subtitle: 'Ad, təsvir və əlaqə məlumatları',
          icon: Edit3,
          type: 'navigation' as const,
          onPress: handleEditStore,
        },
        {
          id: 'store_theme',
          title: 'Mağaza Görünüşü',
          subtitle: 'Rənglər və dizayn',
          icon: Palette,
          type: 'navigation' as const,
          onPress: () => router.push('/store-theme'),
        },
        {
          id: 'public_profile',
          title: 'Açıq Profil',
          subtitle: 'Mağazanı hamı görə bilsin',
          icon: Globe,
          type: 'toggle' as const,
          value: settings.publicProfile,
          onToggle: (value: boolean) => handleSettingToggle('publicProfile', value),
        },
      ],
    },
    {
      title: 'Əlaqə və Mesajlaşma',
      items: [
        {
          id: 'show_contact',
          title: 'Əlaqə Məlumatlarını Göstər',
          subtitle: 'Telefon və email görünsün',
          icon: MessageSquare,
          type: 'toggle' as const,
          value: settings.showContact,
          onToggle: (value: boolean) => handleSettingToggle('showContact', value),
        },
        {
          id: 'allow_messages',
          title: 'Mesajlara İcazə Ver',
          subtitle: 'İstifadəçilər mesaj göndərə bilsin',
          icon: MessageSquare,
          type: 'toggle' as const,
          value: settings.allowMessages,
          onToggle: (value: boolean) => handleSettingToggle('allowMessages', value),
        },
      ],
    },
    {
      title: 'Bildirişlər',
      items: [
        {
          id: 'notifications',
          title: 'Push Bildirişləri',
          subtitle: 'Yeni mesaj və sifarişlər',
          icon: Bell,
          type: 'toggle' as const,
          value: settings.notifications,
          onToggle: (value: boolean) => handleSettingToggle('notifications', value),
        },
        {
          id: 'sms_notifications',
          title: 'SMS Bildirişləri',
          subtitle: 'Vacib məlumatlar SMS ilə',
          icon: MessageSquare,
          type: 'toggle' as const,
          value: settings.smsNotifications,
          onToggle: (value: boolean) => handleSettingToggle('smsNotifications', value),
        },
        {
          id: 'promotional_emails',
          title: 'Reklam Emailləri',
          subtitle: 'Yeni xüsusiyyətlər və təkliflər',
          icon: Gift,
          type: 'toggle' as const,
          value: settings.promotionalEmails,
          onToggle: (value: boolean) => handleSettingToggle('promotionalEmails', value),
        },
      ],
    },
    {
      title: 'Analitika və Hesabatlar',
      items: [
        {
          id: 'analytics',
          title: 'Mağaza Analitikası',
          subtitle: 'Satış və ziyarətçi statistikaları',
          icon: BarChart3,
          type: 'navigation' as const,
          onPress: () => router.push('/store-analytics'),
        },
        {
          id: 'weekly_reports',
          title: 'Həftəlik Hesabatlar',
          subtitle: 'Email ilə həftəlik məlumat',
          icon: Calendar,
          type: 'toggle' as const,
          value: settings.weeklyReports,
          onToggle: (value: boolean) => handleSettingToggle('weeklyReports', value),
        },
        {
          id: 'analytics_sharing',
          title: 'Analitika Paylaşımı',
          subtitle: 'Anonim məlumat paylaşımı',
          icon: TrendingUp,
          type: 'toggle' as const,
          value: settings.analyticsSharing,
          onToggle: (value: boolean) => handleSettingToggle('analyticsSharing', value),
        },
      ],
    },
    {
      title: 'Reytinq və Rəylər',
      items: [
        {
          id: 'show_rating',
          title: 'Reytinqi Göstər',
          subtitle: 'Mağaza reytinqi görünsün',
          icon: Star,
          type: 'toggle' as const,
          value: settings.showRating,
          onToggle: (value: boolean) => handleSettingToggle('showRating', value),
        },
        {
          id: 'manage_reviews',
          title: 'Rəyləri İdarə Et',
          subtitle: 'Müştəri rəylərini cavabla',
          icon: MessageSquare,
          type: 'navigation' as const,
          onPress: () => router.push('/store-reviews'),
        },
      ],
    },
    {
      title: 'Mağaza Müddəti və Yeniləmə',
      items: [
        {
          id: 'expiration_status',
          title: 'Müddət Vəziyyəti',
          subtitle: expirationInfo ? expirationInfo.nextAction : 'Məlumat yüklənir...',
          icon: Clock,
          type: 'navigation' as const,
          onPress: () => setShowRenewalModal(true),
          badge: expirationInfo?.daysUntilExpiration && expirationInfo.daysUntilExpiration <= 7 ? 'Diqqət!' : undefined,
        },
        {
          id: 'renewal_packages',
          title: 'Güzəştli Yeniləmə Paketləri',
          subtitle: 'Erkən yeniləmə və xüsusi təkliflər',
          icon: Package,
          type: 'navigation' as const,
          onPress: () => setShowRenewalModal(true),
          badge: expirationInfo?.daysUntilExpiration && expirationInfo.daysUntilExpiration <= 7 ? 'Tezliklə bitir' : undefined,
        },
        {
          id: 'auto_renewal',
          title: 'Avtomatik Yeniləmə',
          subtitle: 'Müddət bitəndə avtomatik yenilənsin',
          icon: RefreshCw,
          type: 'toggle' as const,
          value: settings.autoRenewal,
          onToggle: (value: boolean) => handleSettingToggle('autoRenewal', value),
        },
        {
          id: 'grace_period_settings',
          title: 'Güzəşt Müddəti Tənzimləmələri',
          subtitle: 'Müddət bitdikdən sonra məlumatların qorunması',
          icon: Calendar,
          type: 'navigation' as const,
          onPress: () => {
            Alert.alert(
              'Güzəşt Müddəti',
              'Mağaza müddəti bitdikdən sonra 7 gün ərzində məlumatlarınız qorunur və güzəştli qiymətə yeniləyə bilərsiniz.',
              [{ text: 'Anladım', style: 'default' }],
            );
          },
        },
      ],
    },
    {
      title: 'Elan Müddəti İdarəetməsi',
      items: [
        {
          id: 'listing_expiration_notifications',
          title: 'Elan Müddəti Bildirişləri',
          subtitle: 'Elanların müddəti bitməzdən bildiriş al',
          icon: Bell,
          type: 'toggle' as const,
          value: settings.listingExpirationNotifications,
          onToggle: (value: boolean) => handleSettingToggle('listingExpirationNotifications', value),
        },
        {
          id: 'auto_archive_expired',
          title: 'Avtomatik Arxivləmə',
          subtitle: 'Müddəti bitmiş elanları avtomatik arxivə köçür',
          icon: Package,
          type: 'toggle' as const,
          value: settings.autoArchiveExpired,
          onToggle: (value: boolean) => handleSettingToggle('autoArchiveExpired', value),
        },
        {
          id: 'listing_renewal_offers',
          title: 'Elan Yeniləmə Təklifləri',
          subtitle: 'Müddəti bitən elanlar üçün güzəştli yeniləmə təklifləri',
          icon: Percent,
          type: 'navigation' as const,
          onPress: () => {
            Alert.alert(
              'Elan Yeniləmə Təklifləri',
              'Elanlarınızın müddəti bitdikdə:\n\n• 7 gün əvvəl: 15% endirim\n• 3 gün əvvəl: 10% endirim\n• Müddət bitdikdən sonra 7 gün: 5% endirim\n• Toplu yeniləmə: 20% endirim',
              [{ text: 'Anladım', style: 'default' }],
            );
          },
        },
        {
          id: 'expired_listing_management',
          title: 'Müddəti Bitmiş Elanlar',
          subtitle: 'Arxivlənmiş elanları idarə et və yenidən aktivləşdir',
          icon: RefreshCw,
          type: 'navigation' as const,
          onPress: () => {
            Alert.alert(
              'Müddəti Bitmiş Elanlar',
              'Müddəti bitmiş elanlarınız:\n\n• 30 gün arxivdə qalır\n• Bu müddətdə yenidən aktivləşdirə bilərsiniz\n• Bütün məlumatlar və şəkillər qorunur\n• Baxış sayı və favoritlər saxlanılır',
              [
                { text: 'Arxivi Gör', onPress: () => router.push('/my-listings?filter=expired') },
                { text: 'Anladım', style: 'cancel' },
              ],
            );
          },
        },
      ],
    },
    {
      title: 'Abunəlik və Ödəniş',
      items: [
        {
          id: 'payment_history',
          title: 'Ödəniş Tarixçəsi',
          subtitle: 'Keçmiş ödənişləri görün',
          icon: CreditCard,
          type: 'navigation' as const,
          onPress: () => router.push('/payment-history'),
        },
      ],
    },
    {
      title: 'Təhlükəsizlik',
      items: [
        {
          id: 'privacy_settings',
          title: 'Məxfilik Tənzimləmələri',
          subtitle: 'Məlumat təhlükəsizliyi',
          icon: Shield,
          type: 'navigation' as const,
          onPress: () => router.push('/settings'),
        },
        {
          id: 'blocked_users',
          title: 'Bloklanmış İstifadəçilər',
          subtitle: 'Bloklanmış istifadəçiləri idarə et',
          icon: Users,
          type: 'navigation' as const,
          onPress: () => router.push('/blocked-users'),
        },
      ],
    },
    {
      title: 'Təhlükəli Əməliyyatlar',
      items: [
        {
          id: 'delete_store',
          title: 'Mağazanı Sil',
          subtitle: 'Bütün məlumatlar silinəcək',
          icon: Trash2,
          type: 'action' as const,
          onPress: handleDeleteStore,
          color: colors.error,
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.settingItem, { borderBottomColor: colors.border }]}
        onPress={item.onPress}
        disabled={item.type === 'toggle'}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.iconContainer, { backgroundColor: item.color ? `${item.color}20` : `${colors.primary}20` }]}>
            <item.icon size={20} color={item.color || colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: item.color || colors.text }]}>
              {item.title}
            </Text>
            {item.subtitle && (
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
            )}
          </View>
        </View>
        <View style={styles.settingRight}>
          {item.badge && (
            <View style={[styles.badge, { backgroundColor: colors.error }]}>
              <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>{item.badge}</Text>
            </View>
          )}
          {item.type === 'toggle' && item.onToggle && (
            <Switch
              value={item.value}
              onValueChange={item.onToggle}
              trackColor={{ false: colors.border, true: `${colors.primary}40` }}
              thumbColor={item.value ? colors.primary : colors.textSecondary}
            />
          )}
          {item.type === 'navigation' && (
            <ChevronRight size={20} color={colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderRenewalPackage = (pkg: RenewalPackage) => {
    return (
      <TouchableOpacity
        key={pkg.id}
        style={[
          styles.renewalPackage,
          { backgroundColor: colors.card, borderColor: colors.border },
          pkg.popular && [styles.popularPackage, { borderColor: colors.primary }],
          pkg.urgent && [styles.urgentPackage, { borderColor: colors.warning }],
        ]}
        onPress={() => handleRenewal(pkg.id)}
      >
        {pkg.popular && (
          <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
            <Crown size={16} color="#FFFFFF" />
            <Text style={[styles.popularText, { color: '#FFFFFF' }]}>Populyar</Text>
          </View>
        )}
        {pkg.urgent && (
          <View style={[styles.urgentBadge, { backgroundColor: colors.warning }]}>
            <Zap size={16} color="#FFFFFF" />
            <Text style={[styles.urgentText, { color: '#FFFFFF' }]}>Təcili</Text>
          </View>
        )}

        <Text style={[styles.packageName, { color: colors.text }]}>{pkg.name}</Text>
        <Text style={[styles.packageDescription, { color: colors.textSecondary }]}>{pkg.description}</Text>

        <View style={styles.priceContainer}>
          {pkg.discount > 0 && (
            <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>{pkg.originalPrice} AZN</Text>
          )}
          <Text style={[styles.discountedPrice, { color: colors.primary }]}>{pkg.discountedPrice} AZN</Text>
          {pkg.discount > 0 && (
            <View style={[styles.discountBadge, { backgroundColor: colors.success }]}>
              <Text style={[styles.discountText, { color: '#FFFFFF' }]}>-{pkg.discount}%</Text>
            </View>
          )}
        </View>

        <View style={styles.featuresContainer}>
          {pkg.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={[styles.featureText, { color: colors.text }]}>• {feature}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Mağaza Tənzimləmələri',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Multi-Store Selector */}
        {userStores.length > 1 && (
          <View style={[styles.storeSelectorCard, { backgroundColor: colors.card }]}>
            <View style={styles.storeSelectorHeader}>
              <Text style={[styles.storeSelectorTitle, { color: colors.text }]}>Aktiv Mağaza</Text>
              <Text style={[styles.storeSelectorSubtitle, { color: colors.textSecondary }]}>
                {userStores.length} mağazadan {getUserStoreLimit(currentUser?.id || '')} limit
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.currentStoreButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setShowStoreSelector(true)}
            >
              <View style={styles.currentStoreInfo}>
                <Text style={[styles.currentStoreName, { color: colors.text }]}>{store.name}</Text>
                <Text style={[styles.currentStoreStatus, {
                  color: store.status === 'active' ? colors.success :
                    store.status === 'grace_period' ? colors.warning : colors.error,
                }]}>
                  {store.status === 'active' ? 'Aktiv' :
                    store.status === 'grace_period' ? 'Güzəşt müddəti' : 'Qeyri-aktiv'}
                </Text>
              </View>
              <ArrowUpDown size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {canUserCreateNewStore(currentUser?.id || '') && (
              <TouchableOpacity
                style={[styles.addStoreButton, { borderColor: colors.primary }]}
                onPress={() => router.push('/store/create')}
              >
                <Plus size={16} color={colors.primary} />
                <Text style={[styles.addStoreButtonText, { color: colors.primary }]}>Yeni Mağaza Əlavə Et</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Store Status Card */}
        <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
          <View style={styles.statusHeader}>
            <Text style={[styles.storeName, { color: colors.text }]}>{store.name}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: store.status === 'active' ? colors.success : colors.warning },
            ]}>
              <Text style={[styles.statusText, { color: '#FFFFFF' }]}>
                {store.status === 'active' ? 'Aktiv' : 'Qeyri-aktiv'}
              </Text>
            </View>
          </View>

          {expirationInfo && (
            <View style={styles.expirationInfo}>
              <Clock size={16} color={expirationInfo.daysUntilExpiration && expirationInfo.daysUntilExpiration <= 7 ? colors.warning : colors.textSecondary} />
              <Text style={[styles.expirationText, {
                color: expirationInfo.daysUntilExpiration && expirationInfo.daysUntilExpiration <= 7 ? colors.warning : colors.textSecondary,
              }]}>
                {expirationInfo.nextAction}
              </Text>
              {expirationInfo.daysUntilExpiration && expirationInfo.daysUntilExpiration <= 7 && (
                <TouchableOpacity
                  style={[styles.urgentButton, { backgroundColor: colors.warning }]}
                  onPress={() => setShowRenewalModal(true)}
                >
                  <Text style={[styles.urgentButtonText, { color: colors.card }]}>Yenilə</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={[styles.storeStats, { borderTopColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{store.adsUsed}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Elanlar</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{store.followers.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>İzləyici</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{(store.rating / Math.max(store.totalRatings, 1)).toFixed(1)}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Reytinq</Text>
            </View>
          </View>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {section.items.map(renderSettingItem)}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Renewal Packages Modal */}
      <Modal
        visible={showRenewalModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Yeniləmə Paketləri</Text>
            <TouchableOpacity
              onPress={() => setShowRenewalModal(false)}
              style={styles.closeButton}
            >
              <Text style={[styles.closeButtonText, { color: colors.primary }]}>Bağla</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {renewalPackages.map(renderRenewalPackage)}
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Store Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Mağazanı Redaktə Et</Text>
            <TouchableOpacity
              onPress={() => setShowEditModal(false)}
              style={styles.closeButton}
            >
              <Text style={[styles.closeButtonText, { color: colors.primary }]}>Ləğv et</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Mağaza Adı</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={editForm.name}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                placeholder="Mağaza adını daxil edin"
                placeholderTextColor={colors.placeholder}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Təsvir</Text>
              <TextInput
                style={[styles.formInput, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={editForm.description}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, description: text }))}
                placeholder="Mağaza təsvirini daxil edin"
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Telefon</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={editForm.phone}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
                placeholder="+994501234567"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={editForm.email}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, email: text }))}
                placeholder="info@magaza.az"
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Vebsayt</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={editForm.website}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, website: text }))}
                placeholder="https://magaza.az"
                placeholderTextColor={colors.placeholder}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>WhatsApp</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={editForm.whatsapp}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, whatsapp: text }))}
                placeholder="+994501234567"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveEdit}
            >
              <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>Yadda Saxla</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Store Selector Modal */}
      <Modal
        visible={showStoreSelector}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Mağaza Seçin</Text>
            <TouchableOpacity
              onPress={() => setShowStoreSelector(false)}
              style={styles.closeButton}
            >
              <Text style={[styles.closeButtonText, { color: colors.primary }]}>Bağla</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={userStores}
            keyExtractor={(item) => item.id}
            style={styles.storeList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.storeListItem,
                  { backgroundColor: colors.card, borderBottomColor: colors.border },
                  item.id === store.id && { backgroundColor: `${colors.primary}10` },
                ]}
                onPress={() => handleStoreSwitch(item.id)}
              >
                <View style={styles.storeListItemContent}>
                  <View style={styles.storeListItemInfo}>
                    <Text style={[styles.storeListItemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.storeListItemDetails, { color: colors.textSecondary }]}>
                      {item.adsUsed}/{item.maxAds} elan • {item.followers.length} izləyici
                    </Text>
                  </View>
                  <View style={styles.storeListItemRight}>
                    <View style={[
                      styles.storeListItemStatus,
                      {
                        backgroundColor:
                          item.status === 'active' ? colors.success :
                            item.status === 'grace_period' ? colors.warning : colors.error,
                      },
                    ]}>
                      <Text style={[styles.storeListItemStatusText, { color: '#FFFFFF' }]}>
                        {item.status === 'active' ? 'Aktiv' :
                          item.status === 'grace_period' ? 'Güzəşt' : 'Qeyri-aktiv'}
                      </Text>
                    </View>
                    {item.id === store.id && (
                      <View style={[styles.currentStoreIndicator, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  statusCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeName: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  expirationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  expirationText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  urgentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  urgentButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  storeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionContent: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  settingSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  renewalPackage: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    position: 'relative',
  },
  popularPackage: {
    borderWidth: 2,
  },
  urgentPackage: {
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginLeft: 4,
  },
  urgentBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgentText: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginLeft: 4,
  },
  packageName: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginBottom: 8,
  },
  packageDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  originalPrice: {
    fontSize: 16,
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountedPrice: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginRight: 8,
  },
  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  featuresContainer: {
    marginTop: 8,
  },
  featureItem: {
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  // No store styles
  noStoreContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noStoreTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  noStoreSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  createStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createStoreButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  // Multi-store selector styles
  storeSelectorCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  storeSelectorHeader: {
    marginBottom: 12,
  },
  storeSelectorTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  storeSelectorSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  currentStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  currentStoreInfo: {
    flex: 1,
  },
  currentStoreName: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  currentStoreStatus: {
    fontSize: 14,
    marginTop: 2,
  },
  addStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addStoreButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginLeft: 8,
  },
  // Store list modal styles
  storeList: {
    flex: 1,
  },
  storeListItem: {
    borderBottomWidth: 1,
  },
  storeListItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  storeListItemInfo: {
    flex: 1,
  },
  storeListItemName: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  storeListItemDetails: {
    fontSize: 14,
    marginTop: 4,
  },
  storeListItemRight: {
    alignItems: 'flex-end',
  },
  storeListItemStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  storeListItemStatusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  currentStoreIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Animated, Dimensions, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore, ThemeMode, ColorTheme, FontSize } from '@/store/themeStore';
import { useUserStore } from '@/store/userStore';
import { useCallStore } from '@/store/callStore';
import { getColors } from '@/constants/colors';
import { logger } from '@/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '@/services/notificationService';
import * as FileSystem from 'expo-file-system';
import { LucideIcon } from 'lucide-react-native';
import {
  Moon,
  Sun,
  Palette,
  Type,
  Bell,
  Volume2,
  Vibrate,
  RefreshCw,
  Eye,
  Layout,
  Globe,
  Shield,
  HelpCircle,
  Info,
  ChevronRight,
  Zap,
  Sparkles,
  Monitor,
  Smartphone,
  Download,
  Upload,
  Database,
  Trash2,
  RotateCcw,
  Settings2,
  Sliders,
  Phone,
  MessageSquare,
  EyeOff,
  Star,
  Heart,
  Flame,
  Crown,
  Mail,
  Rocket,
  UserX,
  FileText,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguageStore();
  const { currentUser, updatePrivacySettings, blockedUsers } = useUserStore();
  const { simulateIncomingCall } = useCallStore();
  const {
    themeMode,
    colorTheme,
    fontSize,
    notificationsEnabled,
    soundEnabled,
    vibrationEnabled,
    autoRefresh,
    showPriceInTitle,
    compactMode,
    animationEffectsEnabled,
    dynamicColorsEnabled,
    adaptiveInterfaceEnabled,
    setThemeMode,
    setColorTheme,
    setFontSize,
    setNotificationsEnabled,
    setSoundEnabled,
    setVibrationEnabled,
    setAutoRefresh,
    setShowPriceInTitle,
    setCompactMode,
    setAnimationEffectsEnabled,
    setDynamicColorsEnabled,
    setAdaptiveInterfaceEnabled,
    sendNotification,
    playNotificationSound,
    triggerVibration,
  } = useThemeStore();

  const colors = getColors(themeMode, colorTheme);
  const [headerAnimation] = useState(new Animated.Value(0));
  const [sectionAnimations] = useState(Array.from({ length: 8 }, () => new Animated.Value(0)));
  const [pulseAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    // Header animation
    Animated.timing(headerAnimation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Staggered section animations
    const animations = sectionAnimations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
    );

    Animated.stagger(100, animations).start();

    // Pulse animation for premium features
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, []);

  const themeModes: { key: ThemeMode; label: string; labelRu: string; icon: LucideIcon }[] = [
    { key: 'light', label: 'İşıqlı', labelRu: 'Светлая', icon: Sun },
    { key: 'dark', label: 'Qaranlıq', labelRu: 'Темная', icon: Moon },
    { key: 'auto', label: 'Avtomatik', labelRu: 'Автоматическая', icon: RefreshCw },
  ];

  const colorThemes: { key: ColorTheme; label: string; color: string }[] = [
    { key: 'default', label: 'Standart', color: '#0E7490' },
    { key: 'blue', label: 'Mavi', color: '#3B82F6' },
    { key: 'green', label: 'Yaşıl', color: '#10B981' },
    { key: 'purple', label: 'Bənövşəyi', color: '#8B5CF6' },
    { key: 'orange', label: 'Narıncı', color: '#F97316' },
    { key: 'red', label: 'Qırmızı', color: '#EF4444' },
  ];

  const fontSizes: { key: FontSize; label: string; labelRu: string }[] = [
    { key: 'small', label: 'Kiçik', labelRu: 'Маленький' },
    { key: 'medium', label: 'Orta', labelRu: 'Средний' },
    { key: 'large', label: 'Böyük', labelRu: 'Большой' },
  ];

  const handleThemeModeSelect = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const handleColorThemeSelect = (theme: ColorTheme) => {
    setColorTheme(theme);
  };

  const handleFontSizeSelect = (size: FontSize) => {
    setFontSize(size);
  };

  const handleLanguageSelect = () => {
    Alert.alert(
      language === 'az' ? 'Dil seçin' : 'Выберите язык',
      '',
      [
        {
          text: 'Azərbaycan',
          onPress: () => setLanguage('az'),
        },
        {
          text: 'Русский',
          onPress: () => setLanguage('ru'),
        },
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
      ],
    );
  };

  const testNotification = async () => {
    try {
      await sendNotification(
        language === 'az' ? 'Test bildirişi' : 'Тестовое уведомление',
        language === 'az' ? 'Bu bir test bildirişidir' : 'Это тестовое уведомление',
      );

      // Show confirmation alert
      Alert.alert(
        language === 'az' ? 'Uğurlu' : 'Успешно',
        language === 'az' ? 'Test bildirişi göndərildi' : 'Тестовое уведомление отправлено',
      );
    } catch (error) {
      logger.error('Test notification failed:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Bildiriş göndərilə bilmədi' : 'Не удалось отправить уведомление',
      );
    }
  };

  const testSound = async () => {
    try {
      await playNotificationSound();
      Alert.alert(
        language === 'az' ? 'Test səsi' : 'Тестовый звук',
        language === 'az' ? 'Səs testi tamamlandı' : 'Тест звука завершен',
      );
    } catch (error) {
      logger.error('Test sound failed:', error);
      // Sound test failed silently
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Səs testi uğursuz oldu' : 'Тест звука не удался',
      );
    }
  };

  const testVibration = async () => {
    try {
      await triggerVibration();
      Alert.alert(
        language === 'az' ? 'Test vibrasiyas' : 'Тестовая вибрация',
        language === 'az' ? 'Vibrasiya testi tamamlandı' : 'Тест вибрации завершен',
      );
    } catch (error) {
      logger.error('Test vibration failed:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Vibrasiya testi uğursuz oldu' : 'Тест вибрации не удался',
      );
    }
  };

  const clearCache = () => {
    Alert.alert(
      language === 'az' ? 'Keşi təmizlə' : 'Очистить кэш',
      language === 'az' ? 'Tətbiq keşi təmizlənsin?' : 'Очистить кэш приложения?',
      [
        {
          text: language === 'az' ? 'Təmizlə' : 'Очистить',
          onPress: async () => {
            try {
              // Clear AsyncStorage cache (except user settings)
              const keys = await AsyncStorage.getAllKeys();
              const cacheKeys = keys.filter(key =>
                key.includes('cache') ||
                key.includes('temp') ||
                key.includes('listing') ||
                key.includes('image'),
              );

              if (cacheKeys.length > 0) {
                await AsyncStorage.multiRemove(cacheKeys);
                logger.info(`Cleared ${cacheKeys.length} cache items from AsyncStorage`);
              }

              // Clear file system cache if available
              if (Platform.OS !== 'web' && FileSystem.cacheDirectory) {
                try {
                  const cacheDir = FileSystem.cacheDirectory;
                  const files = await FileSystem.readDirectoryAsync(cacheDir);

                  // Delete cache files
                  for (const file of files) {
                    try {
                      await FileSystem.deleteAsync(`${cacheDir}${file}`, { idempotent: true });
                    } catch (deleteError) {
                      logger.debug(`Could not delete cache file: ${file}`);
                    }
                  }

                  logger.info(`Cleared ${files.length} files from cache directory`);
                } catch (fsError) {
                  logger.debug('File system cache clearing not available:', fsError);
                }
              }

              Alert.alert(
                language === 'az' ? 'Uğurlu' : 'Успешно',
                language === 'az' ? 'Keş təmizləndi' : 'Кэш очищен',
              );
            } catch (error) {
              logger.error('Failed to clear cache:', error);
              Alert.alert(
                language === 'az' ? 'Xəta' : 'Ошибка',
                language === 'az' ? 'Keş təmizlənərkən xəta baş verdi' : 'Ошибка при очистке кэша',
              );
            }
          },
        },
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
      ],
    );
  };

  const resetSettings = () => {
    Alert.alert(
      language === 'az' ? 'Tənzimləmələri sıfırla' : 'Сбросить настройки',
      language === 'az' ? 'Bütün tənzimləmələr standart vəziyyətə qaytarılacaq' : 'Все настройки будут сброшены к значениям по умолчанию',
      [
        {
          text: language === 'az' ? 'Sıfırla' : 'Сбросить',
          style: 'destructive',
          onPress: () => {
            setThemeMode('auto');
            setColorTheme('default');
            setFontSize('medium');
            setNotificationsEnabled(true);
            setSoundEnabled(true);
            setVibrationEnabled(true);
            setAutoRefresh(true);
            setShowPriceInTitle(true);
            setCompactMode(false);
            setAnimationEffectsEnabled(true);
            setDynamicColorsEnabled(true);
            setAdaptiveInterfaceEnabled(true);
            Alert.alert(
              language === 'az' ? 'Uğurlu' : 'Успешно',
              language === 'az' ? 'Tənzimləmələr sıfırlandı' : 'Настройки сброшены',
            );
          },
        },
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
      ],
    );
  };

  // ✅ Handle notification permission toggle
  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      // Request permission when enabling
      try {
        const hasPermission = await notificationService.requestPermissions();
        if (hasPermission) {
          setNotificationsEnabled(true);
          logger.debug('Notifications enabled');
        } else {
          Alert.alert(
            language === 'az' ? 'İcazə lazımdır' : 'Требуется разрешение',
            language === 'az'
              ? 'Bildirişlər üçün icazə verilməlidir. Tənzimləmələrdən icazə verə bilərsiniz.'
              : 'Необходимо разрешение для уведомлений. Вы можете предоставить его в настройках.',
          );
        }
      } catch (error) {
        logger.error('Notification permission error:', error);
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'İcazə alınarkən xəta baş verdi' : 'Ошибка при запросе разрешения',
        );
      }
    } else {
      // Just disable
      setNotificationsEnabled(false);
    }
  };

  const SettingItem = ({
    icon: Icon,
    title,
    subtitle,
    onPress,
    rightComponent,
    isPremium = false,
    isNew = false,
    gradient = false,
  }: {
    icon: React.ComponentType<any>;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    isPremium?: boolean;
    isNew?: boolean;
    gradient?: boolean;
  }) => {
    const [pressAnimation] = useState(new Animated.Value(1));

    const handlePressIn = () => {
      Animated.spring(pressAnimation, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(pressAnimation, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    const iconBackgroundColor = gradient
      ? colors.primary
      : isPremium
        ? '#FFD700'
        : `${colors.primary}20`;

    const iconColor = gradient || isPremium ? '#fff' : colors.primary;

    return (
      <Animated.View style={{ transform: [{ scale: pressAnimation }] }}>
        <TouchableOpacity
          style={[
            styles.settingItem,
            isPremium && styles.premiumItem,
            gradient && [styles.gradientItem, { backgroundColor: colors.primary }],
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
        >
          <View style={[
            styles.iconContainer,
            { backgroundColor: iconBackgroundColor },
            isPremium && styles.premiumIconContainer,
            gradient && styles.gradientIconContainer,
          ]}>
            <Icon size={20} color={iconColor} />
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Crown size={10} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.settingContent}>
            <View style={styles.titleRow}>
              <Text style={[
                styles.settingTitle,
                { color: gradient ? '#fff' : colors.text },
                isPremium && styles.premiumTitle,
              ]}>
                {title}
              </Text>
              {isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>YENİ</Text>
                </View>
              )}
            </View>
            {subtitle && (
              <Text style={[
                styles.settingSubtitle,
                { color: gradient ? 'rgba(255,255,255,0.8)' : colors.textSecondary },
              ]}>
                {subtitle}
              </Text>
            )}
          </View>
          {rightComponent || (
            <ChevronRight
              size={20}
              color={gradient ? 'rgba(255,255,255,0.8)' : colors.textSecondary}
            />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const SectionHeader = ({ title, icon: Icon, gradient = false }: {
    title: string;
    icon?: any;
    gradient?: boolean;
  }) => (
    <View style={styles.sectionHeaderContainer}>
      {Icon && (
        <View style={[
          styles.sectionHeaderIcon,
          { backgroundColor: gradient ? colors.primary : `${colors.primary}15` },
        ]}>
          <Icon size={16} color={gradient ? '#fff' : colors.primary} />
        </View>
      )}
      <Text style={[
        styles.sectionHeader,
        { color: colors.textSecondary },
        Icon && styles.sectionHeaderWithIcon,
      ]}>
        {title}
      </Text>
    </View>
  );

  const AnimatedSection = ({ children, index }: { children: React.ReactNode; index: number }) => {
    const animatedStyle = {
      opacity: sectionAnimations[index] || 1,
      transform: [
        {
          translateY: (sectionAnimations[index] || new Animated.Value(1)).interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0],
          }),
        },
      ],
    };

    return (
      <Animated.View style={[styles.section, { backgroundColor: colors.card }, animatedStyle]}>
        {children}
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: language === 'az' ? 'Tənzimləmələr' : 'Настройки',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <Animated.View style={[
          styles.heroSection,
          {
            backgroundColor: colors.primary,
            opacity: headerAnimation,
            transform: [{
              translateY: headerAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            }],
          },
        ]}>
          <View style={styles.heroContent}>
            <View style={styles.heroIconContainer}>
              <Settings2 size={32} color="#fff" />
              <Animated.View style={[
                styles.heroSparkle,
                { transform: [{ scale: pulseAnimation }] },
              ]}>
                <Sparkles size={16} color="#FFD700" />
              </Animated.View>
            </View>
            <Text style={styles.heroTitle}>
              {language === 'az' ? 'Tənzimləmələr' : 'Настройки'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {language === 'az'
                ? 'Tətbiqi özünüzə uyğunlaşdırın'
                : 'Настройте приложение под себя'
              }
            </Text>
          </View>
        </Animated.View>

        {/* Appearance Section */}
        <AnimatedSection index={0}>
          <SectionHeader
            title={language === 'az' ? 'GÖRÜNÜŞ' : 'ВНЕШНИЙ ВИД'}
            icon={Palette}
            gradient
          />

          <SettingItem
            icon={themeMode === 'light' ? Sun : themeMode === 'dark' ? Moon : RefreshCw}
            title={language === 'az' ? 'Tema rejimi' : 'Режим темы'}
            subtitle={language === 'az'
              ? themeModes.find(t => t.key === themeMode)?.label
              : themeModes.find(t => t.key === themeMode)?.labelRu
            }
            onPress={() => {
              Alert.alert(
                language === 'az' ? 'Tema rejimi seçin' : 'Выберите режим темы',
                '',
                [
                  ...themeModes.map(mode => ({
                    text: language === 'az' ? mode.label : mode.labelRu,
                    onPress: () => handleThemeModeSelect(mode.key),
                  })),
                  {
                    text: language === 'az' ? 'Ləğv et' : 'Отмена',
                    style: 'cancel' as const,
                  },
                ],
              );
            }}
          />

          <SettingItem
            icon={Palette}
            title={language === 'az' ? 'Rəng teması' : 'Цветовая тема'}
            subtitle={colorThemes.find(t => t.key === colorTheme)?.label}
            onPress={() => {
              Alert.alert(
                language === 'az' ? 'Rəng teması seçin' : 'Выберите цветовую тему',
                '',
                [
                  ...colorThemes.map(theme => ({
                    text: theme.label,
                    onPress: () => handleColorThemeSelect(theme.key),
                  })),
                  {
                    text: language === 'az' ? 'Ləğv et' : 'Отмена',
                    style: 'cancel' as const,
                  },
                ],
              );
            }}
            rightComponent={
              <View style={styles.colorPreview}>
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: colorThemes.find(t => t.key === colorTheme)?.color },
                  ]}
                />
                <ChevronRight size={20} color={colors.textSecondary} />
              </View>
            }
          />

          <SettingItem
            icon={Type}
            title={language === 'az' ? 'Şrift ölçüsü' : 'Размер шрифта'}
            subtitle={language === 'az'
              ? fontSizes.find(f => f.key === fontSize)?.label
              : fontSizes.find(f => f.key === fontSize)?.labelRu
            }
            onPress={() => {
              Alert.alert(
                language === 'az' ? 'Şrift ölçüsü seçin' : 'Выберите размер шрифта',
                '',
                [
                  ...fontSizes.map(size => ({
                    text: language === 'az' ? size.label : size.labelRu,
                    onPress: () => handleFontSizeSelect(size.key),
                  })),
                  {
                    text: language === 'az' ? 'Ləğv et' : 'Отмена',
                    style: 'cancel' as const,
                  },
                ],
              );
            }}
          />

          <SettingItem
            icon={Layout}
            title={language === 'az' ? 'Kompakt rejim' : 'Компактный режим'}
            subtitle={language === 'az'
              ? 'Daha çox məlumat göstər'
              : 'Показать больше информации'
            }
            rightComponent={
              <Switch
                value={compactMode}
                onValueChange={setCompactMode}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={compactMode ? '#fff' : colors.textSecondary}
              />
            }
          />
        </AnimatedSection>

        {/* Display Section */}
        <AnimatedSection index={1}>
          <SectionHeader
            title={language === 'az' ? 'EKRAN' : 'ДИСПЛЕЙ'}
            icon={Monitor}
          />

          <SettingItem
            icon={Eye}
            title={language === 'az' ? 'Başlıqda qiymət göstər' : 'Показать цену в заголовке'}
            subtitle={language === 'az'
              ? 'Elan başlığında qiymət göstərilsin'
              : 'Показывать цену в заголовке объявления'
            }
            rightComponent={
              <Switch
                value={showPriceInTitle}
                onValueChange={setShowPriceInTitle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={showPriceInTitle ? '#fff' : colors.textSecondary}
              />
            }
          />

          <SettingItem
            icon={RefreshCw}
            title={language === 'az' ? 'Avtomatik yenilənmə' : 'Автообновление'}
            subtitle={language === 'az'
              ? 'Səhifələr avtomatik yenilənsin'
              : 'Автоматически обновлять страницы'
            }
            rightComponent={
              <Switch
                value={autoRefresh}
                onValueChange={setAutoRefresh}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={autoRefresh ? '#fff' : colors.textSecondary}
              />
            }
          />
        </AnimatedSection>

        {/* Notifications Section */}
        <AnimatedSection index={2}>
          <SectionHeader
            title={language === 'az' ? 'BİLDİRİŞLƏR' : 'УВЕДОМЛЕНИЯ'}
            icon={Bell}
          />

          <SettingItem
            icon={Bell}
            title={language === 'az' ? 'Bildirişlər' : 'Уведомления'}
            subtitle={language === 'az'
              ? 'Push bildirişləri al'
              : 'Получать push-уведомления'
            }
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={notificationsEnabled ? '#fff' : colors.textSecondary}
              />
            }
          />

          <SettingItem
            icon={Bell}
            title={language === 'az' ? 'Bildiriş tarixçəsi' : 'История уведомлений'}
            subtitle={language === 'az'
              ? 'Bütün bildirişləri görün'
              : 'Посмотреть все уведомления'
            }
            onPress={() => router.push('/notifications')}
          />

          <SettingItem
            icon={Volume2}
            title={language === 'az' ? 'Səs' : 'Звук'}
            subtitle={language === 'az'
              ? 'Bildiriş səsləri'
              : 'Звуки уведомлений'
            }
            rightComponent={
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={soundEnabled ? '#fff' : colors.textSecondary}
              />
            }
          />

          <SettingItem
            icon={Vibrate}
            title={language === 'az' ? 'Vibrasiya' : 'Вибрация'}
            subtitle={language === 'az'
              ? 'Bildiriş vibrasiyas'
              : 'Вибрация уведомлений'
            }
            rightComponent={
              <Switch
                value={vibrationEnabled}
                onValueChange={setVibrationEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={vibrationEnabled ? '#fff' : colors.textSecondary}
              />
            }
          />
        </AnimatedSection>

        {/* Communication Section */}
        <AnimatedSection index={3}>
          <SectionHeader
            title={language === 'az' ? 'ƏLAQƏ' : 'СВЯЗЬ'}
            icon={Phone}
          />

          <SettingItem
            icon={Phone}
            title={language === 'az' ? 'Zəng tarixçəsi' : 'История звонков'}
            subtitle={language === 'az'
              ? 'Tətbiq üzərindən edilmiş zənglər'
              : 'Звонки, совершенные через приложение'
            }
            onPress={() => router.push('/call-history')}
          />
        </AnimatedSection>

        {/* Privacy Settings */}
        <AnimatedSection index={4}>
          <SectionHeader
            title={language === 'az' ? 'MƏXFİLİK TƏNZİMLƏMƏLƏRİ' : 'НАСТРОЙКИ КОНФИДЕНЦИАЛЬНОСТИ'}
            icon={Shield}
          />

          <SettingItem
            icon={EyeOff}
            title={language === 'az' ? 'Telefon nömrəsini gizlət' : 'Скрыть номер телефона'}
            subtitle={language === 'az'
              ? 'Telefon nömrəniz digər istifadəçilərə göstərilməsin'
              : 'Ваш номер телефона не будет показан другим пользователям'
            }
            rightComponent={
              <Switch
                value={currentUser?.privacySettings?.hidePhoneNumber ?? false}
                onValueChange={(value) => {
                  // ✅ Validate current user
                  if (!currentUser) {
                    logger.warn('[Settings] No current user');
                    Alert.alert(
                      language === 'az' ? 'Xəta' : 'Ошибка',
                      language === 'az' ? 'İstifadəçi daxil olmayıb' : 'Пользователь не вошел в систему',
                    );
                    return;
                  }

                  try {
                    updatePrivacySettings({ hidePhoneNumber: value });
                    logger.info('[Settings] Phone visibility updated:', value);
                  } catch (error) {
                    logger.error('[Settings] Error updating phone visibility:', error);
                    Alert.alert(
                      language === 'az' ? 'Xəta' : 'Ошибка',
                      language === 'az' ? 'Tənzimləmə yadda saxlanılmadı' : 'Не удалось сохранить настройку',
                    );
                  }
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={currentUser?.privacySettings?.hidePhoneNumber ? '#fff' : colors.textSecondary}
              />
            }
          />

          <SettingItem
            icon={MessageSquare}
            title={language === 'az' ? 'Yalnız tətbiq üzərindən əlaqə' : 'Только связь через приложение'}
            subtitle={language === 'az'
              ? 'İstifadəçilər sizinlə yalnız tətbiq üzərindən əlaqə saxlaya bilsinlər'
              : 'Пользователи могут связаться с вами только через приложение'
            }
            rightComponent={
              <Switch
                value={currentUser?.privacySettings?.onlyAppMessaging ?? false}
                onValueChange={(value) => {
                  // ✅ Validate current user
                  if (!currentUser) {
                    logger.warn('[Settings] No current user');
                    Alert.alert(
                      language === 'az' ? 'Xəta' : 'Ошибка',
                      language === 'az' ? 'İstifadəçi daxil olmayıb' : 'Пользователь не вошел в систему',
                    );
                    return;
                  }

                  try {
                    // ✅ Conflict resolution: onlyAppMessaging and allowDirectContact are mutually exclusive
                    updatePrivacySettings({
                      onlyAppMessaging: value,
                      allowDirectContact: !value,
                    });
                    logger.info('[Settings] App messaging preference updated:', value);
                  } catch (error) {
                    logger.error('[Settings] Error updating messaging preference:', error);
                    Alert.alert(
                      language === 'az' ? 'Xəta' : 'Ошибка',
                      language === 'az' ? 'Tənzimləmə yadda saxlanılmadı' : 'Не удалось сохранить настройку',
                    );
                  }
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={currentUser?.privacySettings?.onlyAppMessaging ? '#fff' : colors.textSecondary}
              />
            }
          />

          <SettingItem
            icon={Phone}
            title={language === 'az' ? 'Birbaşa əlaqəyə icazə ver' : 'Разрешить прямой контакт'}
            subtitle={language === 'az'
              ? 'İstifadəçilər sizə birbaşa zəng edə bilsinlər'
              : 'Пользователи могут звонить вам напрямую'
            }
            rightComponent={
              <Switch
                value={currentUser?.privacySettings?.allowDirectContact ?? false}
                onValueChange={(value) => {
                  // ✅ Validate current user
                  if (!currentUser) {
                    logger.warn('[Settings] No current user');
                    Alert.alert(
                      language === 'az' ? 'Xəta' : 'Ошибка',
                      language === 'az' ? 'İstifadəçi daxil olmayıb' : 'Пользователь не вошел в систему',
                    );
                    return;
                  }

                  try {
                    // ✅ Conflict resolution: allowDirectContact and onlyAppMessaging are mutually exclusive
                    updatePrivacySettings({
                      allowDirectContact: value,
                      onlyAppMessaging: !value,
                    });
                    logger.info('[Settings] Direct contact preference updated:', value);
                  } catch (error) {
                    logger.error('[Settings] Error updating direct contact:', error);
                    Alert.alert(
                      language === 'az' ? 'Xəta' : 'Ошибка',
                      language === 'az' ? 'Tənzimləmə yadda saxlanılmadı' : 'Не удалось сохранить настройку',
                    );
                  }
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={currentUser?.privacySettings?.allowDirectContact ? '#fff' : colors.textSecondary}
              />
            }
          />

          <SettingItem
            icon={UserX}
            title={language === 'az' ? 'Blok edilmiş istifadəçilər' : 'Заблокированные пользователи'}
            subtitle={language === 'az'
              ? `${blockedUsers?.length || 0} istifadəçi blok edilib`
              : `${blockedUsers?.length || 0} пользователей заблокировано`
            }
            onPress={() => {
              logger.info('[Settings] Navigating to blocked users');
              router.push('/blocked-users');
            }}
          />
        </AnimatedSection>

        {/* Language & Region */}
        <AnimatedSection index={4}>
          <SectionHeader
            title={language === 'az' ? 'DİL VƏ REGİON' : 'ЯЗЫК И РЕГИОН'}
            icon={Globe}
          />

          <SettingItem
            icon={Globe}
            title={language === 'az' ? 'Dil' : 'Язык'}
            subtitle={language === 'az' ? 'Azərbaycan dili' : 'Русский язык'}
            onPress={handleLanguageSelect}
          />
        </AnimatedSection>

        {/* Advanced Settings */}
        <AnimatedSection index={5}>
          <SectionHeader
            title={language === 'az' ? 'QABAQCIL TƏNZİMLƏMƏLƏR' : 'РАСШИРЕННЫЕ НАСТРОЙКИ'}
            icon={Zap}
          />

          <SettingItem
            icon={Zap}
            title={language === 'az' ? 'Test bildirişi' : 'Тестовое уведомление'}
            subtitle={language === 'az' ? 'Bildiriş sistemini yoxla' : 'Проверить систему уведомлений'}
            onPress={testNotification}
          />

          <SettingItem
            icon={Volume2}
            title={language === 'az' ? 'Test səsi' : 'Тестовый звук'}
            subtitle={language === 'az' ? 'Səs sistemini yoxla' : 'Проверить звуковую систему'}
            onPress={testSound}
          />

          <SettingItem
            icon={Vibrate}
            title={language === 'az' ? 'Test vibrasiyas' : 'Тестовая вибрация'}
            subtitle={language === 'az' ? 'Vibrasiya sistemini yoxla' : 'Проверить систему вибрации'}
            onPress={testVibration}
          />

          <SettingItem
            icon={Phone}
            title={language === 'az' ? 'Test zəngi' : 'Тестовый звонок'}
            subtitle={language === 'az' ? 'Gələn zəng simulyasiyası' : 'Симуляция входящего звонка'}
            onPress={() => {
              simulateIncomingCall();
              Alert.alert(
                language === 'az' ? 'Test zəngi' : 'Тестовый звонок',
                language === 'az' ? 'Gələn zəng simulyasiyası başladıldı' : 'Симуляция входящего звонка запущена',
              );
            }}
          />

          <SettingItem
            icon={Database}
            title={language === 'az' ? 'Keşi təmizlə' : 'Очистить кэш'}
            subtitle={language === 'az' ? 'Müvəqqəti faylları sil' : 'Удалить временные файлы'}
            onPress={clearCache}
          />

          <SettingItem
            icon={RotateCcw}
            title={language === 'az' ? 'Tənzimləmələri sıfırla' : 'Сбросить настройки'}
            subtitle={language === 'az' ? 'Standart tənzimləmələrə qayıt' : 'Вернуться к настройкам по умолчанию'}
            onPress={resetSettings}
          />
        </AnimatedSection>

        {/* Creative Features */}
        <AnimatedSection index={6}>
          <SectionHeader
            title={language === 'az' ? 'KREATİV XÜSUSİYYƏTLƏR' : 'КРЕАТИВНЫЕ ФУНКЦИИ'}
            icon={Sparkles}
            gradient
          />

          <SettingItem
            icon={Sparkles}
            title={language === 'az' ? 'Animasiya effektləri' : 'Эффекты анимации'}
            subtitle={language === 'az' ? 'Gözəl keçidlər və animasiyalar' : 'Красивые переходы и анимации'}
            isPremium
            isNew
            rightComponent={
              <Switch
                value={animationEffectsEnabled}
                onValueChange={(value) => {
                  logger.info('[Settings] Animation effects toggle:', {
                    from: animationEffectsEnabled,
                    to: value,
                    feature: 'animation_effects',
                  });

                  setAnimationEffectsEnabled(value);

                  logger.info('[Settings] Animation effects updated successfully:', { enabled: value });

                  Alert.alert(
                    language === 'az' ? 'Animasiya effektləri' : 'Эффекты анимации',
                    language === 'az'
                      ? `Animasiya effektləri ${value ? 'aktiv' : 'deaktiv'} edildi. Tətbiq keçidləri və UI animasiyaları ${value ? 'göstəriləcək' : 'gizlədiləcək'}.`
                      : `Эффекты анимации ${value ? 'включены' : 'выключены'}. Переходы и UI-анимации ${value ? 'будут показаны' : 'будут скрыты'}.`,
                  );
                }}
                trackColor={{ false: colors.border, true: '#FFD700' }}
                thumbColor={'#fff'}
              />
            }
          />

          <SettingItem
            icon={Flame}
            title={language === 'az' ? 'Dinamik rənglər' : 'Динамические цвета'}
            subtitle={language === 'az' ? 'Şəkillərə ��saslanan rəng palitras' : 'Цветовая палитра на основе изображений'}
            gradient
            rightComponent={
              <Switch
                value={dynamicColorsEnabled}
                onValueChange={(value) => {
                  logger.info('[Settings] Dynamic colors toggle:', {
                    from: dynamicColorsEnabled,
                    to: value,
                    feature: 'dynamic_colors',
                  });

                  setDynamicColorsEnabled(value);

                  logger.info('[Settings] Dynamic colors updated successfully:', { enabled: value });

                  Alert.alert(
                    language === 'az' ? 'Dinamik rənglər' : 'Динамические цвета',
                    language === 'az'
                      ? `Dinamik rənglər ${value ? 'aktiv' : 'deaktiv'} edildi. Tətbiq ${value ? 'elan şəkillərindən dominant rəngləri çıxaracaq və interfeysi avtomatik uyğunlaşdıracaq' : 'standart rəng sxemindən istifadə edəcək'}.`
                      : `Динамические цвета ${value ? 'включены' : 'выключены'}. Приложение ${value ? 'будет извлекать доминантные цвета из изображений объявлений и автоматически адаптировать интерфейс' : 'будет использовать стандартную цветовую схему'}.`,
                    [
                      { text: language === 'az' ? 'Başa düşdüm' : 'Понятно' },
                    ],
                  );
                }}
                trackColor={{ false: 'rgba(255,255,255,0.3)', true: 'rgba(255,255,255,0.8)' }}
                thumbColor={'#fff'}
              />
            }
          />

          <SettingItem
            icon={Rocket}
            title={language === 'az' ? 'Adaptiv interfeys' : 'Адаптивный интерфейс'}
            subtitle={language === 'az' ? 'İstifadə vərdişlərinə uyğun' : 'Адаптируется к привычкам использования'}
            isPremium
            rightComponent={
              <Switch
                value={adaptiveInterfaceEnabled}
                onValueChange={(value) => {
                  logger.info('[Settings] Adaptive interface toggle:', {
                    from: adaptiveInterfaceEnabled,
                    to: value,
                    feature: 'adaptive_interface',
                  });

                  setAdaptiveInterfaceEnabled(value);

                  logger.info('[Settings] Adaptive interface updated successfully:', { enabled: value });

                  Alert.alert(
                    language === 'az' ? 'Adaptiv interfeys' : 'Адаптивный интерфейс',
                    language === 'az'
                      ? `Adaptiv interfeys ${value ? 'aktiv' : 'deaktiv'} edildi. Tətbiq ${value ? 'istifadə tərzinizi öyrənəcək və sizə uyğun şəkildə uyğunlaşacaq (ən çox baxdığınız kateqoriyalar, tez-tez istifadə etdiyiniz filtrələr və s.)' : 'standart interfeysdən istifadə edəcək'}.`
                      : `Адаптивный интерфейс ${value ? 'включен' : 'выключен'}. Приложение ${value ? 'будет изучать ваш стиль использования и адаптироваться (наиболее просматриваемые категории, часто используемые фильтры и т.д.)' : 'будет использовать стандартный интерфейс'}.`,
                    [
                      { text: language === 'az' ? 'Başa düşdüm' : 'Понятно' },
                    ],
                  );
                }}
                trackColor={{ false: colors.border, true: '#FFD700' }}
                thumbColor={'#fff'}
              />
            }
          />

          <SettingItem
            icon={Crown}
            title={language === 'az' ? 'Premium rejim' : 'Премиум режим'}
            subtitle={language === 'az' ? 'Eksklüziv xüsusiyyətlər və üstünlüklər' : 'Эксклюзивные функции и преимущества'}
            isPremium
            onPress={() => {
              logger.info('[Settings] Premium mode tapped:', { userId: currentUser?.id });

              Alert.alert(
                language === 'az' ? 'Premium rejim' : 'Премиум режим',
                language === 'az'
                  ? 'Premium üzvlük ilə:\n\n✨ Limitsiz VIP elanlar\n🚀 Prioritet dəstək\n🎨 Eksklüziv dizayn temaları\n📊 Detallı analitika\n💎 Reklamsız təcrübə\n\nÜzvlük üçün əlaqə saxlayın:'
                  : 'С премиум подпиской:\n\n✨ Безлимитные VIP объявления\n🚀 Приоритетная поддержка\n🎨 Эксклюзивные темы дизайна\n📊 Детальная аналитика\n💎 Без рекламы\n\nСвяжитесь с нами для подписки:',
                [
                  {
                    text: language === 'az' ? 'Ləğv et' : 'Отмена',
                    style: 'cancel',
                    onPress: () => {
                      logger.info('[Settings] Premium mode dialog cancelled');
                    },
                  },
                  {
                    text: language === 'az' ? 'Dəstək' : 'Поддержка',
                    onPress: () => {
                      logger.info('[Settings] Premium mode: navigating to support');
                      router.push('/support');
                    },
                  },
                  {
                    text: language === 'az' ? 'Daha çox' : 'Подробнее',
                    onPress: () => {
                      logger.info('[Settings] Premium mode: viewing details');
                      Alert.alert(
                        language === 'az' ? 'Premium Paketlər' : 'Премиум пакеты',
                        language === 'az'
                          ? '💎 Aylıq: 19.99 AZN\n👑 İllik: 199.99 AZN (2 ay pulsuz!)\n🌟 Ömürlük: 499.99 AZN\n\nBütün paketlərdə 7 günlük pulsuz sınaq mövcuddur!'
                          : '💎 Месяц: 19.99 AZN\n👑 Год: 199.99 AZN (2 месяца бесплатно!)\n🌟 Навсегда: 499.99 AZN\n\nВо всех пакетах доступна 7-дневная бесплатная пробная версия!',
                        [
                          {
                            text: language === 'az' ? 'Bağla' : 'Закрыть',
                          },
                        ],
                      );
                    },
                  },
                ],
              );
            }}
          />
        </AnimatedSection>

        {/* About Section */}
        <AnimatedSection index={7}>
          <SectionHeader
            title={language === 'az' ? 'HAQQINDA' : 'О ПРИЛОЖЕНИИ'}
            icon={Info}
          />

          <SettingItem
            icon={Info}
            title={language === 'az' ? 'Tətbiq haqqında' : 'О приложении'}
            subtitle="v1.0.0"
            onPress={() => router.push('/about')}
          />

          <SettingItem
            icon={HelpCircle}
            title={language === 'az' ? 'Kömək və dəstək' : 'Помощь и поддержка'}
            subtitle={language === 'az' ? 'Texniki dəstək və şikayətlər' : 'Техническая поддержка и жалобы'}
            onPress={() => router.push('/support')}
          />

          {(currentUser?.role === 'admin' || currentUser?.role === 'moderator') && (
            <SettingItem
              icon={Shield}
              title={language === 'az' ? 'Moderasiya paneli' : 'Панель модерации'}
              subtitle={language === 'az' ? 'Şikayətlər və istifadəçi idarəetməsi' : 'Жалобы и управление пользователями'}
              onPress={() => router.push('/moderation')}
              isPremium
            />
          )}

          <SettingItem
            icon={FileText}
            title={language === 'az' ? 'İstifadəçi razılaşması' : 'Пользовательское соглашение'}
            subtitle={language === 'az' ? 'Xidmət şərtləri və qaydalar' : 'Условия использования и правила'}
            onPress={() => router.push('/terms')}
          />

          <SettingItem
            icon={Shield}
            title={language === 'az' ? 'Məxfilik siyasəti' : 'Политика конфиденциальности'}
            subtitle={language === 'az' ? 'Məlumatlarınızın qorunması haqqında' : 'О защите ваших данных'}
            onPress={() => router.push('/privacy')}
          />
        </AnimatedSection>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  heroSection: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroIconContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  heroSparkle: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionHeaderIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionHeaderWithIcon: {
    marginLeft: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  premiumItem: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  gradientItem: {
    backgroundColor: 'transparent',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  premiumIconContainer: {
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  gradientIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  premiumTitle: {
    color: '#B8860B',
  },
  newBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  settingSubtitle: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  bottomSpacing: {
    height: 40,
  },
// });
//     marginTop: 4,
//     lineHeight: 20,
//   },
  // colorPreview: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  // },
  // colorDot: {
  //   width: 24,
  //   height: 24,
  //   borderRadius: 12,
  //   marginRight: 12,
  //   borderWidth: 2,
  //   borderColor: 'rgba(255,255,255,0.3)',
  // },
  // bottomSpacing: {
  //   height: 40,
  // },
});

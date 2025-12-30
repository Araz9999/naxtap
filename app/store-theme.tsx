import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  Palette,
  Eye,
  Save,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  Layout,
  Type,
  Brush,
  Crown,
  Star,
} from 'lucide-react-native';
import { useStoreStore } from '@/store/storeStore';
import { useUserStore } from '@/store/userStore';
import { useLanguageStore } from '@/store/languageStore';
import { getColors } from '@/constants/colors';
import { useThemeStore } from '@/store/themeStore';
import { logger } from '@/utils/logger';

interface ThemeColor {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  premium?: boolean;
}

interface ThemeLayout {
  id: string;
  name: string;
  description: string;
  preview: string;
  premium?: boolean;
}

const themeColors: ThemeColor[] = [
  {
    id: 'default',
    name: 'Standart Mavi',
    primary: '#007AFF',
    secondary: '#5AC8FA',
    accent: '#FF9500',
    background: '#F2F2F7',
    text: '#000000',
  },
  {
    id: 'elegant_purple',
    name: 'Zərif Bənövşəyi',
    primary: '#8B5CF6',
    secondary: '#A78BFA',
    accent: '#F59E0B',
    background: '#F8FAFC',
    text: '#1F2937',
  },
  {
    id: 'nature_green',
    name: 'Təbii Yaşıl',
    primary: '#10B981',
    secondary: '#34D399',
    accent: '#F59E0B',
    background: '#F0FDF4',
    text: '#065F46',
  },
  {
    id: 'sunset_orange',
    name: 'Gün Batımı Narıncı',
    primary: '#F97316',
    secondary: '#FB923C',
    accent: '#EF4444',
    background: '#FFF7ED',
    text: '#9A3412',
  },
  {
    id: 'ocean_blue',
    name: 'Okean Mavisi',
    primary: '#0EA5E9',
    secondary: '#38BDF8',
    accent: '#06B6D4',
    background: '#F0F9FF',
    text: '#0C4A6E',
    premium: true,
  },
  {
    id: 'royal_gold',
    name: 'Kral Qızılı',
    primary: '#D97706',
    secondary: '#F59E0B',
    accent: '#EF4444',
    background: '#FFFBEB',
    text: '#92400E',
    premium: true,
  },
  {
    id: 'midnight_dark',
    name: 'Gecə Qarası',
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#EC4899',
    background: '#111827',
    text: '#F9FAFB',
    premium: true,
  },
];

const themeLayouts: ThemeLayout[] = [
  {
    id: 'classic',
    name: 'Klassik',
    description: 'Ənənəvi və sadə dizayn',
    preview: '📋',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Müasir və minimalist',
    preview: '🎨',
  },
  {
    id: 'grid',
    name: 'Şəbəkə',
    description: 'Məhsullar şəbəkə şəklində',
    preview: '⚏',
  },
  {
    id: 'card',
    name: 'Kart',
    description: 'Böyük kart dizaynı',
    preview: '🃏',
    premium: true,
  },
  {
    id: 'magazine',
    name: 'Jurnal',
    description: 'Jurnal tərzi layout',
    preview: '📰',
    premium: true,
  },
];

export default function StoreThemeScreen() {
  const router = useRouter();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { currentUser } = useUserStore();
  const { language } = useLanguageStore();
  const { stores, getUserStore, editStore } = useStoreStore();
  const { themeMode, colorTheme } = useThemeStore();
  const colors = getColors(themeMode, colorTheme);

  const [selectedColor, setSelectedColor] = useState('default');
  const [selectedLayout, setSelectedLayout] = useState('classic');
  const [previewMode, setPreviewMode] = useState(false);

  const store = storeId ? stores.find(s => s.id === storeId) : getUserStore(currentUser?.id || '');

  if (!store) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Mağaza Görünüşü' }} />
        <Text style={[styles.errorText, { color: colors.error }]}>Mağaza tapılmadı</Text>
      </View>
    );
  }

  const selectedThemeColor = themeColors.find(c => c.id === selectedColor) || themeColors[0];
  const selectedThemeLayout = themeLayouts.find(l => l.id === selectedLayout) || themeLayouts[0];

  const handleSaveTheme = async () => {
    if (!store) {
      logger.error('[StoreTheme] No store for theme save');
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Mağaza tapılmadı' : 'Магазин не найден',
      );
      return;
    }

    if (!selectedColor || !selectedLayout) {
      logger.error('[StoreTheme] Missing theme selections:', { color: selectedColor, layout: selectedLayout });
      return;
    }

    logger.info('[StoreTheme] Saving theme:', {
      storeId: store.id,
      color: selectedColor,
      layout: selectedLayout,
    });

    try {
      await editStore(store.id, {
        theme: {
          colorScheme: selectedColor,
          layout: selectedLayout,
        },
      });

      logger.info('[StoreTheme] Theme saved successfully:', store.id);
      Alert.alert('Uğurlu', 'Mağaza görünüşü yeniləndi');
    } catch (error) {
      logger.error('[StoreTheme] Failed to save theme:', error);
      Alert.alert('Xəta', 'Görünüş yenilənə bilmədi');
    }
  };

  const handleResetTheme = () => {
    logger.info('[StoreTheme] Reset theme requested:', { currentColor: selectedColor, currentLayout: selectedLayout });

    Alert.alert(
      'Sıfırla',
      'Bütün dəyişiklikləri sıfırlamaq istəyirsiniz?',
      [
        {
          text: 'Xeyr',
          style: 'cancel',
          onPress: () => logger.info('[StoreTheme] Reset cancelled'),
        },
        {
          text: 'Bəli',
          onPress: () => {
            logger.info('[StoreTheme] Resetting theme to defaults');
            setSelectedColor('default');
            setSelectedLayout('classic');
            logger.info('[StoreTheme] Theme reset to defaults');
          },
        },
      ],
    );
  };

  const renderColorOption = (color: ThemeColor) => {
    const isSelected = selectedColor === color.id;

    return (
      <TouchableOpacity
        key={color.id}
        style={[
          styles.colorOption,
          isSelected && [styles.selectedColorOption, { backgroundColor: colors.background }],
        ]}
        onPress={() => {
          // ✅ Check if premium color requires premium access
          if (color.premium && currentUser?.role !== 'admin') {
            logger.warn('[StoreTheme] Premium color selected without premium access:', color.id);
            Alert.alert(
              'Premium Xüsusiyyət',
              'Bu rəng mövzusu premium istifadəçilər üçündür. Premium plan almaq istəyirsinizmi?',
              [
                { text: 'Xeyr', style: 'cancel' },
                { text: 'Bəli', onPress: () => router.push('/pricing') },
              ],
            );
            return;
          }

          logger.info('[StoreTheme] Color selected:', color.id);
          setSelectedColor(color.id);
        }}
      >
        <View style={styles.colorPreview}>
          <View style={[styles.colorCircle, { backgroundColor: color.primary, borderColor: colors.white }]} />
          <View style={[styles.colorCircle, { backgroundColor: color.secondary, borderColor: colors.white }]} />
          <View style={[styles.colorCircle, { backgroundColor: color.accent, borderColor: colors.white }]} />
        </View>
        <Text style={[styles.colorName, { color: colors.text }]}>{color.name}</Text>
        {color.premium && (
          <View style={[styles.premiumBadge, { backgroundColor: colors.card }]}>
            <Crown size={12} color={colors.warning} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderLayoutOption = (layout: ThemeLayout) => {
    const isSelected = selectedLayout === layout.id;

    return (
      <TouchableOpacity
        key={layout.id}
        style={[
          styles.layoutOption,
          isSelected && [styles.selectedLayoutOption, { backgroundColor: colors.background }],
        ]}
        onPress={() => {
          // ✅ Check if premium layout requires premium access
          if (layout.premium && currentUser?.role !== 'admin') {
            logger.warn('[StoreTheme] Premium layout selected without premium access:', layout.id);
            Alert.alert(
              'Premium Xüsusiyyət',
              'Bu dizayn layoutu premium istifadəçilər üçündür. Premium plan almaq istəyirsinizmi?',
              [
                { text: 'Xeyr', style: 'cancel' },
                { text: 'Bəli', onPress: () => router.push('/pricing') },
              ],
            );
            return;
          }

          logger.info('[StoreTheme] Layout selected:', layout.id);
          setSelectedLayout(layout.id);
        }}
      >
        <View style={[styles.layoutPreview, { backgroundColor: colors.lightGray }]}>
          <Text style={styles.layoutEmoji}>{layout.preview}</Text>
        </View>
        <Text style={[styles.layoutName, { color: colors.text }]}>{layout.name}</Text>
        <Text style={[styles.layoutDescription, { color: colors.textSecondary }]}>{layout.description}</Text>
        {layout.premium && (
          <View style={[styles.premiumBadge, { backgroundColor: colors.card }]}>
            <Crown size={12} color={colors.warning} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderPreview = () => {
    return (
      <View style={[
        styles.previewContainer,
        { backgroundColor: selectedThemeColor.background },
      ]}>
        <Text style={[styles.previewTitle, { color: colors.text }]}>Önizləmə</Text>

        {/* Store Header Preview */}
        <View style={[
          styles.previewHeader,
          { backgroundColor: selectedThemeColor.primary },
        ]}>
          <Text style={[styles.previewStoreName, { color: selectedThemeColor.background }]}>
            {store.name}
          </Text>
          <View style={styles.previewStats}>
            <View style={styles.previewStat}>
              <Star size={16} color={selectedThemeColor.background} />
              <Text style={[styles.previewStatText, { color: selectedThemeColor.background }]}>
                4.8
              </Text>
            </View>
          </View>
        </View>

        {/* Sample Listings Preview */}
        <View style={styles.previewListings}>
          {selectedLayout === 'grid' ? (
            <View style={styles.gridPreview}>
              {[1, 2, 3, 4].map((item) => (
                <View
                  key={item}
                  style={[
                    styles.gridItem,
                    { backgroundColor: selectedThemeColor.background },
                  ]}
                >
                  <View style={[
                    styles.gridItemImage,
                    { backgroundColor: selectedThemeColor.secondary },
                  ]} />
                  <Text style={[
                    styles.gridItemText,
                    { color: selectedThemeColor.text },
                  ]}>
                    Məhsul {item}
                  </Text>
                </View>
              ))}
            </View>
          ) : selectedLayout === 'card' ? (
            <View style={styles.cardPreview}>
              {[1, 2].map((item) => (
                <View
                  key={item}
                  style={[
                    styles.cardItem,
                    { backgroundColor: selectedThemeColor.background },
                  ]}
                >
                  <View style={[
                    styles.cardItemImage,
                    { backgroundColor: selectedThemeColor.secondary },
                  ]} />
                  <Text style={[
                    styles.cardItemTitle,
                    { color: selectedThemeColor.text },
                  ]}>
                    Məhsul {item}
                  </Text>
                  <Text style={[
                    styles.cardItemPrice,
                    { color: selectedThemeColor.primary },
                  ]}>
                    150 AZN
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.listPreview}>
              {[1, 2, 3].map((item) => (
                <View
                  key={item}
                  style={[
                    styles.listItem,
                    { backgroundColor: selectedThemeColor.background },
                  ]}
                >
                  <View style={[
                    styles.listItemImage,
                    { backgroundColor: selectedThemeColor.secondary },
                  ]} />
                  <View style={styles.listItemContent}>
                    <Text style={[
                      styles.listItemTitle,
                      { color: selectedThemeColor.text },
                    ]}>
                      Məhsul {item}
                    </Text>
                    <Text style={[
                      styles.listItemPrice,
                      { color: selectedThemeColor.primary },
                    ]}>
                      150 AZN
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Mağaza Görünüşü',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setPreviewMode(!previewMode)}
              >
                <Eye size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleResetTheme}
              >
                <RotateCcw size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {previewMode ? (
          renderPreview()
        ) : (
          <>
            {/* Color Themes Section */}
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <Palette size={24} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Rəng Mövzuları</Text>
              </View>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                Mağazanız üçün uyğun rəng palitrasını seçin
              </Text>

              <View style={styles.colorGrid}>
                {themeColors.map(renderColorOption)}
              </View>
            </View>

            {/* Layout Section */}
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <Layout size={24} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Dizayn Layoutu</Text>
              </View>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                Məhsullarınızın necə göstəriləcəyini seçin
              </Text>

              <View style={styles.layoutGrid}>
                {themeLayouts.map(renderLayoutOption)}
              </View>
            </View>

            {/* Advanced Options */}
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <Sparkles size={24} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Əlavə Seçimlər</Text>
              </View>

              <TouchableOpacity
                style={[styles.advancedOption, { borderBottomColor: colors.border }]}
                onPress={() => Alert.alert('Premium Xüsusiyyət', 'Bu xüsusiyyət premium istifadəçilər üçündür')}
              >
                <View style={styles.advancedOptionLeft}>
                  <ImageIcon size={20} color={colors.primary} />
                  <View style={styles.advancedOptionContent}>
                    <Text style={[styles.advancedOptionTitle, { color: colors.text }]}>Fon Şəkli</Text>
                    <Text style={[styles.advancedOptionDescription, { color: colors.textSecondary }]}>
                      Mağaza üçün xüsusi fon şəkli əlavə edin
                    </Text>
                  </View>
                </View>
                <View style={[styles.premiumBadge, { backgroundColor: colors.card }]}>
                  <Crown size={16} color={colors.warning} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.advancedOption, { borderBottomColor: colors.border }]}
                onPress={() => Alert.alert('Premium Xüsusiyyət', 'Bu xüsusiyyət premium istifadəçilər üçündür')}
              >
                <View style={styles.advancedOptionLeft}>
                  <Type size={20} color={colors.primary} />
                  <View style={styles.advancedOptionContent}>
                    <Text style={[styles.advancedOptionTitle, { color: colors.text }]}>Şrift Stili</Text>
                    <Text style={[styles.advancedOptionDescription, { color: colors.textSecondary }]}>
                      Xüsusi şrift və ölçü seçimləri
                    </Text>
                  </View>
                </View>
                <View style={[styles.premiumBadge, { backgroundColor: colors.card }]}>
                  <Crown size={16} color={colors.warning} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.advancedOption, { borderBottomColor: colors.border }]}
                onPress={() => Alert.alert('Premium Xüsusiyyət', 'Bu xüsusiyyət premium istifadəçilər üçündür')}
              >
                <View style={styles.advancedOptionLeft}>
                  <Brush size={20} color={colors.primary} />
                  <View style={styles.advancedOptionContent}>
                    <Text style={[styles.advancedOptionTitle, { color: colors.text }]}>Animasiyalar</Text>
                    <Text style={[styles.advancedOptionDescription, { color: colors.textSecondary }]}>
                      Səhifə keçidləri və effektlər
                    </Text>
                  </View>
                </View>
                <View style={[styles.premiumBadge, { backgroundColor: colors.card }]}>
                  <Crown size={16} color={colors.warning} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Current Selection Summary */}
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Seçilmiş Tema</Text>
              <View style={[styles.selectionSummary, { backgroundColor: colors.background }]}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Rəng:</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedThemeColor.name}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Layout:</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedThemeLayout.name}</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.bottomActions, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSaveTheme}
        >
          <Save size={20} color={colors.white} />
          <Text style={[styles.saveButtonText, { color: colors.white }]}>Dəyişiklikləri Saxla</Text>
        </TouchableOpacity>
      </View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  colorOption: {
    width: '50%',
    padding: 8,
  },
  selectedColorOption: {
    borderRadius: 12,
  },
  colorPreview: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginHorizontal: 2,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  colorName: {
    fontSize: 14,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  layoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  layoutOption: {
    width: '50%',
    padding: 8,
  },
  selectedLayoutOption: {
    borderRadius: 12,
  },
  layoutPreview: {
    height: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  layoutEmoji: {
    fontSize: 32,
  },
  layoutName: {
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginBottom: 4,
  },
  layoutDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  premiumBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 12,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  advancedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  advancedOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  advancedOptionContent: {
    marginLeft: 12,
    flex: 1,
  },
  advancedOptionTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  advancedOptionDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  selectionSummary: {
    padding: 16,
    borderRadius: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  previewContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    textAlign: 'center',
    padding: 16,
  },
  previewHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewStoreName: {
    fontSize: 20,
    fontWeight: 'bold' as const,
  },
  previewStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewStatText: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginLeft: 4,
  },
  previewListings: {
    padding: 16,
  },
  gridPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  gridItem: {
    width: '50%',
    padding: 4,
  },
  gridItemImage: {
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  gridItemText: {
    fontSize: 14,
    textAlign: 'center',
  },
  cardPreview: {
    marginHorizontal: -8,
  },
  cardItem: {
    marginHorizontal: 8,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardItemImage: {
    height: 120,
  },
  cardItemTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    padding: 12,
  },
  cardItemPrice: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  listPreview: {
    marginHorizontal: -8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  listItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  listItemPrice: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginTop: 4,
  },
  bottomActions: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
});

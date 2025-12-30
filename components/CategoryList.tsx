import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { categories } from '@/constants/categories';
import { useLanguageStore } from '@/store/languageStore';
import { useListingStore } from '@/store/listingStore';
import { useThemeStore } from '@/store/themeStore';
import { getColors } from '@/constants/colors';
import { t } from '@/constants/translations';
import { Home, Car, Smartphone, Briefcase, Shirt, Sofa, Baby, Dog, Music, Store, Utensils, BookOpen, Palette, HeartPulse } from 'lucide-react-native';

function CategoryList() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { setSelectedCategory } = useListingStore();
  const { themeMode, colorTheme } = useThemeStore();
  const colors = getColors(themeMode, colorTheme);

  const getIcon = useCallback((iconName: string) => {
    const iconColor = colors.primary;
    switch (iconName) {
      case 'home':
        return <Home size={24} color={iconColor} />;
      case 'car':
        return <Car size={24} color={iconColor} />;
      case 'smartphone':
        return <Smartphone size={24} color={iconColor} />;
      case 'briefcase':
        return <Briefcase size={24} color={iconColor} />;
      case 'shirt':
        return <Shirt size={24} color={iconColor} />;
      case 'sofa':
        return <Sofa size={24} color={iconColor} />;
      case 'baby':
        return <Baby size={24} color={iconColor} />;
      case 'dog':
        return <Dog size={24} color={iconColor} />;
      case 'music':
        return <Music size={24} color={iconColor} />;
      case 'store':
        return <Store size={24} color={iconColor} />;
      case 'utensils':
        return <Utensils size={24} color={iconColor} />;
      case 'book-open':
        return <BookOpen size={24} color={iconColor} />;
      case 'palette':
        return <Palette size={24} color={iconColor} />;
      case 'heart-pulse':
        return <HeartPulse size={24} color={iconColor} />;
      default:
        return <Home size={24} color={iconColor} />;
    }
  }, [colors.primary]);

  const handleCategoryPress = useCallback((categoryId: number) => {
    setSelectedCategory(categoryId);
    router.push('/category');
  }, [setSelectedCategory, router]);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('categories', language)}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryItem}
            onPress={() => handleCategoryPress(category.id)}
          >
            <View style={styles.iconContainer}>
              {getIcon(category.icon)}
            </View>
            <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={2}>
              {category.name[language] || category.name.az}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default memo(CategoryList);

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 12,
  },
  categoryItem: {
    width: 80,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    textAlign: 'center',
    height: 32,
  },
});

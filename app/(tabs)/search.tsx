import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { useListingStore } from '@/store/listingStore';
import { useLanguageStore } from '@/store/languageStore';
import { categories } from '@/constants/categories';
import SearchBar from '@/components/SearchBar';
import ListingGrid from '@/components/ListingGrid';
import Colors from '@/constants/colors';
import { ChevronDown, ChevronUp, Filter, ArrowUpDown, Camera, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { logger } from '@/utils/logger';
import { sanitizeNumericInput } from '@/utils/inputValidation';
export default function SearchScreen() {
  const { language } = useLanguageStore();
  const {
    selectedCategory,
    selectedSubcategory,
    priceRange,
    sortBy,
    setSelectedCategory,
    setSelectedSubcategory,
    setPriceRange,
    setSortBy,
    resetFilters,
  } = useListingStore();

  const [showFilters, setShowFilters] = useState(false);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [minPrice, setMinPrice] = useState(priceRange.min?.toString() || '');
  const [maxPrice, setMaxPrice] = useState(priceRange.max?.toString() || '');
  const [searchImage, setSearchImage] = useState<string | null>(null);

  const selectedCategoryData = categories.find(c => c.id === selectedCategory);

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const toggleSortOptions = () => {
    setShowSortOptions(!showSortOptions);
  };

  const handleCategorySelect = (categoryId: number) => {
    // ✅ Toggle category - if already selected, deselect it
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
      setSelectedSubcategory(null); // ✅ Also clear subcategory
    } else {
      setSelectedCategory(categoryId);
      setSelectedSubcategory(null); // ✅ Clear subcategory when changing category
    }
  };

  const handleSubcategorySelect = (subcategoryId: number) => {
    // ✅ Toggle subcategory - if already selected, deselect it
    if (selectedSubcategory === subcategoryId) {
      setSelectedSubcategory(null);
    } else {
      setSelectedSubcategory(subcategoryId);
    }
  };

  const handlePriceRangeApply = () => {
    // ✅ Trim whitespace from inputs
    const trimmedMin = minPrice?.trim() || '';
    const trimmedMax = maxPrice?.trim() || '';

    // ✅ Parse and validate
    const minVal = trimmedMin ? parseFloat(trimmedMin) : null;
    const maxVal = trimmedMax ? parseFloat(trimmedMax) : null;

    // ✅ Validate min price
    if (minVal !== null) {
      if (isNaN(minVal) || !isFinite(minVal)) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Minimum qiymət düzgün deyil' : 'Минимальная цена некорректна',
        );
        return;
      }

      if (minVal < 0) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Minimum qiymət mənfi ola bilməz' : 'Минимальная цена не может быть отрицательной',
        );
        return;
      }

      if (minVal > 1000000) { // ✅ Max 1 million AZN
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Minimum qiymət çox yüksəkdir (max 1,000,000 AZN)' : 'Минимальная цена слишком высока (макс 1,000,000 AZN)',
        );
        return;
      }
    }

    // ✅ Validate max price
    if (maxVal !== null) {
      if (isNaN(maxVal) || !isFinite(maxVal)) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Maksimum qiymət düzgün deyil' : 'Максимальная цена некорректна',
        );
        return;
      }

      if (maxVal < 0) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Maksimum qiymət mənfi ola bilməz' : 'Максимальная цена не может быть отрицательной',
        );
        return;
      }

      if (maxVal > 1000000) { // ✅ Max 1 million AZN
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Maksimum qiymət çox yüksəkdir (max 1,000,000 AZN)' : 'Максимальная цена слишком высока (макс 1,000,000 AZN)',
        );
        return;
      }
    }

    // ✅ Validate min is not greater than max
    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az'
          ? 'Minimum qiymət maksimumdan böyük ola bilməz'
          : 'Минимальная цена не может быть больше максимальной',
      );
      return;
    }

    setPriceRange(minVal, maxVal);
  };

  const handleSortSelect = (sort: 'date' | 'price-asc' | 'price-desc') => {
    setSortBy(sort);
    setShowSortOptions(false);
  };

  const clearFilters = () => {
    resetFilters();
    setMinPrice('');
    setMaxPrice('');
    setSearchImage(null);
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'date':
        return language === 'az' ? 'Tarix' : 'Дата';
      case 'price-asc':
        return language === 'az' ? 'Qiymət: artana doğru' : 'Цена: по возрастанию';
      case 'price-desc':
        return language === 'az' ? 'Qiymət: azalana doğru' : 'Цена: по убыванию';
      default:
        return language === 'az' ? 'Sıralama' : 'Сортировка';
    }
  };

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
        quality: 0.8, // BUG FIX: Reduced quality for better performance
      });

      // BUG FIX: Validate assets array exists and has items
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        setSearchImage(result.assets[0].uri);
        // In a real app, we would send this image to a backend for processing
        // Since we don't have a backend, we'll just show an alert
        Alert.alert(
          language === 'az' ? 'Şəkillə axtarış' : 'Поиск по изображению',
          language === 'az'
            ? 'Şəkillə axtarış funksiyası tezliklə aktiv olacaq'
            : 'Функция поиска по изображению скоро будет доступна',
        );
      }
    } catch (error) {
      logger.error('Error picking image:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Şəkil seçilə bilmədi' : 'Не удалось выбрать изображение',
      );
    }
  };

  const handleCameraSearch = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az'
          ? 'Kamera ilə axtarış veb versiyada mövcud deyil'
          : 'Поиск с помощью камеры недоступен в веб-версии',
      );
      return;
    }

    try {
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
        quality: 1,
      });

      // ✅ Validate assets array exists and has elements
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        setSearchImage(result.assets[0].uri);
        // In a real app, we would send this image to a backend for processing
        Alert.alert(
          language === 'az' ? 'Şəkillə axtarış' : 'Поиск по изображению',
          language === 'az'
            ? 'Şəkillə axtarış funksiyası tezliklə aktiv olacaq'
            : 'Функция поиска по изображению скоро будет доступна',
        );
      }
    } catch (error) {
      logger.error('Error using camera:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Şəkil çəkilə bilmədi' : 'Не удалось сделать фото',
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SearchBar />

        <View style={styles.imageSearchContainer}>
          <TouchableOpacity style={styles.imageSearchButton} onPress={pickImage}>
            <ImageIcon size={20} color={Colors.primary} />
            <Text style={styles.imageSearchText}>
              {language === 'az' ? 'Şəkillə axtar' : 'Поиск по фото'}
            </Text>
          </TouchableOpacity>

          {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.imageSearchButton} onPress={handleCameraSearch}>
              <Camera size={20} color={Colors.primary} />
              <Text style={styles.imageSearchText}>
                {language === 'az' ? 'Kamera ilə axtar' : 'Поиск камерой'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterBar}>
          <TouchableOpacity style={styles.filterToggle} onPress={toggleFilters}>
            <Filter size={20} color={Colors.primary} />
            <Text style={styles.filterToggleText}>
              {language === 'az' ? 'Filtrlər' : 'Фильтры'}
            </Text>
            {showFilters ? (
              <ChevronUp size={20} color={Colors.primary} />
            ) : (
              <ChevronDown size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.sortToggle} onPress={toggleSortOptions}>
            <ArrowUpDown size={20} color={Colors.primary} />
            <Text style={styles.sortToggleText}>
              {getSortLabel()}
            </Text>
          </TouchableOpacity>
        </View>

        {showSortOptions && (
          <View style={styles.sortOptions}>
            <TouchableOpacity
              style={[styles.sortOption, sortBy === 'date' && styles.selectedSortOption]}
              onPress={() => handleSortSelect('date')}
            >
              <Text style={[styles.sortOptionText, sortBy === 'date' && styles.selectedSortOptionText]}>
                {language === 'az' ? 'Tarix' : 'Дата'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortOption, sortBy === 'price-asc' && styles.selectedSortOption]}
              onPress={() => handleSortSelect('price-asc')}
            >
              <Text style={[styles.sortOptionText, sortBy === 'price-asc' && styles.selectedSortOptionText]}>
                {language === 'az' ? 'Qiymət: artana doğru' : 'Цена: по возрастанию'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortOption, sortBy === 'price-desc' && styles.selectedSortOption]}
              onPress={() => handleSortSelect('price-desc')}
            >
              <Text style={[styles.sortOptionText, sortBy === 'price-desc' && styles.selectedSortOptionText]}>
                {language === 'az' ? 'Qiymət: azalana doğru' : 'Цена: по убыванию'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showFilters && (
          <View style={styles.filtersContainer}>
            <ScrollView style={styles.filtersScroll}>
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>
                  {language === 'az' ? 'Kateqoriyalar' : 'Категории'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterOptions}>
                    {categories.map(category => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.filterOption,
                          selectedCategory === category.id && styles.selectedOption,
                        ]}
                        onPress={() => handleCategorySelect(category.id)}
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            selectedCategory === category.id && styles.selectedOptionText,
                          ]}
                        >
                          {category.name[language]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {selectedCategoryData && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterTitle}>
                    {language === 'az' ? 'Alt kateqoriyalar' : 'Подкатегории'}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.filterOptions}>
                      {selectedCategoryData?.subcategories?.map(subcategory => (
                        <TouchableOpacity
                          key={subcategory.id}
                          style={[
                            styles.filterOption,
                            selectedSubcategory === subcategory.id && styles.selectedOption,
                          ]}
                          onPress={() => handleSubcategorySelect(subcategory.id)}
                        >
                          <Text
                            style={[
                              styles.filterOptionText,
                              selectedSubcategory === subcategory.id && styles.selectedOptionText,
                            ]}
                          >
                            {subcategory.name[language]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>
                  {language === 'az' ? 'Qiymət' : 'Цена'}
                </Text>
                <View style={styles.priceRangeContainer}>
                  <View style={styles.priceInputContainer}>
                    <TextInput
                      style={styles.priceInput}
                      placeholder={language === 'az' ? 'Min' : 'Мин'}
                      value={minPrice}
                      onChangeText={(text) => setMinPrice(sanitizeNumericInput(text))} // ✅ Sanitize input
                      keyboardType="decimal-pad" // ✅ Better keyboard type
                    />
                    <Text style={styles.priceCurrency}>AZN</Text>
                  </View>
                  <Text style={styles.priceRangeSeparator}>-</Text>
                  <View style={styles.priceInputContainer}>
                    <TextInput
                      style={styles.priceInput}
                      placeholder={language === 'az' ? 'Max' : 'Макс'}
                      value={maxPrice}
                      onChangeText={(text) => setMaxPrice(sanitizeNumericInput(text))} // ✅ Sanitize input
                      keyboardType="decimal-pad" // ✅ Better keyboard type
                    />
                    <Text style={styles.priceCurrency}>AZN</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.priceApplyButton}
                    onPress={handlePriceRangeApply}
                  >
                    <Text style={styles.priceApplyButtonText}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {(selectedCategory || selectedSubcategory || priceRange.min || priceRange.max || searchImage) && (
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>
                  {language === 'az' ? 'Filtrləri təmizlə' : 'Очистить фильтры'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.listingContainer}>
        <ListingGrid />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    backgroundColor: Colors.background,
    zIndex: 1,
  },
  listingContainer: {
    flex: 1,
  },
  imageSearchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  imageSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  imageSearchText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary,
    marginHorizontal: 8,
    flex: 1,
  },
  sortToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  sortToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 8,
  },
  sortOptions: {
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    padding: 8,
  },
  sortOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectedSortOption: {
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
  },
  sortOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedSortOptionText: {
    color: Colors.primary,
    fontWeight: '500',
  },
  filtersContainer: {
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    maxHeight: 300,
  },
  filtersScroll: {
    paddingVertical: 12,
  },
  filterSection: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Colors.text,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  selectedOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  selectedOptionText: {
    color: 'white',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  priceInput: {
    flex: 1,
    padding: 10,
    fontSize: 14,
  },
  priceCurrency: {
    paddingHorizontal: 8,
    color: Colors.textSecondary,
  },
  priceRangeSeparator: {
    paddingHorizontal: 8,
    color: Colors.textSecondary,
  },
  priceApplyButton: {
    marginLeft: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  priceApplyButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  clearButton: {
    alignSelf: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.error,
  },
  clearButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
});

import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useListingStore } from '@/store/listingStore';
import { categories } from '@/constants/categories';
import ListingGrid from '@/components/ListingGrid';
import Colors from '@/constants/colors';

export default function CategoryScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { selectedCategory, selectedSubcategory, setSelectedSubcategory } = useListingStore();
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState<number | null>(null);

  const category = categories.find(c => c.id === selectedCategory);
  const subcategory = category?.subcategories.find(s => s.id === selectedSubcategory);
  const subSubcategory = subcategory?.subcategories?.find(ss => ss.id === selectedSubSubcategory);

  const title = subSubcategory
    ? subSubcategory.name[language]
    : subcategory
      ? subcategory.name[language]
      : category
        ? category.name[language]
        : language === 'az'
          ? 'Bütün elanlar'
          : 'Все объявления';

  const handleSubcategoryPress = (subcategoryId: number) => {
    setSelectedSubcategory(subcategoryId);
    setSelectedSubSubcategory(null);
  };

  const handleSubSubcategoryPress = (subSubcategoryId: number) => {
    setSelectedSubSubcategory(subSubcategoryId);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title }} />

      {category && (
        <View style={styles.subcategoriesContainer}>
          <Text style={styles.subcategoriesTitle}>
            {language === 'az' ? 'Alt kateqoriyalar' : 'Подкатегории'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subcategoriesScroll}
          >
            <TouchableOpacity
              style={[
                styles.subcategoryItem,
                selectedSubcategory === null && styles.selectedSubcategory,
              ]}
              onPress={() => {
                setSelectedSubcategory(null);
                setSelectedSubSubcategory(null);
              }}
            >
              <Text style={[
                styles.subcategoryText,
                selectedSubcategory === null && styles.selectedSubcategoryText,
              ]}>
                {language === 'az' ? 'Hamısı' : 'Все'}
              </Text>
            </TouchableOpacity>

            {category.subcategories.map(sub => (
              <TouchableOpacity
                key={sub.id}
                style={[
                  styles.subcategoryItem,
                  selectedSubcategory === sub.id && styles.selectedSubcategory,
                ]}
                onPress={() => handleSubcategoryPress(sub.id)}
              >
                <Text style={[
                  styles.subcategoryText,
                  selectedSubcategory === sub.id && styles.selectedSubcategoryText,
                ]}>
                  {sub.name[language]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {subcategory && subcategory.subcategories && subcategory.subcategories.length > 0 && (
        <View style={styles.subcategoriesContainer}>
          <Text style={styles.subcategoriesTitle}>
            {language === 'az' ? 'Daha alt kateqoriyalar' : 'Подподкатегории'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subcategoriesScroll}
          >
            <TouchableOpacity
              style={[
                styles.subcategoryItem,
                selectedSubSubcategory === null && styles.selectedSubcategory,
              ]}
              onPress={() => setSelectedSubSubcategory(null)}
            >
              <Text style={[
                styles.subcategoryText,
                selectedSubSubcategory === null && styles.selectedSubcategoryText,
              ]}>
                {language === 'az' ? 'Hamısı' : 'Все'}
              </Text>
            </TouchableOpacity>

            {subcategory.subcategories.map(subSub => (
              <TouchableOpacity
                key={subSub.id}
                style={[
                  styles.subcategoryItem,
                  selectedSubSubcategory === subSub.id && styles.selectedSubcategory,
                ]}
                onPress={() => handleSubSubcategoryPress(subSub.id)}
              >
                <Text style={[
                  styles.subcategoryText,
                  selectedSubSubcategory === subSub.id && styles.selectedSubcategoryText,
                ]}>
                  {subSub.name[language]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ListingGrid />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  subcategoriesContainer: {
    backgroundColor: Colors.card,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  subcategoriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 16,
    color: Colors.text,
  },
  subcategoriesScroll: {
    paddingHorizontal: 12,
  },
  subcategoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedSubcategory: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  subcategoryText: {
    fontSize: 14,
    color: Colors.text,
  },
  selectedSubcategoryText: {
    color: 'white',
    fontWeight: '500',
  },
});

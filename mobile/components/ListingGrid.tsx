import React, { useEffect, useState, useCallback, memo } from 'react';
import { View, StyleSheet, Text, ScrollView, ActivityIndicator, RefreshControl, Dimensions, Platform } from 'react-native';
import { useListingStore } from '@/store/listingStore';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import ListingCard from './ListingCard';
import { getColors } from '@/constants/colors';

function ListingGrid() {
  const { filteredListings, applyFilters } = useListingStore();
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const colors = getColors(themeMode, colorTheme);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        applyFilters();
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [applyFilters]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    applyFilters();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, [applyFilters]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {language === 'az' ? 'Yüklənir...' : 'Загрузка...'}
        </Text>
      </View>
    );
  }

  if (filteredListings.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {language === 'az'
            ? 'Heç bir elan tapılmadı'
            : 'Объявления не найдены'}
        </Text>
        <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
          {language === 'az'
            ? 'Filtrləri dəyişdirməyə cəhd edin'
            : 'Попробуйте изменить фильтры'}
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollContainer, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.grid}>
        {filteredListings.map((item) => (
          <View key={item.id} style={styles.gridItem}>
            <ListingCard listing={item} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    padding: 12,
    paddingBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: Platform.select({
      web: Dimensions.get('window').width > 1024 ? '24%' :
        Dimensions.get('window').width > 768 ? '32%' : '49%',
      default: '49%',
    }),
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 400,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default memo(ListingGrid);

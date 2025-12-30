import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLanguageStore } from '@/store/languageStore';
import { useListingStore } from '@/store/listingStore';
import { useThemeStore } from '@/store/themeStore';
import ListingCard from './ListingCard';
import { getColors } from '@/constants/colors';
import { t } from '@/constants/translations';

export default function FeaturedListings() {
  const { language } = useLanguageStore();
  const { listings } = useListingStore();
  const { themeMode, colorTheme } = useThemeStore();
  const colors = getColors(themeMode, colorTheme);

  const featuredListings = useMemo(() =>
    listings.filter(listing => listing.isFeatured),
  [listings],
  );

  if (featuredListings.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('featuredListings', language)}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {featuredListings.map(item => (
          <View key={item.id} style={styles.cardContainer}>
            <ListingCard listing={item} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

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
  listContent: {
    paddingHorizontal: 16,
  },
  cardContainer: {
    marginRight: 12,
    width: 200,
  },
});

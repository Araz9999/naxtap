import React, { useEffect, useRef, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Text, Animated, Easing, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useListingStore } from '@/store/listingStore';
import { useStoreStore } from '@/store/storeStore';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import SearchBar from '@/components/SearchBar';
import CategoryList from '@/components/CategoryList';
import FeaturedListings from '@/components/FeaturedListings';
import ListingGrid from '@/components/ListingGrid';
import { getColors } from '@/constants/colors';
import { t } from '@/constants/translations';
import { Store } from 'lucide-react-native';

import { logger } from '@/utils/logger';
export default function HomeScreen() {
  const router = useRouter();
  const { resetFilters } = useListingStore();
  const { stores } = useStoreStore();
  const languageStore = useLanguageStore();
  const language = languageStore?.language || 'az';
  const { themeMode, colorTheme, fontSize, autoRefresh } = useThemeStore();

  // Memoize colors to prevent recalculation on every render
  const colors = React.useMemo(() => getColors(themeMode, colorTheme), [themeMode, colorTheme]);

  // Animation values for Naxtap
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Animation values for Naxçıvan elanları
  const naxcivanSlideAnim = useRef(new Animated.Value(-200)).current;
  const naxcivanFadeAnim = useRef(new Animated.Value(0)).current;
  const naxcivanScaleAnim = useRef(new Animated.Value(0.8)).current;

  // Memoize expensive filtering operations
  const activeStores = React.useMemo(
    () => stores.filter(store => store.isActive).slice(0, 4),
    [stores],
  );

  const handleResetFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  useEffect(() => {
    handleResetFilters();
  }, [handleResetFilters]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        logger.debug('Auto refreshing data...');
        // ✅ TODO: Implement actual data refresh when backend is ready
        // Future implementation:
        // - Refetch listings from API
        // - Update stores data
        // - Show refresh indicator
        // - Handle errors gracefully
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  useEffect(() => {
    // ✅ Track component mount status to prevent memory leaks
    let isMounted = true;

    // Start the logo animation
    const animateLoop = () => {
      // ✅ Check if component is still mounted before starting animation
      if (!isMounted) return;

      // Naxtap animation
      Animated.sequence([
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: false,
          }),
        ]),
        Animated.delay(2000),
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 200,
            duration: 800,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: false,
          }),
        ]),
        Animated.delay(500),
        // Naxçıvan elanları animation starts
        Animated.parallel([
          Animated.timing(naxcivanSlideAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(naxcivanFadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(naxcivanScaleAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: false,
          }),
        ]),
        Animated.delay(2000),
        Animated.parallel([
          Animated.timing(naxcivanSlideAnim, {
            toValue: 200,
            duration: 800,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(naxcivanFadeAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(naxcivanScaleAnim, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: false,
          }),
        ]),
        Animated.delay(1000),
      ]).start(() => {
        // ✅ Check mount status before looping
        if (!isMounted) return;

        slideAnim.setValue(-200);
        naxcivanSlideAnim.setValue(-200);
        animateLoop();
      });
    };

    animateLoop();

    // Cleanup function to stop animation when component unmounts
    return () => {
      isMounted = false; // ✅ Mark as unmounted to stop future iterations
      slideAnim.stopAnimation();
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();
      naxcivanSlideAnim.stopAnimation();
      naxcivanFadeAnim.stopAnimation();
      naxcivanScaleAnim.stopAnimation();
    };
  }, [fadeAnim, naxcivanFadeAnim, naxcivanScaleAnim, naxcivanSlideAnim, scaleAnim, slideAnim]); // animation refs are stable

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Animated.View
            style={[
              styles.animatedLogoContainer,
              {
                transform: [
                  { translateX: slideAnim },
                  { scale: scaleAnim },
                ],
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.logoImageContainer}>
              <Animated.Image
                source={{ uri: 'https://r2-pub.rork.com/attachments/0m8bxdm8jpnwhv8znvvka' }}
                style={[
                  styles.logoImage,
                  {
                    transform: [{ rotate: '360deg' }],
                  },
                ]}
              />
            </View>
            <View style={styles.logoTextContainer}>
              <Text style={styles.logoTextN}>N</Text>
              <Text style={styles.logoTextA}>a</Text>
              <Text style={styles.logoTextX}>x</Text>
              <Text style={styles.logoTextT}>t</Text>
              <Text style={styles.logoTextA2}>a</Text>
              <Text style={styles.logoTextP}>p</Text>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.animatedNaxcivanContainer,
              {
                transform: [
                  { translateX: naxcivanSlideAnim },
                  { scale: naxcivanScaleAnim },
                ],
                opacity: naxcivanFadeAnim,
              },
            ]}
          >
            <Text style={styles.naxcivanText}>
              {t('naxcivanListings', language)}
            </Text>
          </Animated.View>
        </View>
        <LanguageSwitcher />
      </View>
      <SearchBar />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        removeClippedSubviews
      >
        <CategoryList />
        <FeaturedListings />

        {activeStores.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSize === 'small' ? 16 : fontSize === 'large' ? 20 : 18 }]}>
                {t('stores', language)}
              </Text>
              <TouchableOpacity onPress={() => router.push('/stores')}>
                <Text style={[styles.seeAllText, { color: colors.primary, fontSize: fontSize === 'small' ? 12 : fontSize === 'large' ? 16 : 14 }]}>
                  {t('seeAll', language)}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storesScroll}>
              {activeStores.map((store) => (
                <TouchableOpacity
                  key={store.id}
                  style={[styles.storeCard, { backgroundColor: colors.card }]}
                  onPress={() => router.push(`/store/${store.id}`)}
                >
                  <View style={styles.storeImageContainer}>
                    {store.logo ? (
                      <Image source={{ uri: store.logo }} style={styles.storeLogo} />
                    ) : (
                      <View style={styles.logoPlaceholder}>
                        <Store size={24} color={colors.primary} />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.storeName, { color: colors.text, fontSize: fontSize === 'small' ? 12 : fontSize === 'large' ? 16 : 14 }]} numberOfLines={1}>
                    {store.name}
                  </Text>
                  <Text style={[styles.storeCategory, { color: colors.textSecondary, fontSize: fontSize === 'small' ? 10 : fontSize === 'large' ? 14 : 12 }]} numberOfLines={1}>
                    {store.categoryName}
                  </Text>
                  <View style={[styles.storeBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.storeBadgeText, { fontSize: fontSize === 'small' ? 7 : fontSize === 'large' ? 9 : 8 }]}>
                      {t('store', language)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.recentListings}>
          <ListingGrid />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    overflow: 'hidden',
  },
  animatedLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImageContainer: {
    marginRight: 8,
    shadowColor: '#0E7490',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  logoTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTextN: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  logoTextA: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  logoTextX: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  logoTextT: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  logoTextA2: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  logoTextP: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  animatedNaxcivanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
  },
  naxcivanText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
    fontStyle: 'italic',
    textShadowColor: 'rgba(220, 38, 38, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    paddingBottom: 20,
  },
  recentListings: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  seeAllText: {
    fontWeight: '500',
  },
  storesScroll: {
    marginTop: 12,
  },
  storeCard: {
    width: 120,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  storeImageContainer: {
    marginBottom: 8,
  },
  storeLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeName: {
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  storeCategory: {
    textAlign: 'center',
  },
  storeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  storeBadgeText: {
    fontWeight: '600',
    color: 'white',
  },
});

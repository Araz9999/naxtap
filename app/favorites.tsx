import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useUserStore } from '@/store/userStore';
import { useListingStore } from '@/store/listingStore';
import ListingCard from '@/components/ListingCard';
import Colors from '@/constants/colors';
import { Heart, ArrowLeft } from 'lucide-react-native';

export default function FavoritesScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { favorites, isAuthenticated } = useUserStore();
  const { listings } = useListingStore();

  const favoriteListings = listings.filter(listing => favorites.includes(listing.id));

  if (!isAuthenticated) {
    return (
      <>
        <Stack.Screen
          options={{
            title: language === 'az' ? 'Seçilmişlər' : 'Избранное',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={Colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.authContainer}>
          <Heart size={64} color={Colors.textSecondary} />
          <Text style={styles.authTitle}>
            {language === 'az'
              ? 'Seçilmişləri görmək üçün hesabınıza daxil olun'
              : 'Войдите в аккаунт, чтобы увидеть избранное'}
          </Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.authButtonText}>
              {language === 'az' ? 'Daxil ol' : 'Войти'}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: language === 'az' ? 'Seçilmişlər' : 'Избранное',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {favoriteListings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Heart size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>
              {language === 'az' ? 'Seçilmiş elan yoxdur' : 'Нет избранных объявлений'}
            </Text>
            <Text style={styles.emptyDescription}>
              {language === 'az'
                ? 'Bəyəndiyiniz elanları ürək ikonuna toxunaraq seçilmişlərə əlavə edin'
                : 'Добавляйте понравившиеся объявления в избранное, нажав на иконку сердца'}
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push('/')}
            >
              <Text style={styles.browseButtonText}>
                {language === 'az' ? 'Elanlara bax' : 'Просмотреть объявления'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.listingsContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.countText}>
              {language === 'az'
                ? `${favoriteListings.length} seçilmiş elan`
                : `${favoriteListings.length} избранных объявлений`}
            </Text>
            <View style={styles.gridContainer} testID="favorites-grid">
              {favoriteListings.map((listing) => (
                <View key={listing.id} style={styles.gridItem} testID={`favorite-item-${listing.id}`}>
                  <ListingCard
                    listing={listing}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  listingsContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: 16,
  },
  countText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  authTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  authButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

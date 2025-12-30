import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useStoreStore } from '@/store/storeStore';
import { useUserStore } from '@/store/userStore';
import Colors from '@/constants/colors';
import { logger } from '@/utils/logger';
import {
  Search,
  Star,
  Package,
  MapPin,
  ArrowLeft,
  Users,
  Heart,
  HeartOff,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

export default function StoresScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { stores, followStore, unfollowStore, isFollowingStore } = useStoreStore();
  const { currentUser } = useUserStore();
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ✅ Log screen access
  useEffect(() => {
    logger.info('[Stores] Screen opened:', {
      totalStores: stores.length,
      activeStores: stores.filter(s => s.isActive).length,
    });
  }, []);

  const activeStores = stores.filter(store => store.isActive);
  const filteredStores = activeStores.filter(store =>
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.categoryName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleStorePress = (storeId: string) => {
    logger.info('[Stores] Store pressed:', { storeId });
    router.push(`/store/${storeId}`);
  };

  const handleFollowToggle = async (storeId: string) => {
    if (!currentUser) {
      logger.warn('[Stores] Follow attempt without user');
      return;
    }

    // ✅ Get store
    const store = stores.find(s => s.id === storeId);
    if (!store) {
      logger.error('[Stores] Store not found for follow:', { storeId });
      return;
    }

    const isFollowing = isFollowingStore(currentUser.id, storeId);
    logger.info('[Stores] Follow toggle initiated:', {
      storeId,
      storeName: store.name,
      isFollowing,
      action: isFollowing ? 'unfollow' : 'follow',
    });

    if (isFollowing) {
      try {
        await unfollowStore(currentUser.id, storeId);
        logger.info('[Stores] Store unfollowed successfully:', { storeId });
      } catch (error) {
        logger.error('[Stores] Unfollow failed:', error);
      }
    } else {
      // ✅ Check if active
      if (!store.isActive) {
        logger.warn('[Stores] Cannot follow inactive store:', { storeId, status: store.status });
        Alert.alert(
          language === 'az' ? 'Mağaza aktiv deyil' : 'Магазин неактивен',
          language === 'az' ? 'Bu mağaza hal-hazırda aktiv deyil' : 'Этот магазин в данный момент неактивен',
        );
        return;
      }

      try {
        await followStore(currentUser.id, storeId);
        logger.info('[Stores] Store followed successfully:', { storeId });
      } catch (error) {
        logger.error('[Stores] Follow failed:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'az' ? 'Mağazalar' : 'Магазины'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={language === 'az' ? 'Mağaza axtar...' : 'Поиск магазинов...'}
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.trim()) {
                logger.info('[Stores] Search query:', { query: text, resultsCount: filteredStores.length });
              }
            }}
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredStores.length > 0 ? (
          <View style={styles.storesGrid}>
            {filteredStores.map((store) => {
              const isFollowing = currentUser ? isFollowingStore(currentUser.id, store.id) : false;
              const averageRating = store.totalRatings > 0 ? store.rating / Math.max(store.totalRatings, 1) : 0;

              return (
                <View key={store.id} style={styles.storeCard}>
                  <TouchableOpacity
                    style={styles.storeContent}
                    onPress={() => handleStorePress(store.id)}
                  >
                    <View style={styles.storeImageContainer}>
                      {store.logo ? (
                        <Image source={{ uri: store.logo }} style={styles.storeLogo} />
                      ) : (
                        <View style={styles.logoPlaceholder}>
                          <Package size={28} color={Colors.primary} />
                        </View>
                      )}
                    </View>

                    <View style={styles.storeInfo}>
                      <Text style={styles.storeName} numberOfLines={2}>
                        {store.name}
                      </Text>
                      <Text style={styles.storeCategory} numberOfLines={1}>
                        {store.categoryName}
                      </Text>

                      <View style={styles.storeStats}>
                        <View style={styles.statItem}>
                          <Star size={12} color={Colors.secondary} fill={Colors.secondary} />
                          <Text style={styles.statText}>{averageRating.toFixed(1)}</Text>
                        </View>
                        <Text style={styles.statDivider}>•</Text>
                        <View style={styles.statItem}>
                          <Users size={12} color={Colors.textSecondary} />
                          <Text style={styles.statText}>{store.followers.length}</Text>
                        </View>
                      </View>

                      <Text style={styles.adsCount}>
                        {store.adsUsed} {language === 'az' ? 'elan' : 'объявлений'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {currentUser && (
                    <TouchableOpacity
                      style={styles.followButton}
                      onPress={() => handleFollowToggle(store.id)}
                    >
                      {isFollowing ? (
                        <Heart size={16} color={Colors.error} fill={Colors.error} />
                      ) : (
                        <HeartOff size={16} color={Colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  )}

                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumText}>
                      {language === 'az' ? 'Mağaza' : 'Магазин'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Package size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>
              {searchQuery
                ? (language === 'az' ? 'Mağaza tapılmadı' : 'Магазины не найдены')
                : (language === 'az' ? 'Hələ mağaza yoxdur' : 'Пока нет магазинов')
              }
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery
                ? (language === 'az' ? 'Axtarış kriteriyalarınızı dəyişin' : 'Измените критерии поиска')
                : (language === 'az' ? 'Tezliklə mağazalar əlavə ediləcək' : 'Скоро будут добавлены магазины')
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.card,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  storesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  storeCard: {
    width: cardWidth,
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 16,
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
  storeContent: {
    padding: 12,
  },
  storeImageContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  storeLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  logoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeInfo: {
    alignItems: 'center',
  },
  storeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  storeCategory: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  storeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  statDivider: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginHorizontal: 6,
  },
  adsCount: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  followButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'white',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
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
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

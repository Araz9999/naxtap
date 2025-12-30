import React, { useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { logger } from '@/utils/logger';
import { useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useStoreStore } from '@/store/storeStore';
import { useUserStore } from '@/store/userStore';
import Colors from '@/constants/colors';
import {
  Search,
  Star,
  Package,
  Users,
  Heart,
  HeartOff,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

export default function StoresTabScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { stores, followStore, unfollowStore, isFollowingStore } = useStoreStore();
  const { currentUser } = useUserStore();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ✅ Filter active stores with validation
  const activeStores = stores.filter(store => {
    // Validate store has required fields
    if (!store || typeof store.isActive !== 'boolean') {
      logger.warn('[StoresTab] Invalid store object:', store?.id);
      return false;
    }
    return store.isActive;
  });

  // ✅ Safe search with validation and sanitization
  const filteredStores = activeStores.filter(store => {
    // Validate required fields
    if (!store.name || !store.categoryName) {
      logger.warn('[StoresTab] Store missing name or category:', store.id);
      return false;
    }

    // ✅ Sanitize and limit search query length
    const sanitizedQuery = searchQuery
      .trim()
      .toLowerCase()
      .substring(0, 200); // Max 200 chars

    if (!sanitizedQuery) return true; // Show all if empty

    const storeName = (store.name || '').toLowerCase();
    const categoryName = (store.categoryName || '').toLowerCase();

    return storeName.includes(sanitizedQuery) || categoryName.includes(sanitizedQuery);
  });

  const handleStorePress = (storeId: string) => {
    router.push(`/store/${storeId}`);
  };

  const handleFollowToggle = async (storeId: string) => {
    // ✅ Validate storeId
    if (!storeId || typeof storeId !== 'string') {
      logger.error('[handleFollowToggle] Invalid storeId:', storeId);
      return;
    }

    if (!currentUser) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'İzləmək üçün daxil olun' : 'Войдите для подписки',
      );
      return;
    }

    // ✅ Set loading state
    setIsLoading(true);

    try {
      const isFollowing = isFollowingStore(currentUser.id, storeId);

      logger.debug('[handleFollowToggle] Toggling follow:', {
        userId: currentUser.id,
        storeId,
        isFollowing,
      });

      if (isFollowing) {
        await unfollowStore(currentUser.id, storeId);
        logger.debug('[handleFollowToggle] Unfollowed successfully');
      } else {
        await followStore(currentUser.id, storeId);
        logger.debug('[handleFollowToggle] Followed successfully');
      }
    } catch (error) {
      logger.error('[handleFollowToggle] Failed to toggle follow:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Əməliyyat zamanı xəta baş verdi' : 'Ошибка при выполнении операции',
      );
    } finally {
      // ✅ Always reset loading state
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={language === 'az' ? 'Mağaza axtar...' : 'Поиск магазинов...'}
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={(text) => {
              // ✅ Sanitize input
              const sanitized = text.replace(/[<>'"]/g, '').substring(0, 200);
              setSearchQuery(sanitized);
            }}
            maxLength={200}
            returnKeyType="search"
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ✅ Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}

        {filteredStores.length > 0 ? (
          <View style={[styles.storesGrid, isLoading && styles.gridDisabled]}>
            {filteredStores.map((store) => {
              const isFollowing = currentUser ? isFollowingStore(currentUser.id, store.id) : false;

              // ✅ Safe rating calculation with validation
              const averageRating = (typeof store.rating === 'number' && typeof store.totalRatings === 'number' && store.totalRatings > 0)
                ? store.rating / Math.max(store.totalRatings, 1)
                : 0;

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
                        {store.name || language === 'az' ? 'Mağaza' : 'Магазин'}
                      </Text>
                      <Text style={styles.storeCategory} numberOfLines={1}>
                        {store.categoryName || language === 'az' ? 'Kateqoriya yoxdur' : 'Нет категории'}
                      </Text>

                      <View style={styles.storeStats}>
                        <View style={styles.statItem}>
                          <Star size={12} color={Colors.secondary} fill={Colors.secondary} />
                          <Text style={styles.statText}>
                            {(isFinite(averageRating) ? averageRating : 0).toFixed(1)}
                          </Text>
                        </View>
                        <Text style={styles.statDivider}>•</Text>
                        <View style={styles.statItem}>
                          <Users size={12} color={Colors.textSecondary} />
                          <Text style={styles.statText}>
                            {Array.isArray(store.followers) ? store.followers.length : 0}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.adsCount}>
                        {typeof store.adsUsed === 'number' ? store.adsUsed : 0} {language === 'az' ? 'elan' : 'объявлений'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {currentUser && (
                    <TouchableOpacity
                      style={styles.followButton}
                      onPress={() => handleFollowToggle(store.id)}
                      disabled={isLoading}
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
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridDisabled: {
    opacity: 0.6,
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

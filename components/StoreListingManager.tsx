import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useListingStore } from '@/store/listingStore';
import { useStoreStore } from '@/store/storeStore';
import { Listing } from '@/types/listing';
import Colors from '@/constants/colors';
import { Trash2, Edit, Eye, Calendar, Star, Crown, Zap, TrendingUp } from 'lucide-react-native';

interface StoreListingManagerProps {
  storeId: string;
  listings: Listing[];
}

export default function StoreListingManager({ storeId, listings }: StoreListingManagerProps) {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { deleteListingEarly } = useListingStore();
  const { deleteListingEarly: deleteFromStore } = useStoreStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteListing = (listing: Listing) => {
    Alert.alert(
      language === 'az' ? 'Elanı Sil' : 'Удалить объявление',
      language === 'az'
        ? 'Bu elanı müddətindən əvvəl silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.'
        : 'Вы уверены, что хотите удалить это объявление досрочно? Это действие нельзя отменить.',
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'az' ? 'Sil' : 'Удалить',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(listing.id);
            try {
              // Mark listing as deleted early
              await deleteListingEarly(storeId, listing.id);

              // If listing belongs to a store, update store's deleted listings
              if (listing.storeId) {
                deleteFromStore(listing.storeId, listing.id);
              }

              Alert.alert(
                language === 'az' ? 'Uğurlu!' : 'Успешно!',
                language === 'az'
                  ? 'Elan uğurla silindi. Limit sayınız müddət bitənə qədər dəyişməyəcək.'
                  : 'Объявление успешно удалено. Ваш лимит не изменится до истечения срока.',
              );
            } catch (error) {
              Alert.alert(
                language === 'az' ? 'Xəta' : 'Ошибка',
                language === 'az' ? 'Elan silinərkən xəta baş verdi' : 'Произошла ошибка при удалении объявления',
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'az' ? 'az-AZ' : 'ru-RU');
  };

  const getPromotionIcon = (listing: Listing) => {
    if (listing.isVip) {
      return <Crown size={16} color="#FFD700" />;
    } else if (listing.isPremium) {
      return <Zap size={16} color={Colors.primary} />;
    } else if (listing.isFeatured) {
      return <Star size={16} color={Colors.secondary} />;
    }
    return <TrendingUp size={16} color={Colors.textSecondary} />;
  };

  const renderListingItem = ({ item }: { item: Listing }) => {
    const isDeleting = deletingId === item.id;
    const isDeleted = !!item.deletedAt;

    return (
      <View style={[styles.listingCard, isDeleted && styles.deletedCard]}>
        <View style={styles.listingHeader}>
          <Image
            source={{ uri: item.images[0] || 'https://via.placeholder.com/80' }}
            style={styles.listingImage}
          />
          <View style={styles.listingInfo}>
            <Text style={[styles.listingTitle, isDeleted && styles.deletedText]}>
              {item.title[language as keyof typeof item.title]}
            </Text>
            <Text style={[styles.listingPrice, isDeleted && styles.deletedText]}>
              {item.price} {item.currency}
            </Text>
            <View style={styles.listingMeta}>
              <View style={styles.metaItem}>
                <Eye size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{item.views}</Text>
              </View>
              <View style={styles.metaItem}>
                <Calendar size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
              {(item.isVip || item.isPremium || item.isFeatured) && (
                <View style={styles.metaItem}>
                  {getPromotionIcon(item)}
                  <Text style={[styles.metaText, styles.promotionText]}>
                    {item.isVip ? 'VIP' : item.isPremium ? 'Premium' : 'Featured'}
                  </Text>
                </View>
              )}
            </View>
            {isDeleted && (
              <Text style={styles.deletedLabel}>
                {language === 'az' ? 'Silinib' : 'Удалено'} - {formatDate(item.deletedAt!)}
              </Text>
            )}
          </View>
        </View>

        {!isDeleted && (
          <View style={styles.listingActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/listing/edit/${item.id}`)}
            >
              <Edit size={16} color={Colors.primary} />
              <Text style={styles.actionButtonText}>
                {language === 'az' ? 'Redaktə' : 'Редактировать'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.promoteButton]}
              onPress={() => router.push(`/listing/promote/${item.id}`)}
            >
              {getPromotionIcon(item)}
              <Text style={[styles.actionButtonText, styles.promoteButtonText]}>
                {language === 'az' ? 'Təşviq Et' : 'Продвинуть'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteListing(item)}
              disabled={isDeleting}
            >
              <Trash2 size={16} color={Colors.error} />
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                {isDeleting
                  ? (language === 'az' ? 'Silinir...' : 'Удаление...')
                  : (language === 'az' ? 'Sil' : 'Удалить')
                }
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const activeListings = listings.filter(listing => !listing.deletedAt);
  const deletedListings = listings.filter(listing => listing.deletedAt);

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {language === 'az' ? 'Aktiv Elanlar' : 'Активные объявления'} ({activeListings.length})
        </Text>
        {activeListings.length > 0 ? (
          <FlatList
            data={activeListings}
            renderItem={renderListingItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <Text style={styles.emptyText}>
            {language === 'az' ? 'Aktiv elan yoxdur' : 'Нет активных объявлений'}
          </Text>
        )}
      </View>

      {deletedListings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'az' ? 'Silinmiş Elanlar' : 'Удаленные объявления'} ({deletedListings.length})
          </Text>
          <Text style={styles.sectionDescription}>
            {language === 'az'
              ? 'Bu elanlar müddətindən əvvəl silinib, lakin limit sayınız müddət bitənə qədər dəyişməyəcək.'
              : 'Эти объявления были удалены досрочно, но ваш лимит не изменится до истечения срока.'
            }
          </Text>
          <FlatList
            data={deletedListings}
            renderItem={renderListingItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  listingCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deletedCard: {
    opacity: 0.6,
    borderColor: Colors.error,
    borderStyle: 'dashed',
  },
  listingHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  listingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  deletedText: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  listingMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  deletedLabel: {
    fontSize: 12,
    color: Colors.error,
    fontStyle: 'italic',
    marginTop: 4,
  },
  listingActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
  },
  deleteButton: {
    borderColor: Colors.error,
  },
  deleteButtonText: {
    color: Colors.error,
  },
  promoteButton: {
    borderColor: Colors.secondary,
  },
  promoteButtonText: {
    color: Colors.secondary,
  },
  promotionText: {
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 32,
    fontStyle: 'italic',
  },
});

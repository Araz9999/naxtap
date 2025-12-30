import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  Star,
  MessageSquare,
  Send,
  Filter,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Flag,
  Heart,
  Reply,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  User,
  Award,
  AlertTriangle,
} from 'lucide-react-native';
import { useStoreStore } from '@/store/storeStore';
import { useUserStore } from '@/store/userStore';
import { useRatingStore } from '@/store/ratingStore';
import COLORS from '@/constants/colors';

import { logger } from '@/utils/logger';
interface StoreReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
  notHelpful: number;
  storeResponse?: {
    message: string;
    date: string;
  };
  isVerifiedPurchase: boolean;
  images?: string[];
}

const mockReviews: StoreReview[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Əli Məmmədov',
    rating: 5,
    comment: 'Əla mağaza! Məhsullar keyfiyyətli və çatdırılma sürətli idi. Tövsiyə edirəm.',
    date: '2024-02-01T10:30:00Z',
    helpful: 12,
    notHelpful: 1,
    isVerifiedPurchase: true,
    storeResponse: {
      message: 'Təşəkkür edirik! Sizin məmnuniyyətiniz bizim üçün ən vacibdir.',
      date: '2024-02-01T14:20:00Z',
    },
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Leyla Həsənova',
    rating: 4,
    comment: 'Yaxşı xidmət, lakin çatdırılma bir az gecikdi. Ümumiyyətlə məmnunam.',
    date: '2024-01-28T16:45:00Z',
    helpful: 8,
    notHelpful: 0,
    isVerifiedPurchase: true,
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'Rəşad Əliyev',
    rating: 3,
    comment: 'Orta səviyyə. Bəzi məhsullar gözlədiyim kimi deyildi.',
    date: '2024-01-25T09:15:00Z',
    helpful: 3,
    notHelpful: 5,
    isVerifiedPurchase: false,
  },
  {
    id: '4',
    userId: 'user4',
    userName: 'Günel Qasımova',
    rating: 5,
    comment: 'Mükəmməl! Hər şey əla idi. Təkrar sifariş verəcəm.',
    date: '2024-01-20T14:30:00Z',
    helpful: 15,
    notHelpful: 0,
    isVerifiedPurchase: true,
  },
  {
    id: '5',
    userId: 'user5',
    userName: 'Kamran Nəbiyev',
    rating: 2,
    comment: 'Məhsul təsvirə uyğun deyildi. Geri qaytardım.',
    date: '2024-01-18T11:20:00Z',
    helpful: 2,
    notHelpful: 8,
    isVerifiedPurchase: true,
  },
];

const filterOptions = [
  { id: 'all', label: 'Hamısı' },
  { id: '5', label: '5 ulduz' },
  { id: '4', label: '4 ulduz' },
  { id: '3', label: '3 ulduz' },
  { id: '2', label: '2 ulduz' },
  { id: '1', label: '1 ulduz' },
  { id: 'no_response', label: 'Cavabsız' },
  { id: 'verified', label: 'Təsdiqlənmiş' },
];

export default function StoreReviewsScreen() {
  const router = useRouter();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { currentUser } = useUserStore();
  const { stores, getUserStore } = useStoreStore();

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [reviews, setReviews] = useState<StoreReview[]>(mockReviews);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<StoreReview | null>(null);
  const [responseText, setResponseText] = useState('');

  const store = storeId ? stores.find(s => s.id === storeId) : getUserStore(currentUser?.id || '');

  if (!store) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Mağaza Rəyləri' }} />
        <Text style={styles.errorText}>Mağaza tapılmadı</Text>
      </View>
    );
  }

  const filteredReviews = reviews.filter(review => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'no_response') return !review.storeResponse;
    if (selectedFilter === 'verified') return review.isVerifiedPurchase;
    return review.rating.toString() === selectedFilter;
  });

  // ✅ Prevent division by zero
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  // ✅ Prevent division by zero in distribution
  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => {
    const count = reviews.filter(r => r.rating === rating).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { rating, count, percentage };
  });

  const handleSendResponse = async () => {
    if (!selectedReview) {
      logger.error('[StoreReviews] No review selected for response');
      return;
    }

    if (!responseText.trim()) {
      logger.warn('[StoreReviews] Empty response text');
      Alert.alert('Xəta', 'Cavab mətnini daxil edin');
      return;
    }

    // ✅ Validate response length
    const trimmedResponse = responseText.trim();
    if (trimmedResponse.length < 10) {
      logger.warn('[StoreReviews] Response too short:', trimmedResponse.length);
      Alert.alert('Xəta', 'Cavab ən azı 10 simvol olmalıdır');
      return;
    }

    if (trimmedResponse.length > 500) {
      logger.warn('[StoreReviews] Response too long:', trimmedResponse.length);
      Alert.alert('Xəta', 'Cavab maksimum 500 simvol ola bilər');
      return;
    }

    logger.info('[StoreReviews] Sending response to review:', { reviewId: selectedReview.id, responseLength: trimmedResponse.length });

    try {
      // Update the review with the store response
      const updatedReviews = reviews.map(review => {
        if (review.id === selectedReview.id) {
          return {
            ...review,
            storeResponse: {
              message: responseText.trim(),
              date: new Date().toISOString(),
            },
          };
        }
        return review;
      });

      setReviews(updatedReviews);

      // In a real app, this would send the response to the API
      logger.info('[StoreReviews] Store response added successfully:', {
        reviewId: selectedReview.id,
        responseLength: trimmedResponse.length,
        timestamp: new Date().toISOString(),
      });

      Alert.alert('Uğurlu', 'Cavabınız göndərildi və görünür');
      setShowResponseModal(false);
      setResponseText('');
      setSelectedReview(null);
    } catch (error) {
      logger.error('[StoreReviews] Error sending response:', error);
      Alert.alert('Xəta', 'Cavab göndərilə bilmədi');
    }
  };

  const renderStarRating = (rating: number, size: number = 16) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            color={star <= rating ? COLORS.warning : COLORS.lightGray}
            fill={star <= rating ? COLORS.warning : 'transparent'}
          />
        ))}
      </View>
    );
  };

  const renderRatingDistribution = () => {
    return (
      <View style={styles.ratingDistribution}>
        {[...ratingDistribution].reverse().map((item) => (
          <View key={item.rating} style={styles.distributionRow}>
            <Text style={styles.distributionRating}>{item.rating}</Text>
            <Star size={14} color={COLORS.warning} fill={COLORS.warning} />
            <View style={styles.distributionBar}>
              <View
                style={[
                  styles.distributionFill,
                  { width: `${item.percentage}%` },
                ]}
              />
            </View>
            <Text style={styles.distributionCount}>({item.count})</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderReviewItem = (review: StoreReview) => {
    return (
      <View key={review.id} style={styles.reviewItem}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewUser}>
            <View style={styles.userAvatar}>
              <User size={20} color={COLORS.gray} />
            </View>
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{review.userName}</Text>
                {review.isVerifiedPurchase && (
                  <View style={styles.verifiedBadge}>
                    <Award size={12} color={COLORS.success} />
                  </View>
                )}
              </View>
              <Text style={styles.reviewDate}>
                {(() => {
                  try {
                    const date = new Date(review.date);
                    if (isNaN(date.getTime())) {
                      logger.warn('[StoreReviews] Invalid review date:', review.date);
                      return 'Tarix məlum deyil';
                    }
                    return date.toLocaleDateString('az-AZ');
                  } catch (error) {
                    logger.error('[StoreReviews] Error parsing review date:', error);
                    return 'Tarix məlum deyil';
                  }
                })()}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <MoreHorizontal size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        <View style={styles.reviewRating}>
          {renderStarRating(review.rating)}
        </View>

        <Text style={styles.reviewComment}>{review.comment}</Text>

        <View style={styles.reviewActions}>
          <View style={styles.helpfulActions}>
            <TouchableOpacity style={styles.helpfulButton}>
              <ThumbsUp size={16} color={COLORS.gray} />
              <Text style={styles.helpfulText}>{review.helpful}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helpfulButton}>
              <ThumbsDown size={16} color={COLORS.gray} />
              <Text style={styles.helpfulText}>{review.notHelpful}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton}>
              <Flag size={16} color={COLORS.gray} />
            </TouchableOpacity>
            {!review.storeResponse && (
              <TouchableOpacity
                style={styles.replyButton}
                onPress={() => {
                  setSelectedReview(review);
                  setShowResponseModal(true);
                }}
              >
                <Reply size={16} color={COLORS.primary} />
                <Text style={styles.replyText}>Cavabla</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {review.storeResponse && (
          <View style={styles.storeResponse}>
            <View style={styles.responseHeader}>
              <Text style={styles.responseLabel}>Mağaza cavabı:</Text>
              <Text style={styles.responseDate}>
                {(() => {
                  try {
                    const date = new Date(review.storeResponse.date);
                    if (isNaN(date.getTime())) {
                      logger.warn('[StoreReviews] Invalid response date:', review.storeResponse.date);
                      return 'Tarix məlum deyil';
                    }
                    return date.toLocaleDateString('az-AZ');
                  } catch (error) {
                    logger.error('[StoreReviews] Error parsing response date:', error);
                    return 'Tarix məlum deyil';
                  }
                })()}
              </Text>
            </View>
            <Text style={styles.responseMessage}>
              {review.storeResponse.message}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Mağaza Rəyləri',
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <Filter size={20} color={COLORS.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Rating Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
            {renderStarRating(Math.round(averageRating), 20)}
            <Text style={styles.totalReviews}>{reviews.length} rəy</Text>
          </View>
          <View style={styles.summaryRight}>
            {renderRatingDistribution()}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <TrendingUp size={20} color={COLORS.success} />
            <Text style={styles.statValue}>
              {reviews.filter(r => r.rating >= 4).length}
            </Text>
            <Text style={styles.statLabel}>Müsbət</Text>
          </View>
          <View style={styles.statItem}>
            <TrendingDown size={20} color={COLORS.error} />
            <Text style={styles.statValue}>
              {reviews.filter(r => r.rating <= 2).length}
            </Text>
            <Text style={styles.statLabel}>Mənfi</Text>
          </View>
          <View style={styles.statItem}>
            <MessageSquare size={20} color={COLORS.warning} />
            <Text style={styles.statValue}>
              {reviews.filter(r => !r.storeResponse).length}
            </Text>
            <Text style={styles.statLabel}>Cavabsız</Text>
          </View>
          <View style={styles.statItem}>
            <Award size={20} color={COLORS.primary} />
            <Text style={styles.statValue}>
              {reviews.filter(r => r.isVerifiedPurchase).length}
            </Text>
            <Text style={styles.statLabel}>Təsdiqlənmiş</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.filterTab,
                  selectedFilter === option.id && styles.activeFilterTab,
                ]}
                onPress={() => setSelectedFilter(option.id)}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedFilter === option.id && styles.activeFilterTabText,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Reviews List */}
        <View style={styles.reviewsList}>
          {filteredReviews.length > 0 ? (
            filteredReviews.map(renderReviewItem)
          ) : (
            <View style={styles.emptyState}>
              <MessageSquare size={48} color={COLORS.gray} />
              <Text style={styles.emptyStateTitle}>Rəy tapılmadı</Text>
              <Text style={styles.emptyStateText}>
                Seçilmiş filtrə uyğun rəy yoxdur
              </Text>
            </View>
          )}
        </View>

        {/* Response Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Cavab vermə tövsiyələri</Text>
          <View style={styles.tipItem}>
            <AlertTriangle size={16} color={COLORS.warning} />
            <Text style={styles.tipText}>
              Mənfi rəylərə tez və peşəkar cavab verin
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Heart size={16} color={COLORS.error} />
            <Text style={styles.tipText}>
              Müsbət rəylər üçün təşəkkür edin
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Calendar size={16} color={COLORS.primary} />
            <Text style={styles.tipText}>
              24 saat ərzində cavab verməyə çalışın
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Response Modal */}
      <Modal
        visible={showResponseModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rəyə Cavab Ver</Text>
            <TouchableOpacity
              onPress={() => setShowResponseModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Bağla</Text>
            </TouchableOpacity>
          </View>

          {selectedReview && (
            <View style={styles.modalContent}>
              <View style={styles.originalReview}>
                <Text style={styles.originalReviewLabel}>Orijinal rəy:</Text>
                <View style={styles.originalReviewContent}>
                  <Text style={styles.originalReviewUser}>
                    {selectedReview.userName}
                  </Text>
                  {renderStarRating(selectedReview.rating)}
                  <Text style={styles.originalReviewText}>
                    {selectedReview.comment}
                  </Text>
                </View>
              </View>

              <View style={styles.responseForm}>
                <Text style={styles.responseFormLabel}>Sizin cavabınız:</Text>
                <TextInput
                  style={styles.responseInput}
                  value={responseText}
                  onChangeText={setResponseText}
                  placeholder="Rəyə cavabınızı yazın..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    !responseText.trim() && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSendResponse}
                  disabled={!responseText.trim()}
                >
                  <Send size={20} color={COLORS.white} />
                  <Text style={styles.sendButtonText}>Cavab Göndər</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 50,
  },
  headerButton: {
    padding: 8,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  summaryLeft: {
    alignItems: 'center',
    marginRight: 24,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalReviews: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
  },
  summaryRight: {
    flex: 1,
  },
  ratingDistribution: {
    flex: 1,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  distributionRating: {
    fontSize: 14,
    color: COLORS.text,
    width: 12,
    marginRight: 8,
  },
  distributionBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  distributionFill: {
    height: '100%',
    backgroundColor: COLORS.warning,
    borderRadius: 4,
  },
  distributionCount: {
    fontSize: 12,
    color: COLORS.gray,
    width: 24,
    textAlign: 'right',
  },
  statsContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    marginBottom: 8,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
  },
  activeFilterTab: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },
  activeFilterTabText: {
    color: COLORS.white,
  },
  reviewsList: {
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  reviewItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  verifiedBadge: {
    marginLeft: 8,
    backgroundColor: `${COLORS.success}20`,
    borderRadius: 10,
    padding: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  moreButton: {
    padding: 4,
  },
  reviewRating: {
    marginBottom: 12,
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewComment: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helpfulActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  helpfulText: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${COLORS.primary}20`,
    borderRadius: 16,
    marginLeft: 8,
  },
  replyText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  storeResponse: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  responseDate: {
    fontSize: 12,
    color: COLORS.gray,
  },
  responseMessage: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  tipsSection: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  originalReview: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  originalReviewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  originalReviewContent: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
  },
  originalReviewUser: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  originalReviewText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginTop: 8,
  },
  responseForm: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
  },
  responseFormLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  responseInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    height: 120,
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 8,
  },
});

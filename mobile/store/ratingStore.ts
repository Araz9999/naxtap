import { create } from 'zustand';
import { Rating, RatingWithUser, RatingStats, RatingValidation, UserRatingHistory } from '@/types/rating';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { logger } from '@/utils/logger';
interface RatingStore {
  ratings: Rating[];
  ratingHistory: UserRatingHistory[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addRating: (rating: Omit<Rating, 'id' | 'createdAt' | 'updatedAt' | 'deviceId' | 'ipAddress' | 'isVerified'>) => Promise<void>;
  getRatingsForTarget: (targetId: string, targetType: 'store' | 'user') => RatingWithUser[];
  getRatingStats: (targetId: string, targetType: 'store' | 'user') => RatingStats;
  validateRating: (userId: string, targetId: string, targetType: 'store' | 'user') => RatingValidation;
  loadRatings: () => Promise<void>;
  saveRatings: () => Promise<void>;
  loadRatingHistory: () => Promise<void>;
  saveRatingHistory: () => Promise<void>;
}

const RATINGS_STORAGE_KEY = 'app_ratings';
const RATING_HISTORY_STORAGE_KEY = 'app_rating_history';

// Anti-fraud constants
const RATING_COOLDOWN_HOURS = 24; // 24 hours between ratings for same target
const MAX_RATINGS_PER_TARGET = 1; // Only 1 rating per user per target
const MAX_DAILY_RATINGS = 5; // Max 5 ratings per day per user

export const useRatingStore = create<RatingStore>((set, get) => ({
  ratings: [],
  ratingHistory: [],
  isLoading: false,
  error: null,

  addRating: async (ratingData) => {
    try {
      set({ isLoading: true, error: null });

      // ✅ Input validation
      if (!ratingData.userId || typeof ratingData.userId !== 'string') {
        logger.error('[RatingStore] Invalid userId:', ratingData.userId);
        throw new Error('Invalid user ID');
      }

      if (!ratingData.targetId || typeof ratingData.targetId !== 'string') {
        logger.error('[RatingStore] Invalid targetId:', ratingData.targetId);
        throw new Error('Invalid target ID');
      }

      if (typeof ratingData.rating !== 'number' || ratingData.rating < 1 || ratingData.rating > 5) {
        logger.error('[RatingStore] Invalid rating value:', ratingData.rating);
        throw new Error('Rating must be between 1 and 5');
      }

      logger.info('[RatingStore] Adding rating:', { userId: ratingData.userId, targetId: ratingData.targetId, rating: ratingData.rating });

      // Validate rating before adding
      const validation = get().validateRating(ratingData.userId, ratingData.targetId, ratingData.targetType);
      if (!validation.canRate) {
        logger.warn('[RatingStore] Cannot add rating:', validation.reason);
        throw new Error(validation.reason || 'Cannot add rating');
      }

      // Get device info for fraud detection
      let deviceId = 'unknown';
      if (Platform.OS !== 'web') {
        try {
          const Device = await import('expo-device');
          deviceId = Device.osInternalBuildId || Device.modelId || 'unknown';
        } catch (error) {
          logger.warn('[RatingStore] Device info not available:', error);
        }
      }

      // ✅ Generate unique ID
      const newRating: Rating = {
        ...ratingData,
        id: `rating-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deviceId,
        ipAddress: 'unknown', // In real app, get from server
        isVerified: !!ratingData.transactionId, // Verified if has transaction
      };

      const currentRatings = get().ratings;
      const updatedRatings = [...currentRatings, newRating];

      // Update rating history
      const currentHistory = get().ratingHistory;
      const existingHistoryIndex = currentHistory.findIndex(
        h => h.userId === ratingData.userId && h.targetId === ratingData.targetId && h.targetType === ratingData.targetType,
      );

      let updatedHistory = [...currentHistory];
      if (existingHistoryIndex >= 0) {
        updatedHistory[existingHistoryIndex] = {
          ...updatedHistory[existingHistoryIndex],
          lastRatingAt: new Date().toISOString(),
          ratingCount: updatedHistory[existingHistoryIndex].ratingCount + 1,
        };
      } else {
        updatedHistory = [...updatedHistory, {
          userId: ratingData.userId,
          targetId: ratingData.targetId,
          targetType: ratingData.targetType,
          lastRatingAt: new Date().toISOString(),
          ratingCount: 1,
        }];
      }

      set({ ratings: updatedRatings, ratingHistory: updatedHistory });
      await get().saveRatings();
      await get().saveRatingHistory();

      logger.info('[RatingStore] Rating added successfully:', { ratingId: newRating.id, rating: newRating.rating });
    } catch (error) {
      logger.error('[RatingStore] Error adding rating:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to add rating' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  getRatingsForTarget: (targetId, targetType) => {
    if (!targetId) {
      logger.error('[RatingStore] No targetId provided to getRatingsForTarget');
      return [];
    }

    const ratings = get().ratings.filter(
      rating => rating.targetId === targetId && rating.targetType === targetType,
    );

    logger.info('[RatingStore] Retrieved ratings for target:', { targetId, targetType, count: ratings.length });

    // Mock user data - in real app this would come from user store or API
    const mockUsers = [
      {
        id: 'user1',
        name: 'Əli Məmmədov',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      },
      {
        id: 'user2',
        name: 'Leyla Həsənova',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      },
      {
        id: 'user3',
        name: 'Rəşad Hüseynov',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      },
    ];

    return ratings.map(rating => ({
      ...rating,
      user: mockUsers.find(user => user.id === rating.userId) || {
        id: rating.userId,
        name: 'Unknown User',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      },
    }));
  },

  getRatingStats: (targetId, targetType) => {
    if (!targetId) {
      logger.error('[RatingStore] No targetId provided to getRatingStats');
      return {
        averageRating: 0,
        totalRatings: 0,
        verifiedRatings: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        verifiedRatingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const ratings = get().ratings.filter(
      rating => rating.targetId === targetId && rating.targetType === targetType,
    );

    const verifiedRatings = ratings.filter(rating => rating.isVerified);

    if (ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        verifiedRatings: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        verifiedRatingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    // Calculate overall stats
    const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    // ✅ Prevent division by zero (already checked above, but extra safety)
    const averageRating = ratings.length > 0 ? totalRating / ratings.length : 0;

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(rating => {
      // ✅ Validate rating value before using as key
      if (rating.rating >= 1 && rating.rating <= 5) {
        ratingDistribution[rating.rating as keyof typeof ratingDistribution]++;
      } else {
        logger.warn('[RatingStore] Invalid rating value in distribution:', rating.rating);
      }
    });

    // Calculate verified stats
    const verifiedRatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    verifiedRatings.forEach(rating => {
      // ✅ Validate rating value before using as key
      if (rating.rating >= 1 && rating.rating <= 5) {
        verifiedRatingDistribution[rating.rating as keyof typeof verifiedRatingDistribution]++;
      } else {
        logger.warn('[RatingStore] Invalid verified rating value:', rating.rating);
      }
    });

    return {
      averageRating,
      totalRatings: ratings.length,
      verifiedRatings: verifiedRatings.length,
      ratingDistribution,
      verifiedRatingDistribution,
    };
  },

  validateRating: (userId, targetId, targetType) => {
    // ✅ Input validation
    if (!userId || !targetId) {
      logger.error('[RatingStore] Missing userId or targetId for validation');
      return { canRate: false, reason: 'Invalid input' };
    }

    const currentHistory = get().ratingHistory;
    const userHistory = currentHistory.find(
      h => h.userId === userId && h.targetId === targetId && h.targetType === targetType,
    );

    // Check if user already rated this target
    if (userHistory && userHistory.ratingCount >= MAX_RATINGS_PER_TARGET) {
      return {
        canRate: false,
        reason: 'Bu hədəfə artıq reyting vermisiniz',
      };
    }

    // Check cooldown period
    if (userHistory && userHistory.lastRatingAt) {
      const lastRatingTime = new Date(userHistory.lastRatingAt).getTime();

      // ✅ Validate date
      if (isNaN(lastRatingTime)) {
        logger.error('[RatingStore] Invalid lastRatingAt date:', userHistory.lastRatingAt);
        return { canRate: true }; // Allow rating if date is invalid
      }

      const now = new Date().getTime();
      const hoursSinceLastRating = (now - lastRatingTime) / (1000 * 60 * 60);

      if (hoursSinceLastRating < RATING_COOLDOWN_HOURS) {
        const cooldownEndsAt = new Date(lastRatingTime + (RATING_COOLDOWN_HOURS * 60 * 60 * 1000)).toISOString();
        return {
          canRate: false,
          reason: `${RATING_COOLDOWN_HOURS} saat gözləməlisiniz`,
          cooldownEndsAt,
        };
      }
    }

    // Check daily rating limit
    const today = new Date().toDateString();
    const todayRatings = get().ratings.filter(rating => {
      const ratingDate = new Date(rating.createdAt).toDateString();
      return rating.userId === userId && ratingDate === today;
    });

    if (todayRatings.length >= MAX_DAILY_RATINGS) {
      return {
        canRate: false,
        reason: `Gündə maksimum ${MAX_DAILY_RATINGS} reyting verə bilərsiniz`,
      };
    }

    // Check if user is trying to rate themselves
    if (userId === targetId && targetType === 'user') {
      return {
        canRate: false,
        reason: 'Özünüzə reyting verə bilməzsiniz',
      };
    }

    return { canRate: true };
  },

  loadRatings: async () => {
    try {
      set({ isLoading: true, error: null });
      const stored = await AsyncStorage.getItem(RATINGS_STORAGE_KEY);
      if (stored) {
        let ratings;
        try {
          ratings = JSON.parse(stored);
          // ✅ Validate parsed data
          if (!Array.isArray(ratings)) {
            logger.error('[RatingStore] Invalid ratings data format, expected array');
            ratings = [];
          }
        } catch (error) {
          logger.error('[RatingStore] Error parsing ratings JSON:', error);
          ratings = [];
        }
        set({ ratings });
        logger.info('[RatingStore] Ratings loaded successfully:', { count: ratings.length });
      }
      await get().loadRatingHistory();
    } catch (error) {
      logger.error('[RatingStore] Error loading ratings:', error);
      set({ error: 'Failed to load ratings' });
    } finally {
      set({ isLoading: false });
    }
  },

  saveRatings: async () => {
    try {
      const ratings = get().ratings;
      await AsyncStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(ratings));
      logger.info('[RatingStore] Ratings saved successfully:', { count: ratings.length });
    } catch (error) {
      logger.error('[RatingStore] Error saving ratings:', error);
      set({ error: 'Failed to save ratings' });
    }
  },

  loadRatingHistory: async () => {
    try {
      const stored = await AsyncStorage.getItem(RATING_HISTORY_STORAGE_KEY);
      if (stored) {
        let ratingHistory;
        try {
          ratingHistory = JSON.parse(stored);
          // ✅ Validate parsed data
          if (!Array.isArray(ratingHistory)) {
            logger.error('[RatingStore] Invalid rating history format, expected array');
            ratingHistory = [];
          }
        } catch (error) {
          logger.error('[RatingStore] Error parsing rating history JSON:', error);
          ratingHistory = [];
        }
        set({ ratingHistory });
        logger.info('[RatingStore] Rating history loaded successfully:', { count: ratingHistory.length });
      }
    } catch (error) {
      logger.error('[RatingStore] Error loading rating history:', error);
    }
  },

  saveRatingHistory: async () => {
    try {
      const ratingHistory = get().ratingHistory;
      await AsyncStorage.setItem(RATING_HISTORY_STORAGE_KEY, JSON.stringify(ratingHistory));
      logger.info('[RatingStore] Rating history saved successfully:', { count: ratingHistory.length });
    } catch (error) {
      logger.error('[RatingStore] Error saving rating history:', error);
    }
  },
}));

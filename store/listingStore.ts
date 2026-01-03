import { create } from 'zustand';
import { Listing } from '@/types/listing';
import { useThemeStore } from './themeStore';
import { useUserStore } from '@/store/userStore';
import { logger } from '@/utils/logger';
import { trpcClient } from '@/lib/trpc';

type ListingCreativeEffect = NonNullable<Listing['creativeEffects']>[number];
type CreativeEffectInput = Omit<ListingCreativeEffect, 'endDate' | 'isActive'>;
type CreativeEffectEndDateInput = { endDate: Date };

interface ListingState {
  listings: Listing[];
  filteredListings: Listing[];
  searchQuery: string;
  selectedCategory: number | null;
  selectedSubcategory: number | null;
  priceRange: { min: number | null; max: number | null };
  sortBy: 'date' | 'price-asc' | 'price-desc' | null;
  userUnusedViews: { [userId: string]: number };
  isLoading: boolean;
  error: string | null;

  // ✅ Timeout tracking for cleanup
  notificationTimeouts: Map<string, ReturnType<typeof setTimeout>>;

  fetchListings: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (categoryId: number | null) => void;
  setSelectedSubcategory: (subcategoryId: number | null) => void;
  setPriceRange: (min: number | null, max: number | null) => void;
  setSortBy: (sort: 'date' | 'price-asc' | 'price-desc' | null) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  addListing: (listing: Listing) => void;
  updateListing: (id: string, updates: Partial<Listing>) => void;
  archiveListing: (id: string) => Promise<void>;
  reactivateListing: (id: string, packageId: string) => Promise<void>;
  getArchivedListings: (userId: string) => Listing[];
  getExpiringListings: (userId: string, days: number) => Listing[];
  deleteListing: (id: string) => void;
  deleteListingEarly: (storeId: string, id: string) => Promise<void>;
  addListingToStore: (listing: Listing, storeId?: string) => Promise<void>;
  promoteListing: (id: string, type: 'premium' | 'vip' | 'featured', duration: number) => Promise<void>;
  promoteListingInStore: (id: string, type: 'vip' | 'premium' | 'featured', price: number) => Promise<void>;
  incrementViewCount: (id: string) => void;
  checkExpiringListings: () => void;
  purchaseViews: (id: string, viewCount: number) => Promise<void>;
  applyCreativeEffects: (
    id: string,
    effects: CreativeEffectInput[],
    effectEndDates: CreativeEffectEndDateInput[],
  ) => Promise<void>;
  getUserUnusedViews: (userId: string) => number;
  transferUnusedViewsToNewListing: (userId: string, listingId: string) => void;

  // ✅ Cleanup
  cleanupTimeouts: () => void;
}

let expiringListingsInterval: ReturnType<typeof setInterval> | null = null;

export const initListingStoreInterval = () => {
  if (expiringListingsInterval) {
    clearInterval(expiringListingsInterval);
  }
  expiringListingsInterval = setInterval(() => {
    const store = useListingStore.getState();
    store.checkExpiringListings();
  }, 60 * 60 * 1000);
};

export const cleanupListingStoreInterval = () => {
  if (expiringListingsInterval) {
    clearInterval(expiringListingsInterval);
    expiringListingsInterval = null;
  }
};

export const useListingStore = create<ListingState>((set, get) =>
  // Cast to ListingState to ensure the returned object satisfies the interface.
  // This also helps TypeScript when implementations are lengthy and inferred types may be narrower.
  ({
    listings: [],
    filteredListings: [],
    searchQuery: '',
    selectedCategory: null,
    selectedSubcategory: null,
    priceRange: { min: null, max: null },
    sortBy: null,
    userUnusedViews: {},
    isLoading: false,
    error: null,

    // ✅ Initialize timeout map
    notificationTimeouts: new Map(),

    fetchListings: async () => {
      try {
        set({ isLoading: true, error: null });
        const listings = await trpcClient.listing.getAll.query();
        set({
          listings: listings as Listing[],
          filteredListings: listings as Listing[],
          isLoading: false,
        });
        get().applyFilters();
      } catch (error) {
        logger.error('[ListingStore] Failed to fetch listings:', error);
        set({
          error: 'Failed to load listings',
          isLoading: false,
        });
      }
    },

    setSearchQuery: (query: string) => {
      set({ searchQuery: query });
      get().applyFilters();
    },

    setSelectedCategory: (categoryId: number | null) => {
      set({
        selectedCategory: categoryId,
        selectedSubcategory: null,
      });
      get().applyFilters();
    },

    setSelectedSubcategory: (subcategoryId: number | null) => {
      set({ selectedSubcategory: subcategoryId });
      get().applyFilters();
    },

    setPriceRange: (min: number | null, max: number | null) => {
      set({ priceRange: { min, max } });
      get().applyFilters();
    },

    setSortBy: (sort: 'date' | 'price-asc' | 'price-desc' | null) => {
      set({ sortBy: sort });
      get().applyFilters();
    },

    applyFilters: () => {
      const {
        listings,
        searchQuery,
        selectedCategory,
        selectedSubcategory,
        priceRange,
        sortBy,
      } = get();

      if (!listings || !Array.isArray(listings)) {
        logger.error('[ListingStore] Invalid listings array');
        set({ filteredListings: [] });
        return;
      }

      let filtered = listings.filter(listing => !listing.deletedAt);

      const hasFilters =
        (searchQuery && searchQuery.trim()) ||
        selectedCategory ||
        selectedSubcategory ||
        priceRange.min !== null ||
        priceRange.max !== null ||
        sortBy;

      if (!hasFilters) {
        set({ filteredListings: filtered });
        return;
      }

      if (searchQuery && searchQuery.trim()) {
        const normalizedQuery = searchQuery.toLowerCase().trim();

        if (normalizedQuery.length > 200) {
          logger.warn('[ListingStore] Search query too long, truncating');
          set({ filteredListings: [] });
          return;
        }

        filtered = filtered.filter(listing => {
          const titleAz = listing.title?.az?.toLowerCase() || '';
          const titleRu = listing.title?.ru?.toLowerCase() || '';
          const descAz = listing.description?.az?.toLowerCase() || '';
          const descRu = listing.description?.ru?.toLowerCase() || '';

          return titleAz.includes(normalizedQuery) ||
            titleRu.includes(normalizedQuery) ||
            descAz.includes(normalizedQuery) ||
            descRu.includes(normalizedQuery);
        });
      }

      if (selectedCategory) {
        filtered = filtered.filter(listing => listing.categoryId === selectedCategory);
      }

      if (selectedSubcategory) {
        filtered = filtered.filter(listing => listing.subcategoryId === selectedSubcategory);
      }

      if (priceRange.min !== null) {
        const minPrice = typeof priceRange.min === 'number' && isFinite(priceRange.min) && priceRange.min >= 0
          ? priceRange.min
          : 0;

        filtered = filtered.filter(listing => {
          const listingPrice = typeof listing.price === 'number' && isFinite(listing.price)
            ? listing.price
            : 0;

          return listingPrice >= minPrice;
        });
      }

      if (priceRange.max !== null) {
        const maxPrice = typeof priceRange.max === 'number' && isFinite(priceRange.max) && priceRange.max >= 0
          ? priceRange.max
          : Infinity;

        filtered = filtered.filter(listing => {
          const listingPrice = typeof listing.price === 'number' && isFinite(listing.price)
            ? listing.price
            : 0;

          return listingPrice <= maxPrice;
        });
      }

      filtered = [...filtered].sort((a, b) => {
        if (a.isVip && !b.isVip) return -1;
        if (b.isVip && !a.isVip) return 1;

        if (a.isFeatured && !b.isFeatured) return -1;
        if (b.isFeatured && !a.isFeatured) return 1;

        if (a.isPremium && !b.isPremium) return -1;
        if (b.isPremium && !a.isPremium) return 1;

        if (a.isFeatured && a.purchasedViews && !b.purchasedViews) return -1;
        if (b.isFeatured && b.purchasedViews && !a.purchasedViews) return 1;

        if (sortBy) {
          switch (sortBy) {
            case 'date': {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              if (isNaN(dateA) && isNaN(dateB)) return 0;
              if (isNaN(dateA)) return 1;
              if (isNaN(dateB)) return -1;
              return dateB - dateA;
            }
            case 'price-asc': {
              const priceA = typeof a.price === 'number' && isFinite(a.price) ? a.price : 0;
              const priceB = typeof b.price === 'number' && isFinite(b.price) ? b.price : 0;
              return priceA - priceB;
            }
            case 'price-desc': {
              const priceA = typeof a.price === 'number' && isFinite(a.price) ? a.price : 0;
              const priceB = typeof b.price === 'number' && isFinite(b.price) ? b.price : 0;
              return priceB - priceA;
            }
          }
        }

        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
      });

      set({ filteredListings: filtered });
    },

    resetFilters: () => {
      set({
        searchQuery: '',
        selectedCategory: null,
        selectedSubcategory: null,
        priceRange: { min: null, max: null },
        sortBy: null,
        filteredListings: get().listings,
      });
    },

    addListing: (listing: Listing) => {
      logger.debug('[ListingStore] Adding listing:', listing.id, listing.title);

      const existingListing = get().listings.find(l => l.id === listing.id);
      if (existingListing) {
        logger.warn('[ListingStore] Listing already exists, updating instead:', listing.id);
        get().updateListing(listing.id, listing);
        return;
      }

      if (!listing.id || !listing.title || !listing.userId) {
        logger.error('[ListingStore] Invalid listing data:', listing);
        throw new Error('Listing must have id, title, and userId');
      }

      set(state => ({
        listings: [listing, ...state.listings],
      }));

      const unusedViews = get().getUserUnusedViews(listing.userId);
      if (unusedViews > 0) {
        get().transferUnusedViewsToNewListing(listing.userId, listing.id);

        // ✅ Track timeout for cleanup
        const timeoutKey = `transfer_notification_${listing.id}_${Date.now()}`;
        const timeout = setTimeout(() => {
          try {
            const { sendNotification } = useThemeStore.getState();
            if (sendNotification && typeof sendNotification === 'function') {
              sendNotification(
                'Baxışlar avtomatik tətbiq edildi',
                `${unusedViews} istifadə olunmayan baxış yeni elanınıza avtomatik olaraq tətbiq edildi.`,
              );
            }
          } catch (err) {
            logger.error('[ListingStore] Failed to send notification after transferring views:', err);
          }

          // ✅ Remove from timeout map after execution
          const newTimeouts = new Map(get().notificationTimeouts);
          newTimeouts.delete(timeoutKey);
          set({ notificationTimeouts: newTimeouts });
        }, 100);

        // ✅ Store timeout for cleanup
        set((state) => ({
          notificationTimeouts: new Map(state.notificationTimeouts).set(timeoutKey, timeout),
        }));
      }

      get().applyFilters();
      logger.debug('[ListingStore] Listing added successfully. Total listings:', get().listings.length);
    },

    addListingToStore: async (listing: Listing, storeId?: string) => {
      logger.debug('[ListingStore] addListingToStore called:', { listingId: listing.id, storeId });

      get().addListing(listing);

      const addedListing = get().listings.find(l => l.id === listing.id);
      logger.debug('[ListingStore] Listing verification after add:', addedListing ? 'Found' : 'Not found');

      if (storeId) {
        try {
          logger.debug('[ListingStore] Adding listing to store:', storeId);
          const { useStoreStore } = await import('@/store/storeStore');
          const { addListingToStore } = useStoreStore.getState();
          await addListingToStore(storeId, listing.id);
          logger.debug('[ListingStore] Successfully added listing to store');
        } catch (error) {
          logger.error('[ListingStore] Failed to add listing to store:', error);
        }
      }
    },

    updateListing: (id: string, updates: Partial<Listing>) => {
      const existingListing = get().listings.find(l => l.id === id);
      if (!existingListing) {
        logger.warn('[ListingStore] Listing not found for update:', id);
        return;
      }

      if (!updates || Object.keys(updates).length === 0) {
        logger.warn('[ListingStore] No updates provided for listing:', id);
        return;
      }

      set(state => ({
        listings: state.listings.map(listing =>
          listing.id === id ? { ...listing, ...updates } : listing,
        ),
      }));
      get().applyFilters();
    },

    deleteListing: (id: string) => {
      const existingListing = get().listings.find(l => l.id === id);
      if (!existingListing) {
        logger.warn('[ListingStore] Listing not found for deletion:', id);
        return;
      }

      const now = new Date().toISOString();
      set(state => ({
        listings: state.listings.map(listing =>
          listing.id === id
            ? { ...listing, deletedAt: now }
            : listing,
        ),
      }));

      logger.info('[ListingStore] Listing soft deleted:', id);
      get().applyFilters();
    },

    deleteListingEarly: async (storeId: string, id: string) => {
      const now = new Date().toISOString();
      set(state => ({
        listings: state.listings.map(listing =>
          listing.id === id
            ? { ...listing, deletedAt: now }
            : listing,
        ),
      }));

      try {
        const { useStoreStore } = await import('@/store/storeStore');
        const { deleteListingEarly } = useStoreStore.getState();
        await deleteListingEarly(storeId, id);
      } catch (error) {
        logger.error('Failed to update store deleted listings:', error);
      }

      get().applyFilters();
    },

    promoteListing: async (id: string, type: 'premium' | 'vip' | 'featured', duration: number) => {
      try {
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
          logger.error('[promoteListing] Invalid listing ID:', id);
          throw new Error('Invalid listing ID');
        }

        const validTypes = ['premium', 'vip', 'featured'];
        if (!type || !validTypes.includes(type)) {
          logger.error('[promoteListing] Invalid promotion type:', type);
          throw new Error('Invalid promotion type. Must be: premium, vip, or featured');
        }

        if (typeof duration !== 'number' || !isFinite(duration) || duration <= 0) {
          logger.error('[promoteListing] Invalid duration:', duration);
          throw new Error('Duration must be a positive number');
        }

        if (duration > 365) {
          logger.error('[promoteListing] Duration too long:', duration);
          throw new Error('Duration cannot exceed 365 days');
        }

        const { listings } = get();
        const listing = listings.find(l => l.id === id);

        if (!listing) {
          logger.error('[promoteListing] Listing not found:', id);
          throw new Error('Listing not found');
        }

        if (listing.deletedAt) {
          logger.error('[promoteListing] Cannot promote deleted listing:', id);
          throw new Error('Cannot promote a deleted listing');
        }

        const now = new Date();
        const expiryDate = new Date(listing.expiresAt);
        if (expiryDate < now) {
          logger.error('[promoteListing] Cannot promote expired listing:', id);
          throw new Error('Cannot promote an expired listing');
        }

        if (listing.promotionEndDate) {
          const currentPromotionEnd = new Date(listing.promotionEndDate);
          if (currentPromotionEnd > now) {
            logger.warn('[promoteListing] Listing already has active promotion:', {
              id,
              currentEnd: currentPromotionEnd.toISOString(),
            });
          }
        }

        logger.info('[promoteListing] Promoting listing:', { id, type, duration });

        await new Promise(resolve => setTimeout(resolve, 1000));

        const promotionEndDate = new Date();
        promotionEndDate.setDate(promotionEndDate.getDate() + duration);

        const gracePeriodEndDate = new Date(promotionEndDate);
        gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + 2);

        set(state => ({
          listings: state.listings.map(l =>
            l.id === id
              ? {
                ...l,
                isPremium: type === 'premium' || type === 'vip',
                isFeatured: type === 'featured' || type === 'vip',
                isVip: type === 'vip',
                adType: type,
                promotionEndDate: promotionEndDate.toISOString(),
                gracePeriodEndDate: gracePeriodEndDate.toISOString(),
              }
              : l,
          ),
        }));

        get().applyFilters();

        logger.info('[promoteListing] Promotion successful:', {
          id,
          type,
          endsAt: promotionEndDate.toISOString(),
        });
      } catch (error) {
        logger.error('[promoteListing] Error:', error);
        throw error;
      }
    },

    promoteListingInStore: async (id: string, type: 'vip' | 'premium' | 'featured', price: number) => {
      await new Promise(resolve => setTimeout(resolve, 1000));

      set(state => ({
        listings: state.listings.map(listing =>
          listing.id === id
            ? {
              ...listing,
              isPremium: type === 'premium' || type === 'vip',
              isFeatured: type === 'featured' || type === 'vip',
              isVip: type === 'vip',
              adType: type,
            }
            : listing,
        ),
      }));
      get().applyFilters();
    },

    incrementViewCount: (id: string) => {
      if (!id || typeof id !== 'string') {
        logger.error('[incrementViewCount] Invalid ID:', id);
        return;
      }

      set(state => ({
        listings: state.listings.map(listing => {
          if (listing.id === id) {
            const currentViews = typeof listing.views === 'number' && isFinite(listing.views)
              ? listing.views
              : 0;

            const newViews = currentViews + 1;

            if (newViews > 10000000) {
              logger.warn('[incrementViewCount] View count too high, not incrementing:', { id, newViews });
              return listing;
            }

            const updatedListing = { ...listing, views: newViews };

            if (listing.targetViewsForFeatured &&
              typeof listing.targetViewsForFeatured === 'number' &&
              newViews >= listing.targetViewsForFeatured) {
              updatedListing.isFeatured = false;
              updatedListing.targetViewsForFeatured = undefined;

              // ✅ Track timeout for cleanup
              const timeoutKey = `view_target_notification_${id}_${Date.now()}`;
              const timeout = setTimeout(() => {
                try {
                  const { sendNotification } = useThemeStore.getState();
                  if (sendNotification && typeof sendNotification === 'function') {
                    const title = listing.title && typeof listing.title === 'object'
                      ? (listing.title.az || listing.title.en || listing.title.ru || 'Elanınız')
                      : 'Elanınız';

                    sendNotification(
                      'Ön sıra müddəti bitdi',
                      `"${title}" elanınız alınan baxış sayına çatdığı üçün ön sıralardan çıxarıldı.`,
                    );
                  }
                } catch (error) {
                  logger.error('[incrementViewCount] Failed to send notification:', error);
                }

                // ✅ Remove from timeout map after execution
                const newTimeouts = new Map(get().notificationTimeouts);
                newTimeouts.delete(timeoutKey);
                set({ notificationTimeouts: newTimeouts });
              }, 100);

              // ✅ Store timeout for cleanup
              set((state) => ({
                notificationTimeouts: new Map(state.notificationTimeouts).set(timeoutKey, timeout),
              }));
            }

            return updatedListing;
          }
          return listing;
        }),
      }));
      get().applyFilters();
    },

    checkExpiringListings: () => {
      try {
        const { listings, userUnusedViews } = get();

        if (!listings || !Array.isArray(listings)) {
          logger.error('[checkExpiringListings] Invalid listings array');
          return;
        }

        const now = new Date();

        if (isNaN(now.getTime())) {
          logger.error('[checkExpiringListings] Invalid current time');
          return;
        }

        logger.debug('[checkExpiringListings] Checking', listings.length, 'listings at', now.toISOString());

        const sentNotifications = new Set<string>();

        listings.forEach(listing => {
          if (listing.deletedAt) return;

          if (!listing.id || !listing.expiresAt || !listing.userId) {
            logger.warn('[checkExpiringListings] Invalid listing data:', listing.id);
            return;
          }

          const expiresAt = new Date(listing.expiresAt);

          if (isNaN(expiresAt.getTime())) {
            logger.error('[checkExpiringListings] Invalid expiresAt for listing:', listing.id);
            return;
          }

          const timeDiff = expiresAt.getTime() - now.getTime();
          const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

          if (daysRemaining <= 0) {
            logger.info('[checkExpiringListings] Listing expired:', {
              id: listing.id,
              title: listing.title?.az || 'Unknown',
              daysRemaining,
            });

            if (listing.targetViewsForFeatured && listing.views < listing.targetViewsForFeatured) {
              const unusedViews = listing.targetViewsForFeatured - listing.views;

              if (unusedViews > 0 && isFinite(unusedViews)) {
                const currentUnusedViews = userUnusedViews[listing.userId] || 0;

                set(state => ({
                  userUnusedViews: {
                    ...state.userUnusedViews,
                    [listing.userId]: currentUnusedViews + unusedViews,
                  },
                }));

                try {
                  const { sendNotification } = useThemeStore.getState();
                  if (sendNotification && typeof sendNotification === 'function') {
                    sendNotification(
                      'İstifadə olunmayan baxışlar saxlanıldı',
                      `"${listing.title?.az || 'Elanınız'}" elanınızın müddəti bitdi. ${unusedViews} istifadə olunmayan baxış yeni elanlarınızda avtomatik tətbiq olunacaq.`,
                    );
                  }
                } catch (notifError) {
                  logger.error('[checkExpiringListings] Failed to send notification:', notifError);
                }
              }
            }

            get().updateListing(listing.id, {
              isFeatured: false,
              targetViewsForFeatured: undefined,
              purchasedViews: undefined,
              archivedAt: new Date().toISOString(),
              isArchived: true,
            });

            logger.info('[checkExpiringListings] Listing auto-archived:', listing.id);

            return;
          }

          if (daysRemaining === 7) {
            const notifKey = `${listing.id}-7days`;
            if (!sentNotifications.has(notifKey)) {
              sentNotifications.add(notifKey);

              try {
                const { sendNotification } = useThemeStore.getState();
                if (sendNotification && typeof sendNotification === 'function') {
                  sendNotification(
                    '📅 Elan müddəti bitir - 7 gün qalıb',
                    `"${listing.title?.az || 'Elanınız'}" elanınızın müddəti 7 gündə bitəcək.\n\n💡 İndi yeniləsəniz 15% endirim əldə edərsiniz!`,
                  );
                  logger.info('[checkExpiringListings] Sent 7-day notification for:', listing.id);
                }
              } catch (notifError) {
                logger.error('[checkExpiringListings] Failed to send 7-day notification:', notifError);
              }
            }
          }

          if (daysRemaining === 3) {
            const notifKey = `${listing.id}-3days`;
            if (!sentNotifications.has(notifKey)) {
              sentNotifications.add(notifKey);

              try {
                const { sendNotification } = useThemeStore.getState();
                if (sendNotification && typeof sendNotification === 'function') {
                  sendNotification(
                    '⚠️ Elan müddəti bitir - 3 gün qalıb',
                    `"${listing.title?.az || 'Elanınız'}" elanınızın müddəti 3 gündə bitəcək.\n\n💡 İndi yeniləsəniz 10% endirim əldə edərsiniz!`,
                  );
                  logger.info('[checkExpiringListings] Sent 3-day notification for:', listing.id);
                }
              } catch (notifError) {
                logger.error('[checkExpiringListings] Failed to send 3-day notification:', notifError);
              }
            }
          }

          if (daysRemaining === 1) {
            const notifKey = `${listing.id}-1day`;
            if (!sentNotifications.has(notifKey)) {
              sentNotifications.add(notifKey);

              try {
                const { sendNotification } = useThemeStore.getState();
                if (sendNotification && typeof sendNotification === 'function') {
                  sendNotification(
                    '🔴 SON GÜN! Elan sabah bitir',
                    `"${listing.title?.az || 'Elanınız'}" elanınızın müddəti SABAH bitəcək!\n\n💡 Dərhal yeniləsəniz 5% endirim əldə edərsiniz!`,
                  );
                  logger.info('[checkExpiringListings] Sent 1-day notification for:', listing.id);
                }
              } catch (notifError) {
                logger.error('[checkExpiringListings] Failed to send 1-day notification:', notifError);
              }
            }
          }

          if (listing.promotionEndDate) {
            const promotionEndDate = new Date(listing.promotionEndDate);
            if (now > promotionEndDate) {
              if (listing.gracePeriodEndDate && !listing.storeId) {
                const gracePeriodEndDate = new Date(listing.gracePeriodEndDate);
                if (now > gracePeriodEndDate) {
                  get().updateListing(listing.id, {
                    isPremium: false,
                    isFeatured: false,
                    isVip: false,
                    adType: 'free',
                    promotionEndDate: undefined,
                    gracePeriodEndDate: undefined,
                  });

                  const { sendNotification } = useThemeStore.getState();
                  sendNotification(
                    'Güzəşt müddəti bitdi',
                    `"${listing.title.az}" elanınızın güzəşt müddəti bitdi və elan adi rejimə keçdi.`,
                  );
                } else {
                  const graceDaysRemaining = Math.ceil((gracePeriodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  if (graceDaysRemaining <= 1) {
                    const { sendNotification } = useThemeStore.getState();
                    sendNotification(
                      'Güzəşt müddəti bitir',
                      `"${listing.title.az}" elanınızın güzəşt müddəti ${graceDaysRemaining} gündə bitəcək`,
                    );
                  }
                }
              } else {
                get().updateListing(listing.id, {
                  isPremium: false,
                  isFeatured: false,
                  isVip: false,
                  adType: 'free',
                  promotionEndDate: undefined,
                });

                const { sendNotification } = useThemeStore.getState();
                sendNotification(
                  'Təşviq müddəti bitdi',
                  `"${listing.title.az}" elanınızın təşviq müddəti bitdi və elan adi rejimə keçdi.`,
                );
              }
            }
          }
        });
      } catch (err) {
        logger.error('[checkExpiringListings] Error:', err);
      }
    },

    purchaseViews: async (id: string, viewCount: number) => {
      if (!viewCount || viewCount <= 0 || !Number.isInteger(viewCount)) {
        logger.error('[ListingStore] Invalid view count:', viewCount);
        throw new Error('Baxış sayı müsbət tam ədəd olmalıdır');
      }

      if (viewCount < 10) {
        logger.error('[ListingStore] View count too low:', viewCount);
        throw new Error('Minimum 10 baxış satın ala bilərsiniz');
      }

      if (viewCount > 100000) {
        logger.error('[ListingStore] View count too high:', viewCount);
        throw new Error('Maksimum 100,000 baxış satın ala bilərsiniz');
      }

      const cost = viewCount * 0.01;
      if (!isFinite(cost) || cost <= 0) {
        logger.error('[ListingStore] Invalid cost calculation:', cost);
        throw new Error('Məbləğ hesablana bilmədi');
      }

      const { walletBalance, bonusBalance, spendFromWallet, spendFromBonus } = useUserStore.getState();
      const totalBalance = (typeof walletBalance === 'number' && isFinite(walletBalance) ? walletBalance : 0) +
        (typeof bonusBalance === 'number' && isFinite(bonusBalance) ? bonusBalance : 0);

      if (cost > totalBalance) {
        logger.error('[ListingStore] Insufficient balance:', { cost, totalBalance });
        throw new Error(`Kifayət qədər balans yoxdur. Lazım: ${cost.toFixed(2)} AZN, Balans: ${totalBalance.toFixed(2)} AZN`);
      }

      const state = get();
      const listing = state.listings.find(l => l.id === id);

      if (!listing) {
        logger.error('[ListingStore] Listing not found for view purchase:', id);
        throw new Error('Elan tapılmadı');
      }

      if (listing.deletedAt) {
        logger.error('[ListingStore] Cannot purchase views for deleted listing:', id);
        throw new Error('Silinmiş elan üçün baxış satın ala bilməzsiniz');
      }

      let remainingCost = cost;

      if (bonusBalance > 0 && remainingCost > 0) {
        const bonusToSpend = Math.min(bonusBalance, remainingCost);
        spendFromBonus(bonusToSpend);
        remainingCost -= bonusToSpend;
      }

      if (remainingCost > 0) {
        spendFromWallet(remainingCost);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const currentViews = typeof listing.views === 'number' && isFinite(listing.views) ? listing.views : 0;
      const targetViews = currentViews + viewCount;

      set(state => ({
        listings: state.listings.map(l =>
          l.id === id
            ? {
              ...l,
              purchasedViews: (l.purchasedViews || 0) + viewCount,
              isFeatured: true,
              targetViewsForFeatured: targetViews,
            }
            : l,
        ),
      }));

      get().applyFilters();

      const { sendNotification } = useThemeStore.getState();
      sendNotification(
        'Baxış satın alındı',
        `${viewCount} baxış uğurla satın alındı. Elanınız ${targetViews} baxışa çatana qədər ön sıralarda görünəcək.`,
      );
    },

    applyCreativeEffects: async (
      id: string,
      effects: CreativeEffectInput[],
      effectEndDates: CreativeEffectEndDateInput[],
    ) => {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const state = get();
      const listing = state.listings.find(l => l.id === id);
      if (!listing) return;

      const nowIso = new Date().toISOString();
      set(state => ({
        listings: state.listings.map(l =>
          l.id === id
            ? {
              ...l,
              creativeEffects: effects.map((effect, index) => ({
                ...effect,
                endDate: effectEndDates[index]?.endDate instanceof Date
                  ? effectEndDates[index].endDate.toISOString()
                  : nowIso,
                isActive: true,
              })),
            }
            : l,
        ),
      }));

      logger.info('[ListingStore] Creative effects applied successfully:', {
        listingId: id,
        effectCount: effects.length,
      });

      get().applyFilters();

      const { sendNotification } = useThemeStore.getState();
      sendNotification(
        'Kreativ effektlər tətbiq edildi',
        `${effects.length} kreativ effekt elanınıza uğurla tətbiq edildi.`,
      );
    },

    getUserUnusedViews: (userId: string) => {
      const { userUnusedViews } = get();
      return userUnusedViews[userId] || 0;
    },

    transferUnusedViewsToNewListing: (userId: string, listingId: string) => {
      const { userUnusedViews } = get();
      const unusedViews = userUnusedViews[userId] || 0;

      if (unusedViews > 0) {
        set(state => ({
          userUnusedViews: {
            ...state.userUnusedViews,
            [userId]: 0,
          },
        }));

        const state = get();
        const listing = state.listings.find(l => l.id === listingId);
        if (listing) {
          const currentViews = typeof listing.views === 'number' && isFinite(listing.views) ? listing.views : 0;
          const targetViews = currentViews + unusedViews;

          set(state => ({
            listings: state.listings.map(l =>
              l.id === listingId
                ? {
                  ...l,
                  purchasedViews: (l.purchasedViews || 0) + unusedViews,
                  isFeatured: true,
                  targetViewsForFeatured: targetViews,
                }
                : l,
            ),
          }));

          get().applyFilters();
        }
      }
    },

    archiveListing: async (id: string) => {
      try {
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
          logger.error('[archiveListing] Invalid listing ID:', id);
          throw new Error('Invalid listing ID');
        }

        const { listings } = get();
        const listing = listings.find(l => l.id === id);

        if (!listing) {
          logger.error('[archiveListing] Listing not found:', id);
          throw new Error('Listing not found');
        }

        if (listing.deletedAt) {
          logger.warn('[archiveListing] Listing already deleted:', id);
          throw new Error('Cannot archive a deleted listing');
        }

        if (listing.isArchived || listing.archivedAt) {
          logger.warn('[archiveListing] Listing already archived:', id);
          throw new Error('Listing is already archived');
        }

        logger.info('[archiveListing] Archiving listing:', id);

        const now = new Date().toISOString();

        get().updateListing(id, {
          isArchived: true,
          archivedAt: now,
          isFeatured: false,
          isPremium: false,
          isVip: false,
        });

        logger.info('[archiveListing] Listing archived successfully:', id);
      } catch (error) {
        logger.error('[archiveListing] Error:', error);
        throw error;
      }
    },

    reactivateListing: async (id: string, packageId: string) => {
      try {
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
          logger.error('[reactivateListing] Invalid listing ID:', id);
          throw new Error('Invalid listing ID');
        }

        if (!packageId || typeof packageId !== 'string' || packageId.trim().length === 0) {
          logger.error('[reactivateListing] Invalid package ID:', packageId);
          throw new Error('Invalid package ID');
        }

        const { adPackages } = await import('@/constants/adPackages');
        const renewalPackage = adPackages.find(p => p.id === packageId);

        if (!renewalPackage) {
          logger.error('[reactivateListing] Package not found:', packageId);
          throw new Error('Renewal package not found');
        }

        if (!renewalPackage.duration || renewalPackage.duration <= 0 || !isFinite(renewalPackage.duration)) {
          logger.error('[reactivateListing] Invalid package duration:', renewalPackage.duration);
          throw new Error('Invalid package duration');
        }

        if (renewalPackage.duration > 365) {
          logger.error('[reactivateListing] Package duration too long:', renewalPackage.duration);
          throw new Error('Package duration cannot exceed 365 days');
        }

        const { listings } = get();
        const listing = listings.find(l => l.id === id);

        if (!listing) {
          logger.error('[reactivateListing] Listing not found:', id);
          throw new Error('Listing not found');
        }

        if (listing.deletedAt) {
          logger.warn('[reactivateListing] Cannot reactivate deleted listing:', id);
          throw new Error('Cannot reactivate a deleted listing');
        }

        if (!listing.isArchived && !listing.archivedAt) {
          logger.warn('[reactivateListing] Listing is not archived:', id);
          throw new Error('Listing is not archived');
        }

        logger.info('[reactivateListing] Reactivating listing:', {
          id,
          packageId,
          duration: renewalPackage.duration,
        });

        const now = new Date();
        const newExpiresAt = new Date(now.getTime() + (renewalPackage.duration * 24 * 60 * 60 * 1000));

        get().updateListing(id, {
          isArchived: false,
          archivedAt: undefined,
          expiresAt: newExpiresAt.toISOString(),
          adType: renewalPackage.id as Listing['adType'],
        });

        logger.info('[reactivateListing] Listing reactivated successfully:', {
          id,
          newExpiresAt: newExpiresAt.toISOString(),
        });
      } catch (error) {
        logger.error('[reactivateListing] Error:', error);
        throw error;
      }
    },

    getArchivedListings: (userId: string) => {
      try {
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
          logger.error('[getArchivedListings] Invalid userId:', userId);
          return [];
        }

        const { listings } = get();

        if (!listings || !Array.isArray(listings)) {
          logger.error('[getArchivedListings] Invalid listings array');
          return [];
        }

        const archivedListings = listings.filter(l =>
          l.userId === userId &&
          !l.deletedAt &&
          (l.isArchived || l.archivedAt),
        );

        logger.debug('[getArchivedListings] Found archived listings:', archivedListings.length);

        return archivedListings;
      } catch (error) {
        logger.error('[getArchivedListings] Error:', error);
        return [];
      }
    },

    getExpiringListings: (userId: string, days: number) => {
      try {
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
          logger.error('[getExpiringListings] Invalid userId:', userId);
          return [];
        }

        if (typeof days !== 'number' || !isFinite(days) || days < 0) {
          logger.error('[getExpiringListings] Invalid days:', days);
          return [];
        }

        if (days > 365) {
          logger.error('[getExpiringListings] Days too large:', days);
          return [];
        }

        const { listings } = get();

        if (!listings || !Array.isArray(listings)) {
          logger.error('[getExpiringListings] Invalid listings array');
          return [];
        }

        const now = new Date();
        const targetDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

        const expiringListings = listings.filter(l => {
          if (l.userId !== userId) return false;
          if (l.deletedAt) return false;
          if (l.isArchived || l.archivedAt) return false;

          const expiresAt = new Date(l.expiresAt);

          if (isNaN(expiresAt.getTime())) {
            logger.warn('[getExpiringListings] Invalid expiresAt for listing:', l.id);
            return false;
          }

          return expiresAt <= targetDate && expiresAt > now;
        });

        logger.debug('[getExpiringListings] Found expiring listings:', {
          userId,
          days,
          count: expiringListings.length,
        });

        return expiringListings;
      } catch (error) {
        logger.error('[getExpiringListings] Error:', error);
        return [];
      }
    },

    // ✅ Cleanup all pending timeouts
    cleanupTimeouts: () => {
      const { notificationTimeouts } = get();

      try {
        notificationTimeouts.forEach((timeout) => clearTimeout(timeout));
      } catch (error) {
        logger.debug('[ListingStore] cleanupTimeouts encountered an error:', error);
      }

      set({
        notificationTimeouts: new Map(),
      });

      logger.debug('[ListingStore] Timeouts cleaned up');
    },
  } as ListingState),
);

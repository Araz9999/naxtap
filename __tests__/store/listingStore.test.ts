/**
 * Unit tests for listing store
 * @module __tests__/store/listingStore
 */

import { useListingStore } from '@/store/listingStore';
import type { Listing } from '@/types/listing';

describe('ListingStore', () => {
  // Reset store before each test
  beforeEach(() => {
    useListingStore.setState({
      listings: [],
      filteredListings: [],
      searchQuery: '',
      selectedCategory: null,
      selectedSubcategory: null,
      priceRange: { min: null, max: null },
      sortBy: null,
    } as any);
  });

  describe('addListing', () => {
    test('should add a new listing', () => {
      const store = useListingStore.getState();
      const newListing: Listing = {
        id: 'listing_1',
        userId: 'user_1',
        title: { az: 'Test', ru: 'Тест' },
        description: { az: 'Desc', ru: 'Описание' },
        price: 100,
        categoryId: 1,
        subcategoryId: 1,
        location: { az: 'Baku', ru: 'Баку', en: 'Baku' },
        currency: 'AZN',
        images: [],
        views: 0,
        isFeatured: false,
        isPremium: false,
        hasDiscount: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        contactPreference: 'both',
      };

      store.addListing(newListing);

      const state = useListingStore.getState();
      expect(state.listings.length).toBe(1);
      expect(state.listings[0].title.az).toBe('Test');
    });

    test('should keep multiple listings with distinct ids', () => {
      const store = useListingStore.getState();
      store.addListing({
        id: 'listing_1',
        userId: 'user_1',
        title: { az: 'Test 1', ru: 'Тест 1' },
        description: { az: '', ru: '' },
        price: 100,
        categoryId: 1,
        subcategoryId: 1,
        location: { az: 'Baku', ru: 'Баку', en: 'Baku' },
        currency: 'AZN',
        images: [],
        views: 0,
        isFeatured: false,
        isPremium: false,
        hasDiscount: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        contactPreference: 'both',
      } as Listing);
      store.addListing({
        id: 'listing_2',
        userId: 'user_1',
        title: { az: 'Test 2', ru: 'Тест 2' },
        description: { az: '', ru: '' },
        price: 200,
        categoryId: 1,
        subcategoryId: 1,
        location: { az: 'Baku', ru: 'Баку', en: 'Baku' },
        currency: 'AZN',
        images: [],
        views: 0,
        isFeatured: false,
        isPremium: false,
        hasDiscount: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        contactPreference: 'both',
      } as Listing);

      const state = useListingStore.getState();
      const ids = state.listings.map((l) => l.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('updateListing', () => {
    test('should update an existing listing', () => {
      const store = useListingStore.getState();
      const listingId = 'listing_1';
      store.addListing({
        id: listingId,
        userId: 'user_1',
        title: { az: 'Original', ru: 'Оригинал' },
        description: { az: '', ru: '' },
        price: 100,
        categoryId: 1,
        subcategoryId: 1,
        location: { az: 'Baku', ru: 'Баку', en: 'Baku' },
        currency: 'AZN',
        images: [],
        views: 0,
        isFeatured: false,
        isPremium: false,
        hasDiscount: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        contactPreference: 'both',
      } as Listing);

      store.updateListing(listingId, {
        title: { az: 'Updated', ru: 'Обновлено' },
        price: 150,
      });

      const state = useListingStore.getState();
      const updated = state.listings.find(l => l.id === listingId);
      expect(updated?.title.az).toBe('Updated');
      expect(updated?.price).toBe(150);
    });

    test('should not modify other listings when updating', () => {
      const store = useListingStore.getState();
      const listingId1 = 'listing_1';
      const listingId2 = 'listing_2';

      store.addListing({
        id: listingId1,
        userId: 'user_1',
        title: { az: 'First', ru: 'Первый' },
        description: { az: '', ru: '' },
        price: 100,
        categoryId: 1,
        subcategoryId: 1,
        location: { az: 'Baku', ru: 'Баку', en: 'Baku' },
        currency: 'AZN',
        images: [],
        views: 0,
        isFeatured: false,
        isPremium: false,
        hasDiscount: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        contactPreference: 'both',
      } as Listing);
      store.addListing({
        id: listingId2,
        userId: 'user_1',
        title: { az: 'Second', ru: 'Второй' },
        description: { az: '', ru: '' },
        price: 200,
        categoryId: 1,
        subcategoryId: 1,
        location: { az: 'Baku', ru: 'Баку', en: 'Baku' },
        currency: 'AZN',
        images: [],
        views: 0,
        isFeatured: false,
        isPremium: false,
        hasDiscount: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        contactPreference: 'both',
      } as Listing);

      store.updateListing(listingId1, { price: 150 });

      const state = useListingStore.getState();
      const listing2 = state.listings.find(l => l.id === listingId2);
      expect(listing2?.price).toBe(200); // Should remain unchanged
    });
  });

  describe('deleteListing', () => {
    test('should soft delete a listing', () => {
      const store = useListingStore.getState();
      const listingId = 'listing_1';
      store.addListing({
        id: listingId,
        userId: 'user_1',
        title: { az: 'Test', ru: 'Тест' },
        description: { az: '', ru: '' },
        price: 100,
        categoryId: 1,
        subcategoryId: 1,
        location: { az: 'Baku', ru: 'Баку', en: 'Baku' },
        currency: 'AZN',
        images: [],
        views: 0,
        isFeatured: false,
        isPremium: false,
        hasDiscount: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        contactPreference: 'both',
      } as Listing);

      store.deleteListing(listingId);

      const state = useListingStore.getState();
      const deleted = state.listings.find(l => l.id === listingId);
      expect(deleted?.deletedAt).toBeTruthy();
    });
  });

  describe('applyFilters', () => {
    beforeEach(() => {
      const store = useListingStore.getState();
      store.addListing({
        id: 'cheap',
        userId: 'user_1',
        title: { az: 'Cheap Item', ru: 'Дешевый' },
        description: { az: '', ru: '' },
        price: 50,
        categoryId: 1,
        subcategoryId: 1,
        location: { az: 'Baku', ru: 'Баку', en: 'Baku' },
        currency: 'AZN',
        images: [],
        views: 0,
        isFeatured: false,
        isPremium: false,
        hasDiscount: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        contactPreference: 'both',
      } as Listing);

      store.addListing({
        id: 'expensive',
        userId: 'user_1',
        title: { az: 'Expensive Item', ru: 'Дорогой' },
        description: { az: '', ru: '' },
        price: 500,
        categoryId: 2,
        subcategoryId: 1,
        location: { az: 'Ganja', ru: 'Гянджа', en: 'Ganja' },
        currency: 'AZN',
        images: [],
        views: 0,
        isFeatured: false,
        isPremium: false,
        hasDiscount: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        contactPreference: 'both',
      } as Listing);
    });

    test('should filter by price range', () => {
      const store = useListingStore.getState();
      store.setPriceRange(0, 100);
      store.applyFilters();
      const state = useListingStore.getState();
      expect(state.filteredListings.length).toBe(1);
      expect(state.filteredListings[0].price).toBe(50);
    });

    test('should filter by category', () => {
      const store = useListingStore.getState();
      store.setSelectedCategory(1);
      store.applyFilters();
      const state = useListingStore.getState();
      expect(state.filteredListings.length).toBe(1);
      expect(state.filteredListings[0].categoryId).toBe(1);
    });

    test('should filter by search query', () => {
      const store = useListingStore.getState();
      store.setSearchQuery('Cheap');
      store.applyFilters();
      const state = useListingStore.getState();
      expect(state.filteredListings.length).toBe(1);
      expect(state.filteredListings[0].title.az).toContain('Cheap');
    });
  });

  describe('incrementViewCount', () => {
    test('should increment view count', () => {
      const store = useListingStore.getState();
      const listingId = 'listing_1';
      store.addListing({
        id: listingId,
        userId: 'user_1',
        title: { az: 'Test', ru: 'Тест' },
        description: { az: '', ru: '' },
        price: 100,
        categoryId: 1,
        subcategoryId: 1,
        location: { az: 'Baku', ru: 'Баку', en: 'Baku' },
        currency: 'AZN',
        images: [],
        views: 0,
        isFeatured: false,
        isPremium: false,
        hasDiscount: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        contactPreference: 'both',
      } as Listing);

      store.incrementViewCount(listingId);

      const state = useListingStore.getState();
      const listing = state.listings.find(l => l.id === listingId);
      expect(listing?.views).toBe(1);
    });

    test('should handle multiple increments', () => {
      const store = useListingStore.getState();
      const listingId = 'listing_1';
      store.addListing({
        id: listingId,
        userId: 'user_1',
        title: { az: 'Test', ru: 'Тест' },
        description: { az: '', ru: '' },
        price: 100,
        categoryId: 1,
        subcategoryId: 1,
        location: { az: 'Baku', ru: 'Баку', en: 'Baku' },
        currency: 'AZN',
        images: [],
        views: 5,
        isFeatured: false,
        isPremium: false,
        hasDiscount: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        contactPreference: 'both',
      } as Listing);

      store.incrementViewCount(listingId);
      store.incrementViewCount(listingId);
      store.incrementViewCount(listingId);

      const state = useListingStore.getState();
      const listing = state.listings.find(l => l.id === listingId);
      expect(listing?.views).toBe(8);
    });
  });
});

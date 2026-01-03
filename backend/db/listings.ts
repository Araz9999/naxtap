import { logger } from '../utils/logger';

export interface DBListing {
  id: string;
  title: {
    az: string;
    ru: string;
  };
  description: {
    az: string;
    ru: string;
  };
  price: number;
  currency: string;
  location: {
    az: string;
    ru: string;
  };
  categoryId: number;
  subcategoryId: number;
  images: string[];
  userId: string;
  storeId?: string;
  createdAt: string;
  expiresAt: string;
  views: number;
  isFeatured: boolean;
  isPremium: boolean;
  adType: 'free' | 'standard' | 'premium' | 'vip';
  contactPreference: 'phone' | 'message' | 'both';
  favorites: number;
  isArchived?: boolean;
  archivedAt?: string;
  originalPrice?: number;
  discountPercentage?: number;
  hasDiscount?: boolean;
  discountEndDate?: string;
  creativeEffects?: {
    id: string;
    name: { az: string; ru: string };
    type: string;
    color: string;
    endDate: string;
    isActive: boolean;
  }[];
}

class ListingDatabase {
  private listings: Map<string, DBListing> = new Map();
  private userIndex: Map<string, Set<string>> = new Map();
  private storeIndex: Map<string, Set<string>> = new Map();
  private categoryIndex: Map<number, Set<string>> = new Map();

  constructor() {
    this.initializeDefaultListings();
  }

  private async initializeDefaultListings() {
    // İnizializasiya default listinqlər olmadan
    logger.info('[ListingDB] Initialized listing database');
  }

  private generateSecureId(): string {
    const timestamp = Date.now();
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const randomHex = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
    return `listing_${timestamp}_${randomHex}`;
  }

  async createListing(listingData: Omit<DBListing, 'id' | 'createdAt' | 'views' | 'favorites'>): Promise<DBListing> {
    const id = this.generateSecureId();
    const now = new Date().toISOString();

    const listing: DBListing = {
      id,
      ...listingData,
      createdAt: now,
      views: 0,
      favorites: 0,
    };

    this.listings.set(id, listing);

    // Update indexes
    if (!this.userIndex.has(listing.userId)) {
      this.userIndex.set(listing.userId, new Set());
    }
    this.userIndex.get(listing.userId)!.add(id);

    if (listing.storeId) {
      if (!this.storeIndex.has(listing.storeId)) {
        this.storeIndex.set(listing.storeId, new Set());
      }
      this.storeIndex.get(listing.storeId)!.add(id);
    }

    if (!this.categoryIndex.has(listing.categoryId)) {
      this.categoryIndex.set(listing.categoryId, new Set());
    }
    this.categoryIndex.get(listing.categoryId)!.add(id);

    logger.info(`[ListingDB] Created listing: ${id}`);
    return listing;
  }

  async findById(id: string): Promise<DBListing | null> {
    return this.listings.get(id) || null;
  }

  async findAll(filters?: {
    userId?: string;
    storeId?: string;
    categoryId?: number;
    isArchived?: boolean;
  }): Promise<DBListing[]> {
    let results = Array.from(this.listings.values());

    if (filters?.userId) {
      const userListingIds = this.userIndex.get(filters.userId);
      if (!userListingIds) return [];
      results = results.filter(l => userListingIds.has(l.id));
    }

    if (filters?.storeId) {
      const storeListingIds = this.storeIndex.get(filters.storeId);
      if (!storeListingIds) return [];
      results = results.filter(l => storeListingIds.has(l.id));
    }

    if (filters?.categoryId !== undefined) {
      results = results.filter(l => l.categoryId === filters.categoryId);
    }

    if (filters?.isArchived !== undefined) {
      results = results.filter(l => (l.isArchived || false) === filters.isArchived);
    }

    return results;
  }

  async updateListing(id: string, updates: Partial<DBListing>): Promise<DBListing | null> {
    const listing = this.listings.get(id);
    if (!listing) return null;

    const updatedListing: DBListing = {
      ...listing,
      ...updates,
      id: listing.id,
      createdAt: listing.createdAt,
    };

    this.listings.set(id, updatedListing);

    // Update indexes if needed
    if (updates.storeId && updates.storeId !== listing.storeId) {
      if (listing.storeId) {
        this.storeIndex.get(listing.storeId)?.delete(id);
      }
      if (!this.storeIndex.has(updates.storeId)) {
        this.storeIndex.set(updates.storeId, new Set());
      }
      this.storeIndex.get(updates.storeId)!.add(id);
    }

    logger.info(`[ListingDB] Updated listing: ${id}`);
    return updatedListing;
  }

  async deleteListing(id: string): Promise<boolean> {
    const listing = this.listings.get(id);
    if (!listing) return false;

    // Remove from indexes
    this.userIndex.get(listing.userId)?.delete(id);
    if (listing.storeId) {
      this.storeIndex.get(listing.storeId)?.delete(id);
    }
    this.categoryIndex.get(listing.categoryId)?.delete(id);

    this.listings.delete(id);
    logger.info(`[ListingDB] Deleted listing: ${id}`);
    return true;
  }

  async incrementViews(id: string): Promise<boolean> {
    const listing = this.listings.get(id);
    if (!listing) return false;

    listing.views += 1;
    this.listings.set(id, listing);
    return true;
  }

  async archiveListing(id: string): Promise<boolean> {
    const listing = this.listings.get(id);
    if (!listing) return false;

    listing.isArchived = true;
    listing.archivedAt = new Date().toISOString();
    this.listings.set(id, listing);
    logger.info(`[ListingDB] Archived listing: ${id}`);
    return true;
  }

  async reactivateListing(id: string, expiresAt: string): Promise<boolean> {
    const listing = this.listings.get(id);
    if (!listing) return false;

    listing.isArchived = false;
    listing.archivedAt = undefined;
    listing.expiresAt = expiresAt;
    this.listings.set(id, listing);
    logger.info(`[ListingDB] Reactivated listing: ${id}`);
    return true;
  }
}

export const listingDB = new ListingDatabase();

import { logger } from '../utils/logger';

export interface DBStore {
  id: string;
  userId: string;
  name: string;
  categoryName: string;
  address: string;
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
    whatsapp?: string;
  };
  description: string;
  logo?: string;
  coverImage?: string;
  planId: string;
  adsUsed: number;
  maxAds: number;
  deletedListings: string[];
  isActive: boolean;
  status: 'active' | 'grace_period' | 'deactivated' | 'archived';
  createdAt: string;
  expiresAt: string;
  gracePeriodEndsAt?: string;
  deactivatedAt?: string;
  archivedAt?: string;
  lastPaymentReminder?: string;
  followers: string[];
  rating: number;
  totalRatings: number;
}

class StoreDatabase {
  private stores: Map<string, DBStore> = new Map();
  private userIndex: Map<string, Set<string>> = new Map();
  private followerIndex: Map<string, Set<string>> = new Map(); // userId -> Set of storeIds they follow

  constructor() {
    this.initializeDefaultStores();
  }

  private async initializeDefaultStores() {
    // İnizializasiya default store-lar olmadan
    logger.info('[StoreDB] Initialized store database');
  }

  private generateSecureId(): string {
    const timestamp = Date.now();
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const randomHex = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
    return `store_${timestamp}_${randomHex}`;
  }

  async createStore(storeData: Omit<DBStore, 'id' | 'createdAt' | 'adsUsed' | 'deletedListings' | 'followers' | 'rating' | 'totalRatings'>): Promise<DBStore> {
    const id = this.generateSecureId();
    const now = new Date().toISOString();

    const store: DBStore = {
      id,
      ...storeData,
      createdAt: now,
      adsUsed: 0,
      deletedListings: [],
      followers: [],
      rating: 0,
      totalRatings: 0,
    };

    this.stores.set(id, store);

    // Update indexes
    if (!this.userIndex.has(store.userId)) {
      this.userIndex.set(store.userId, new Set());
    }
    this.userIndex.get(store.userId)!.add(id);

    logger.info(`[StoreDB] Created store: ${id}`);
    return store;
  }

  async findById(id: string): Promise<DBStore | null> {
    return this.stores.get(id) || null;
  }

  async findAll(filters?: {
    userId?: string;
    status?: DBStore['status'];
  }): Promise<DBStore[]> {
    let results = Array.from(this.stores.values());

    if (filters?.userId) {
      const userStoreIds = this.userIndex.get(filters.userId);
      if (!userStoreIds) return [];
      results = results.filter(s => userStoreIds.has(s.id));
    }

    if (filters?.status) {
      results = results.filter(s => s.status === filters.status);
    }

    return results;
  }

  async findByUserId(userId: string): Promise<DBStore | null> {
    const userStoreIds = this.userIndex.get(userId);
    if (!userStoreIds || userStoreIds.size === 0) return null;
    
    const storeId = Array.from(userStoreIds)[0];
    return this.stores.get(storeId) || null;
  }

  async updateStore(id: string, updates: Partial<DBStore>): Promise<DBStore | null> {
    const store = this.stores.get(id);
    if (!store) return null;

    const updatedStore: DBStore = {
      ...store,
      ...updates,
      id: store.id,
      createdAt: store.createdAt,
    };

    this.stores.set(id, updatedStore);
    logger.info(`[StoreDB] Updated store: ${id}`);
    return updatedStore;
  }

  async deleteStore(id: string): Promise<boolean> {
    const store = this.stores.get(id);
    if (!store) return false;

    // Remove from indexes
    this.userIndex.get(store.userId)?.delete(id);
    
    // Remove from followers' indexes
    store.followers.forEach(followerId => {
      this.followerIndex.get(followerId)?.delete(id);
    });

    this.stores.delete(id);
    logger.info(`[StoreDB] Deleted store: ${id}`);
    return true;
  }

  async followStore(userId: string, storeId: string): Promise<boolean> {
    const store = this.stores.get(storeId);
    if (!store) return false;

    if (!store.followers.includes(userId)) {
      store.followers.push(userId);
      this.stores.set(storeId, store);

      // Update follower index
      if (!this.followerIndex.has(userId)) {
        this.followerIndex.set(userId, new Set());
      }
      this.followerIndex.get(userId)!.add(storeId);

      logger.info(`[StoreDB] User ${userId} followed store ${storeId}`);
    }
    return true;
  }

  async unfollowStore(userId: string, storeId: string): Promise<boolean> {
    const store = this.stores.get(storeId);
    if (!store) return false;

    const index = store.followers.indexOf(userId);
    if (index > -1) {
      store.followers.splice(index, 1);
      this.stores.set(storeId, store);

      // Update follower index
      this.followerIndex.get(userId)?.delete(storeId);

      logger.info(`[StoreDB] User ${userId} unfollowed store ${storeId}`);
    }
    return true;
  }

  async getFollowedStores(userId: string): Promise<DBStore[]> {
    const followedStoreIds = this.followerIndex.get(userId);
    if (!followedStoreIds) return [];

    const stores: DBStore[] = [];
    followedStoreIds.forEach(storeId => {
      const store = this.stores.get(storeId);
      if (store) stores.push(store);
    });

    return stores;
  }

  async isFollowing(userId: string, storeId: string): Promise<boolean> {
    const store = this.stores.get(storeId);
    if (!store) return false;
    return store.followers.includes(userId);
  }

  async addRating(storeId: string, rating: number): Promise<boolean> {
    const store = this.stores.get(storeId);
    if (!store) return false;

    store.rating += rating;
    store.totalRatings += 1;
    this.stores.set(storeId, store);
    logger.info(`[StoreDB] Added rating to store ${storeId}`);
    return true;
  }
}

export const storeDB = new StoreDatabase();

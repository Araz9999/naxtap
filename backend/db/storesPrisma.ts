import { prisma } from './client';
import { logger } from '../utils/logger';
import type { StoreStatus } from '@prisma/client';

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
  logo?: string | null;
  coverImage?: string | null;
  planId: string;
  adsUsed: number;
  maxAds: number;
  deletedListings: string[];
  isActive: boolean;
  status: string;
  createdAt: string;
  expiresAt: string;
  gracePeriodEndsAt?: string | null;
  deactivatedAt?: string | null;
  archivedAt?: string | null;
  lastPaymentReminder?: string | null;
  followers: string[];
  rating: number;
  totalRatings: number;
}

class StoreDatabase {
  async createStore(storeData: Omit<DBStore, 'id' | 'createdAt' | 'adsUsed' | 'deletedListings' | 'followers' | 'rating' | 'totalRatings'>): Promise<DBStore> {
    try {
      const store = await prisma.store.create({
        data: {
          userId: storeData.userId,
          name: storeData.name,
          categoryName: storeData.categoryName,
          address: storeData.address,
          contactInfo: storeData.contactInfo as any,
          description: storeData.description,
          logo: storeData.logo,
          coverImage: storeData.coverImage,
          planId: storeData.planId,
          maxAds: storeData.maxAds,
          isActive: storeData.isActive,
          status: storeData.status.toUpperCase() as StoreStatus,
          expiresAt: new Date(storeData.expiresAt),
          gracePeriodEndsAt: storeData.gracePeriodEndsAt ? new Date(storeData.gracePeriodEndsAt) : null,
          deactivatedAt: storeData.deactivatedAt ? new Date(storeData.deactivatedAt) : null,
          archivedAt: storeData.archivedAt ? new Date(storeData.archivedAt) : null,
          lastPaymentReminder: storeData.lastPaymentReminder ? new Date(storeData.lastPaymentReminder) : null,
        },
      });

      logger.info(`[StoreDB] Created store: ${store.id}`);
      
      return {
        ...store,
        contactInfo: store.contactInfo as any,
        createdAt: store.createdAt.toISOString(),
        expiresAt: store.expiresAt.toISOString(),
        gracePeriodEndsAt: store.gracePeriodEndsAt?.toISOString(),
        deactivatedAt: store.deactivatedAt?.toISOString(),
        archivedAt: store.archivedAt?.toISOString(),
        lastPaymentReminder: store.lastPaymentReminder?.toISOString(),
        status: store.status.toLowerCase(),
      };
    } catch (error) {
      logger.error('[StoreDB] Failed to create store:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<DBStore | null> {
    try {
      const store = await prisma.store.findUnique({
        where: { id },
      });

      if (!store) return null;

      return {
        ...store,
        contactInfo: store.contactInfo as any,
        createdAt: store.createdAt.toISOString(),
        expiresAt: store.expiresAt.toISOString(),
        gracePeriodEndsAt: store.gracePeriodEndsAt?.toISOString(),
        deactivatedAt: store.deactivatedAt?.toISOString(),
        archivedAt: store.archivedAt?.toISOString(),
        lastPaymentReminder: store.lastPaymentReminder?.toISOString(),
        status: store.status.toLowerCase(),
      };
    } catch (error) {
      logger.error('[StoreDB] Failed to find store:', error);
      throw error;
    }
  }

  async findAll(filters?: {
    userId?: string;
    status?: string;
  }): Promise<DBStore[]> {
    try {
      const stores = await prisma.store.findMany({
        where: {
          userId: filters?.userId,
          status: filters?.status ? (filters.status.toUpperCase() as StoreStatus) : undefined,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return stores.map(store => ({
        ...store,
        contactInfo: store.contactInfo as any,
        createdAt: store.createdAt.toISOString(),
        expiresAt: store.expiresAt.toISOString(),
        gracePeriodEndsAt: store.gracePeriodEndsAt?.toISOString(),
        deactivatedAt: store.deactivatedAt?.toISOString(),
        archivedAt: store.archivedAt?.toISOString(),
        lastPaymentReminder: store.lastPaymentReminder?.toISOString(),
        status: store.status.toLowerCase(),
      }));
    } catch (error) {
      logger.error('[StoreDB] Failed to find stores:', error);
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<DBStore | null> {
    try {
      const store = await prisma.store.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!store) return null;

      return {
        ...store,
        contactInfo: store.contactInfo as any,
        createdAt: store.createdAt.toISOString(),
        expiresAt: store.expiresAt.toISOString(),
        gracePeriodEndsAt: store.gracePeriodEndsAt?.toISOString(),
        deactivatedAt: store.deactivatedAt?.toISOString(),
        archivedAt: store.archivedAt?.toISOString(),
        lastPaymentReminder: store.lastPaymentReminder?.toISOString(),
        status: store.status.toLowerCase(),
      };
    } catch (error) {
      logger.error('[StoreDB] Failed to find store by user:', error);
      throw error;
    }
  }

  async updateStore(id: string, updates: Partial<DBStore>): Promise<DBStore | null> {
    try {
      const store = await prisma.store.update({
        where: { id },
        data: {
          name: updates.name,
          categoryName: updates.categoryName,
          address: updates.address,
          contactInfo: updates.contactInfo as any,
          description: updates.description,
          logo: updates.logo,
          coverImage: updates.coverImage,
          planId: updates.planId,
          maxAds: updates.maxAds,
          adsUsed: updates.adsUsed,
          isActive: updates.isActive,
          status: updates.status ? (updates.status.toUpperCase() as StoreStatus) : undefined,
          expiresAt: updates.expiresAt ? new Date(updates.expiresAt) : undefined,
          gracePeriodEndsAt: updates.gracePeriodEndsAt ? new Date(updates.gracePeriodEndsAt) : undefined,
          deactivatedAt: updates.deactivatedAt ? new Date(updates.deactivatedAt) : undefined,
          archivedAt: updates.archivedAt ? new Date(updates.archivedAt) : undefined,
          lastPaymentReminder: updates.lastPaymentReminder ? new Date(updates.lastPaymentReminder) : undefined,
        },
      });

      logger.info(`[StoreDB] Updated store: ${id}`);
      
      return {
        ...store,
        contactInfo: store.contactInfo as any,
        createdAt: store.createdAt.toISOString(),
        expiresAt: store.expiresAt.toISOString(),
        gracePeriodEndsAt: store.gracePeriodEndsAt?.toISOString(),
        deactivatedAt: store.deactivatedAt?.toISOString(),
        archivedAt: store.archivedAt?.toISOString(),
        lastPaymentReminder: store.lastPaymentReminder?.toISOString(),
        status: store.status.toLowerCase(),
      };
    } catch (error) {
      logger.error('[StoreDB] Failed to update store:', error);
      throw error;
    }
  }

  async deleteStore(id: string): Promise<boolean> {
    try {
      await prisma.store.delete({
        where: { id },
      });

      logger.info(`[StoreDB] Deleted store: ${id}`);
      return true;
    } catch (error) {
      logger.error('[StoreDB] Failed to delete store:', error);
      return false;
    }
  }

  async followStore(userId: string, storeId: string): Promise<boolean> {
    try {
      const store = await prisma.store.findUnique({
        where: { id: storeId },
      });

      if (!store) return false;

      const followers = store.followers;
      if (!followers.includes(userId)) {
        followers.push(userId);
        
        await prisma.store.update({
          where: { id: storeId },
          data: { followers },
        });

        logger.info(`[StoreDB] User ${userId} followed store ${storeId}`);
      }
      
      return true;
    } catch (error) {
      logger.error('[StoreDB] Failed to follow store:', error);
      return false;
    }
  }

  async unfollowStore(userId: string, storeId: string): Promise<boolean> {
    try {
      const store = await prisma.store.findUnique({
        where: { id: storeId },
      });

      if (!store) return false;

      const followers = store.followers.filter(id => id !== userId);
      
      await prisma.store.update({
        where: { id: storeId },
        data: { followers },
      });

      logger.info(`[StoreDB] User ${userId} unfollowed store ${storeId}`);
      return true;
    } catch (error) {
      logger.error('[StoreDB] Failed to unfollow store:', error);
      return false;
    }
  }

  async getFollowedStores(userId: string): Promise<DBStore[]> {
    try {
      const stores = await prisma.store.findMany({
        where: {
          followers: {
            has: userId,
          },
        },
      });

      return stores.map(store => ({
        ...store,
        contactInfo: store.contactInfo as any,
        createdAt: store.createdAt.toISOString(),
        expiresAt: store.expiresAt.toISOString(),
        gracePeriodEndsAt: store.gracePeriodEndsAt?.toISOString(),
        deactivatedAt: store.deactivatedAt?.toISOString(),
        archivedAt: store.archivedAt?.toISOString(),
        lastPaymentReminder: store.lastPaymentReminder?.toISOString(),
        status: store.status.toLowerCase(),
      }));
    } catch (error) {
      logger.error('[StoreDB] Failed to get followed stores:', error);
      throw error;
    }
  }

  async isFollowing(userId: string, storeId: string): Promise<boolean> {
    try {
      const store = await prisma.store.findUnique({
        where: { id: storeId },
      });

      if (!store) return false;
      return store.followers.includes(userId);
    } catch (error) {
      logger.error('[StoreDB] Failed to check following status:', error);
      return false;
    }
  }

  async addRating(storeId: string, rating: number): Promise<boolean> {
    try {
      await prisma.store.update({
        where: { id: storeId },
        data: {
          rating: { increment: rating },
          totalRatings: { increment: 1 },
        },
      });

      logger.info(`[StoreDB] Added rating to store ${storeId}`);
      return true;
    } catch (error) {
      logger.error('[StoreDB] Failed to add rating:', error);
      return false;
    }
  }
}

export const storeDB = new StoreDatabase();

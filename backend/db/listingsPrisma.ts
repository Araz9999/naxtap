import { prisma } from './client';
import { logger } from '../utils/logger';
import type { AdType } from '@prisma/client';

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
  storeId?: string | null;
  createdAt: string;
  expiresAt: string;
  views: number;
  isFeatured: boolean;
  isPremium: boolean;
  adType: string;
  contactPreference: string;
  favorites: number;
  isArchived?: boolean;
  archivedAt?: string | null;
  originalPrice?: number | null;
  discountPercentage?: number | null;
  hasDiscount?: boolean;
  discountEndDate?: string | null;
  creativeEffects?: {
    id: string;
    name: { az: string; ru: string };
    type: string;
    color: string;
    endDate: string;
    isActive: boolean;
  }[];
}

function normalizeCreativeEffects(value: unknown): DBListing['creativeEffects'] {
  if (!value) return undefined;
  if (Array.isArray(value)) return value as DBListing['creativeEffects'];
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as DBListing['creativeEffects'];
    } catch {
      // ignore invalid JSON
    }
  }
  return undefined;
}

class ListingDatabase {
  async createListing(listingData: Omit<DBListing, 'id' | 'createdAt' | 'views' | 'favorites'>): Promise<DBListing> {
    try {
      const listing = await prisma.listing.create({
        data: {
          title: listingData.title as any,
          description: listingData.description as any,
          price: listingData.price,
          currency: listingData.currency,
          location: listingData.location as any,
          categoryId: listingData.categoryId,
          subcategoryId: listingData.subcategoryId,
          images: listingData.images,
          userId: listingData.userId,
          storeId: listingData.storeId,
          expiresAt: new Date(listingData.expiresAt),
          isFeatured: listingData.isFeatured,
          isPremium: listingData.isPremium,
          adType: listingData.adType.toUpperCase() as AdType,
          contactPreference: listingData.contactPreference,
          isArchived: listingData.isArchived || false,
          originalPrice: listingData.originalPrice,
          discountPercentage: listingData.discountPercentage,
          hasDiscount: listingData.hasDiscount || false,
          discountEndDate: listingData.discountEndDate ? new Date(listingData.discountEndDate) : null,
          creativeEffects: listingData.creativeEffects as any,
        },
      });

      logger.info(`[ListingDB] Created listing: ${listing.id}`);

      return {
        ...listing,
        title: listing.title as { az: string; ru: string },
        description: listing.description as { az: string; ru: string },
        location: listing.location as { az: string; ru: string },
        createdAt: listing.createdAt.toISOString(),
        expiresAt: listing.expiresAt.toISOString(),
        archivedAt: listing.archivedAt?.toISOString(),
        discountEndDate: listing.discountEndDate?.toISOString(),
        creativeEffects: normalizeCreativeEffects(listing.creativeEffects),
        adType: listing.adType.toLowerCase(),
      };
    } catch (error) {
      logger.error('[ListingDB] Failed to create listing:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<DBListing | null> {
    try {
      const listing = await prisma.listing.findUnique({
        where: { id },
      });

      if (!listing) return null;

      return {
        ...listing,
        title: listing.title as { az: string; ru: string },
        description: listing.description as { az: string; ru: string },
        location: listing.location as { az: string; ru: string },
        createdAt: listing.createdAt.toISOString(),
        expiresAt: listing.expiresAt.toISOString(),
        archivedAt: listing.archivedAt?.toISOString(),
        discountEndDate: listing.discountEndDate?.toISOString(),
        creativeEffects: normalizeCreativeEffects(listing.creativeEffects),
        adType: listing.adType.toLowerCase(),
      };
    } catch (error) {
      logger.error('[ListingDB] Failed to find listing:', error);
      throw error;
    }
  }

  async findAll(filters?: {
    userId?: string;
    storeId?: string;
    categoryId?: number;
    isArchived?: boolean;
  }): Promise<DBListing[]> {
    try {
      const listings = await prisma.listing.findMany({
        where: {
          userId: filters?.userId,
          storeId: filters?.storeId,
          categoryId: filters?.categoryId,
          isArchived: filters?.isArchived,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return listings.map(listing => ({
        ...listing,
        title: listing.title as { az: string; ru: string },
        description: listing.description as { az: string; ru: string },
        location: listing.location as { az: string; ru: string },
        createdAt: listing.createdAt.toISOString(),
        expiresAt: listing.expiresAt.toISOString(),
        archivedAt: listing.archivedAt?.toISOString(),
        discountEndDate: listing.discountEndDate?.toISOString(),
        creativeEffects: normalizeCreativeEffects(listing.creativeEffects),
        adType: listing.adType.toLowerCase(),
      }));
    } catch (error) {
      logger.error('[ListingDB] Failed to find listings:', error);
      throw error;
    }
  }

  async updateListing(id: string, updates: Partial<DBListing>): Promise<DBListing | null> {
    try {
      const listing = await prisma.listing.update({
        where: { id },
        data: {
          title: updates.title as any,
          description: updates.description as any,
          price: updates.price,
          currency: updates.currency,
          location: updates.location as any,
          categoryId: updates.categoryId,
          subcategoryId: updates.subcategoryId,
          images: updates.images,
          expiresAt: updates.expiresAt ? new Date(updates.expiresAt) : undefined,
          isFeatured: updates.isFeatured,
          isPremium: updates.isPremium,
          adType: updates.adType ? (updates.adType.toUpperCase() as AdType) : undefined,
          contactPreference: updates.contactPreference,
          originalPrice: updates.originalPrice,
          discountPercentage: updates.discountPercentage,
          hasDiscount: updates.hasDiscount,
          discountEndDate: updates.discountEndDate ? new Date(updates.discountEndDate) : undefined,
          creativeEffects: updates.creativeEffects as any,
        },
      });

      logger.info(`[ListingDB] Updated listing: ${id}`);

      return {
        ...listing,
        title: listing.title as { az: string; ru: string },
        description: listing.description as { az: string; ru: string },
        location: listing.location as { az: string; ru: string },
        createdAt: listing.createdAt.toISOString(),
        expiresAt: listing.expiresAt.toISOString(),
        archivedAt: listing.archivedAt?.toISOString(),
        discountEndDate: listing.discountEndDate?.toISOString(),
        creativeEffects: normalizeCreativeEffects(listing.creativeEffects),
        adType: listing.adType.toLowerCase(),
      };
    } catch (error) {
      logger.error('[ListingDB] Failed to update listing:', error);
      throw error;
    }
  }

  async deleteListing(id: string): Promise<boolean> {
    try {
      await prisma.listing.delete({
        where: { id },
      });

      logger.info(`[ListingDB] Deleted listing: ${id}`);
      return true;
    } catch (error) {
      logger.error('[ListingDB] Failed to delete listing:', error);
      return false;
    }
  }

  async incrementViews(id: string): Promise<boolean> {
    try {
      await prisma.listing.update({
        where: { id },
        data: {
          views: {
            increment: 1,
          },
        },
      });

      return true;
    } catch (error) {
      logger.error('[ListingDB] Failed to increment views:', error);
      return false;
    }
  }

  async archiveListing(id: string): Promise<boolean> {
    try {
      await prisma.listing.update({
        where: { id },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
      });

      logger.info(`[ListingDB] Archived listing: ${id}`);
      return true;
    } catch (error) {
      logger.error('[ListingDB] Failed to archive listing:', error);
      return false;
    }
  }

  async reactivateListing(id: string, expiresAt: string): Promise<boolean> {
    try {
      await prisma.listing.update({
        where: { id },
        data: {
          isArchived: false,
          archivedAt: null,
          expiresAt: new Date(expiresAt),
        },
      });

      logger.info(`[ListingDB] Reactivated listing: ${id}`);
      return true;
    } catch (error) {
      logger.error('[ListingDB] Failed to reactivate listing:', error);
      return false;
    }
  }
}

export const listingDB = new ListingDatabase();

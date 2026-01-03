import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { listingDB } from '../../../../db/listings';
import { TRPCError } from '@trpc/server';

export const updateListingProcedure = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      title: z.object({
        az: z.string(),
        ru: z.string(),
      }).optional(),
      description: z.object({
        az: z.string(),
        ru: z.string(),
      }).optional(),
      price: z.number().optional(),
      currency: z.string().optional(),
      location: z.object({
        az: z.string(),
        ru: z.string(),
      }).optional(),
      categoryId: z.number().optional(),
      subcategoryId: z.number().optional(),
      images: z.array(z.string()).optional(),
      expiresAt: z.string().optional(),
      isFeatured: z.boolean().optional(),
      isPremium: z.boolean().optional(),
      adType: z.enum(['free', 'standard', 'premium', 'vip']).optional(),
      contactPreference: z.enum(['phone', 'message', 'both']).optional(),
      originalPrice: z.number().optional(),
      discountPercentage: z.number().optional(),
      hasDiscount: z.boolean().optional(),
      discountEndDate: z.string().optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { id, ...updates } = input;

    const existing = await listingDB.findById(id);
    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Listing not found',
      });
    }

    if (existing.userId !== ctx.user.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to update this listing',
      });
    }

    const listing = await listingDB.updateListing(id, updates);
    return listing;
  });

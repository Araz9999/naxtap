import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { listingDB } from '../../../../db/listings';

export const createListingProcedure = protectedProcedure
  .input(
    z.object({
      title: z.object({
        az: z.string(),
        ru: z.string(),
      }),
      description: z.object({
        az: z.string(),
        ru: z.string(),
      }),
      price: z.number(),
      currency: z.string(),
      location: z.object({
        az: z.string(),
        ru: z.string(),
      }),
      categoryId: z.number(),
      subcategoryId: z.number(),
      images: z.array(z.string()),
      storeId: z.string().optional(),
      expiresAt: z.string(),
      isFeatured: z.boolean().default(false),
      isPremium: z.boolean().default(false),
      adType: z.enum(['free', 'standard', 'premium', 'vip']),
      contactPreference: z.enum(['phone', 'message', 'both']),
      originalPrice: z.number().optional(),
      discountPercentage: z.number().optional(),
      hasDiscount: z.boolean().optional(),
      discountEndDate: z.string().optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const listing = await listingDB.createListing({
      ...input,
      userId: ctx.user.id,
    });

    return listing;
  });

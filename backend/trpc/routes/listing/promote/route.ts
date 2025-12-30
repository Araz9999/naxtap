import { z } from 'zod';
import { protectedProcedure, publicProcedure } from '../../../create-context';
import { listingDB } from '../../../../db/listings';
import { TRPCError } from '@trpc/server';

export const promoteListingProcedure = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      adType: z.enum(['free', 'standard', 'premium', 'vip']),
      isFeatured: z.boolean().optional(),
      isPremium: z.boolean().optional(),
      duration: z.number(), // days
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const existing = await listingDB.findById(input.id);
    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Listing not found',
      });
    }

    if (existing.userId !== ctx.user.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to promote this listing',
      });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + input.duration);

    const listing = await listingDB.updateListing(input.id, {
      adType: input.adType,
      isFeatured: input.isFeatured ?? existing.isFeatured,
      isPremium: input.isPremium ?? existing.isPremium,
      expiresAt: expiresAt.toISOString(),
    });

    return listing;
  });

export const incrementViewsProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
    }),
  )
  .mutation(async ({ input }) => {
    const success = await listingDB.incrementViews(input.id);
    return { success };
  });

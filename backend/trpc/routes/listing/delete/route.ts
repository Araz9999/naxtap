import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { listingDB } from '../../../../db/listings';
import { TRPCError } from '@trpc/server';

export const deleteListingProcedure = protectedProcedure
  .input(
    z.object({
      id: z.string(),
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
        message: 'You do not have permission to delete this listing',
      });
    }

    const success = await listingDB.deleteListing(input.id);
    return { success };
  });

import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { listingDB } from '../../../../db/listings';
import { TRPCError } from '@trpc/server';

export const getListingByIdProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
    }),
  )
  .query(async ({ input }) => {
    const listing = await listingDB.findById(input.id);
    
    if (!listing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Listing not found',
      });
    }

    return listing;
  });

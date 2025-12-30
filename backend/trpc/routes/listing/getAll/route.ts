import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { listingDB } from '../../../../db/listings';

export const getAllListingsProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string().optional(),
      storeId: z.string().optional(),
      categoryId: z.number().optional(),
      isArchived: z.boolean().optional(),
    }).optional(),
  )
  .query(async ({ input }) => {
    const listings = await listingDB.findAll(input);
    return listings;
  });

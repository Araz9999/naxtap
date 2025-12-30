import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { storeDB } from '../../../../db/stores';

export const getAllStoresProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string().optional(),
      status: z.enum(['active', 'grace_period', 'deactivated', 'archived']).optional(),
    }).optional(),
  )
  .query(async ({ input }) => {
    const stores = await storeDB.findAll(input);
    return stores;
  });

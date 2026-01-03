import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { storeDB } from '../../../../db/stores';
import { TRPCError } from '@trpc/server';

export const getStoreByIdProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
    }),
  )
  .query(async ({ input }) => {
    const store = await storeDB.findById(input.id);

    if (!store) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Store not found',
      });
    }

    return store;
  });

export const getStoreByUserIdProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string(),
    }),
  )
  .query(async ({ input }) => {
    const store = await storeDB.findByUserId(input.userId);
    return store;
  });

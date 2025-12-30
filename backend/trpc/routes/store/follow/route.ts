import { z } from 'zod';
import { protectedProcedure, publicProcedure } from '../../../create-context';
import { storeDB } from '../../../../db/stores';
import { TRPCError } from '@trpc/server';

export const followStoreProcedure = protectedProcedure
  .input(
    z.object({
      storeId: z.string(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const store = await storeDB.findById(input.storeId);
    if (!store) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Store not found',
      });
    }

    const success = await storeDB.followStore(ctx.user.id, input.storeId);
    return { success };
  });

export const unfollowStoreProcedure = protectedProcedure
  .input(
    z.object({
      storeId: z.string(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const store = await storeDB.findById(input.storeId);
    if (!store) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Store not found',
      });
    }

    const success = await storeDB.unfollowStore(ctx.user.id, input.storeId);
    return { success };
  });

export const getFollowedStoresProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    const stores = await storeDB.getFollowedStores(ctx.user.id);
    return stores;
  });

export const isFollowingStoreProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string(),
      storeId: z.string(),
    }),
  )
  .query(async ({ input }) => {
    const isFollowing = await storeDB.isFollowing(input.userId, input.storeId);
    return { isFollowing };
  });

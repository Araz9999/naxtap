import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { storeDB } from '../../../../db/stores';
import { TRPCError } from '@trpc/server';

export const deleteStoreProcedure = protectedProcedure
  .input(
    z.object({
      id: z.string(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const existing = await storeDB.findById(input.id);
    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Store not found',
      });
    }

    if (existing.userId !== ctx.user.id && ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this store',
      });
    }

    const success = await storeDB.deleteStore(input.id);
    return { success };
  });

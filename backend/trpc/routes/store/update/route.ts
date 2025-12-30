import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { storeDB } from '../../../../db/stores';
import { TRPCError } from '@trpc/server';

export const updateStoreProcedure = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      categoryName: z.string().optional(),
      address: z.string().optional(),
      contactInfo: z.object({
        phone: z.string().optional(),
        email: z.string().optional(),
        website: z.string().optional(),
        whatsapp: z.string().optional(),
      }).optional(),
      description: z.string().optional(),
      logo: z.string().optional(),
      coverImage: z.string().optional(),
      planId: z.string().optional(),
      maxAds: z.number().optional(),
      expiresAt: z.string().optional(),
      isActive: z.boolean().optional(),
      status: z.enum(['active', 'grace_period', 'deactivated', 'archived']).optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { id, ...updates } = input;
    
    const existing = await storeDB.findById(id);
    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Store not found',
      });
    }

    if (existing.userId !== ctx.user.id && ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to update this store',
      });
    }

    const store = await storeDB.updateStore(id, updates);
    return store;
  });

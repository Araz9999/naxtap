import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { storeDB } from '../../../../db/stores';

export const createStoreProcedure = protectedProcedure
  .input(
    z.object({
      name: z.string(),
      categoryName: z.string(),
      address: z.string(),
      contactInfo: z.object({
        phone: z.string().optional(),
        email: z.string().optional(),
        website: z.string().optional(),
        whatsapp: z.string().optional(),
      }),
      description: z.string(),
      logo: z.string().optional(),
      coverImage: z.string().optional(),
      planId: z.string(),
      maxAds: z.number(),
      expiresAt: z.string(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const store = await storeDB.createStore({
      ...input,
      userId: ctx.user.id,
      isActive: true,
      status: 'active',
    });

    return store;
  });

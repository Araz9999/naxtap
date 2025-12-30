import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { logger } from '../../../../utils/logger';

export const updateMeProcedure = protectedProcedure
  .input(
    z.object({
      name: z.string().min(2).max(100).optional(),
      phone: z.string().max(32).optional(),
      avatar: z.string().max(500).optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.user.userId;

    // Normalize updates
    const data: { name?: string; phone?: string | null; avatar?: string | null } = {};

    if (typeof input.name === 'string') {
      data.name = input.name.trim();
    }

    if (typeof input.phone === 'string') {
      const normalizedPhone = input.phone.trim();
      data.phone = normalizedPhone.length ? normalizedPhone : null;
    }

    if (typeof input.avatar === 'string') {
      const normalizedAvatar = input.avatar.trim();
      data.avatar = normalizedAvatar.length ? normalizedAvatar : null;
    }

    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          phone: true,
          verified: true,
          role: true,
          balance: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      logger.info('[User] Updated own profile', { userId });
      return updated;
    } catch (error) {
      logger.error('[User] updateMe error:', error);
      throw error;
    }
  });


import { z } from 'zod';
import { adminProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { findUserByEmail } from '../../../../db/userPrisma';
import { hashPassword } from '../../../../utils/password';
import { logger } from '../../../../utils/logger';

export const createModeratorProcedure = adminProcedure
  .input(
    z.object({
      email: z.string().email(),
      name: z.string().min(1),
      password: z.string().min(8),
      phone: z.string().optional(),
      permissions: z
        .array(
          z.enum([
            'manage_reports',
            'manage_users',
            'manage_listings',
            'manage_stores',
            'manage_tickets',
            'view_analytics',
            'manage_moderators',
          ]),
        )
        .optional(),
    }),
  )
  .mutation(async ({ input }) => {
    try {
      const existingUser = await findUserByEmail(input.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const passwordHash = await hashPassword(input.password);

      const moderator = await prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          name: input.name,
          phone: input.phone || null,
          passwordHash,
          role: 'MODERATOR',
          verified: true, // Moderators are auto-verified
          balance: 0,
          moderatorPermissions: input.permissions ?? ['manage_reports', 'manage_tickets'],
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          phone: true,
          verified: true,
          role: true,
          moderatorPermissions: true,
          createdAt: true,
        },
      });

      logger.info('[Admin] Moderator created:', { moderatorId: moderator.id });

      return moderator;
    } catch (error) {
      logger.error('[Admin] Create moderator error:', error);
      throw error;
    }
  });


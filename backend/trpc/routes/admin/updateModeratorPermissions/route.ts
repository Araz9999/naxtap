import { z } from 'zod';
import { adminProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { logger } from '../../../../utils/logger';

const permissionSchema = z.enum([
  'manage_reports',
  'manage_users',
  'manage_listings',
  'manage_stores',
  'manage_tickets',
  'view_analytics',
  'manage_moderators',
]);

export const updateModeratorPermissionsProcedure = adminProcedure
  .input(
    z.object({
      userId: z.string(),
      permissions: z.array(permissionSchema),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: input.userId } });
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'MODERATOR') {
        throw new Error('Permissions can only be set for moderators');
      }

      const updated = await prisma.user.update({
        where: { id: input.userId },
        data: {
          moderatorPermissions: input.permissions,
        },
        select: {
          id: true,
          role: true,
          moderatorPermissions: true,
          updatedAt: true,
        },
      });

      const actorId = (ctx.user as any).userId ?? (ctx.user as any).id;
      logger.info('[Admin] Moderator permissions updated:', {
        moderatorId: input.userId,
        updatedBy: actorId,
        permissionsCount: input.permissions.length,
      });

      return updated;
    } catch (error) {
      logger.error('[Admin] Update moderator permissions error:', error);
      throw error;
    }
  });


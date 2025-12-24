import { adminProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { logger } from '../../../../utils/logger';

export const getModeratorsProcedure = adminProcedure.query(async () => {
  try {
    const moderators = await prisma.user.findMany({
      where: {
        role: {
          in: ['MODERATOR', 'ADMIN'],
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phone: true,
        verified: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            socialAccounts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return moderators;
  } catch (error) {
    logger.error('[Admin] Get moderators error:', error);
    throw error;
  }
});


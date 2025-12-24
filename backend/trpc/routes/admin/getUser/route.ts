import { z } from 'zod';
import { adminProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { logger } from '../../../../utils/logger';

export const getUserProcedure = adminProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input }) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        include: {
          socialAccounts: true,
          _count: {
            select: {
              socialAccounts: true,
            },
          },
        },
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Remove sensitive data
      const { passwordHash, ...safeUser } = user;
      
      return safeUser;
    } catch (error) {
      logger.error('[Admin] Get user error:', error);
      throw error;
    }
  });


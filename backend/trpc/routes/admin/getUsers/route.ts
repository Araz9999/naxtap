import { z } from 'zod';
import { adminProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { logger } from '../../../../utils/logger';

export const getUsersProcedure = adminProcedure
  .input(
    z.object({
      page: z.number().min(1).optional().default(1),
      limit: z.number().min(1).max(100).optional().default(20),
      role: z.enum(['USER', 'MODERATOR', 'ADMIN']).optional(),
      search: z.string().optional(),
      verified: z.boolean().optional(),
    }),
  )
  .query(async ({ input }) => {
    try {
      const skip = (input.page - 1) * input.limit;

      const where: any = {};

      if (input.role) {
        where.role = input.role;
      }

      if (input.verified !== undefined) {
        where.verified = input.verified;
      }

      if (input.search) {
        where.OR = [
          { email: { contains: input.search, mode: 'insensitive' } },
          { name: { contains: input.search, mode: 'insensitive' } },
          { phone: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { createdAt: 'desc' },
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
            _count: {
              select: {
                socialAccounts: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    } catch (error) {
      logger.error('[Admin] Get users error:', error);
      throw error;
    }
  });


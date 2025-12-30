import { z } from 'zod';
import { moderatorProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { logger } from '../../../../utils/logger';

const statusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed']);

export const getTicketsProcedure = moderatorProcedure
  .input(
    z
      .object({
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).max(100).optional().default(20),
        status: statusSchema.optional(),
        search: z.string().optional(),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    try {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (input?.status) where.status = input.status;
      if (input?.search) {
        const q = input.search;
        where.OR = [
          { id: { contains: q, mode: 'insensitive' } },
          { userId: { contains: q, mode: 'insensitive' } },
          { subject: { contains: q, mode: 'insensitive' } },
          { message: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
        ];
      }

      const [tickets, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
          include: {
            responses: { orderBy: { createdAt: 'asc' } },
          },
        }),
        prisma.supportTicket.count({ where }),
      ]);

      return {
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('[Support] Get tickets error:', error);
      throw error;
    }
  });


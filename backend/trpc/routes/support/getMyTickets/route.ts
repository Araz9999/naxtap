import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { logger } from '../../../../utils/logger';

const statusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed']);

export const getMyTicketsProcedure = protectedProcedure
  .input(
    z
      .object({
        status: statusSchema.optional(),
      })
      .optional()
  )
  .query(async ({ input, ctx }) => {
    try {
      const userId = (ctx.user as any).userId ?? (ctx.user as any).id;
      const where: any = { userId };
      if (input?.status) where.status = input.status;

      const tickets = await prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
          responses: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      return tickets;
    } catch (error) {
      logger.error('[Support] Get my tickets error:', error);
      throw error;
    }
  });


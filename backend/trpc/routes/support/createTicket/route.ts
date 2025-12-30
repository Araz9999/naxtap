import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { logger } from '../../../../utils/logger';

const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const createTicketProcedure = protectedProcedure
  .input(
    z.object({
      subject: z.string().min(5).max(200),
      message: z.string().min(10).max(2000),
      category: z.string().min(1).max(50),
      priority: prioritySchema.optional().default('medium'),
      attachments: z.array(z.string()).optional().default([]),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const userId = (ctx.user as any).userId ?? (ctx.user as any).id;

      const ticket = await prisma.supportTicket.create({
        data: {
          userId,
          subject: input.subject.trim(),
          message: input.message.trim(),
          category: input.category,
          priority: input.priority,
          status: 'open',
          attachments: input.attachments ?? [],
          updatedAt: new Date(),
        },
        include: {
          responses: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      logger.info('[Support] Ticket created:', { ticketId: ticket.id, userId });
      return ticket;
    } catch (error) {
      logger.error('[Support] Create ticket error:', error);
      throw error;
    }
  });


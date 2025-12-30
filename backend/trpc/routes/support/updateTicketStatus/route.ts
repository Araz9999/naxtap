import { z } from 'zod';
import { moderatorProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { logger } from '../../../../utils/logger';
import { TRPCError } from '@trpc/server';

const statusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed']);

export const updateTicketStatusProcedure = moderatorProcedure
  .input(
    z.object({
      ticketId: z.string(),
      status: statusSchema,
      moderatorNotes: z.string().optional(),
      resolution: z.string().optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const actorId = (ctx.user as any).userId ?? (ctx.user as any).id;
      const ticket = await prisma.supportTicket.findUnique({ where: { id: input.ticketId } });
      if (!ticket) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket not found' });
      }

      const resolution = input.resolution?.trim();
      if ((input.status === 'resolved' || input.status === 'closed') && !resolution) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Resolution is required when resolving or closing a ticket',
        });
      }

      const updated = await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: input.status,
          assignedModeratorId: actorId,
          moderatorNotes: input.moderatorNotes?.trim() || ticket.moderatorNotes,
          resolution: resolution || ticket.resolution,
          updatedAt: new Date(),
        },
        include: {
          responses: { orderBy: { createdAt: 'asc' } },
        },
      });

      logger.info('[Support] Ticket status updated:', {
        ticketId: ticket.id,
        status: input.status,
        moderatorId: actorId,
      });

      return updated;
    } catch (error) {
      logger.error('[Support] Update ticket status error:', error);
      throw error;
    }
  });


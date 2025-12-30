import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { logger } from '../../../../utils/logger';
import { TRPCError } from '@trpc/server';

export const addTicketResponseProcedure = protectedProcedure
  .input(
    z.object({
      ticketId: z.string(),
      message: z.string().min(1).max(2000),
      attachments: z.array(z.string()).optional().default([]),
      // allow moderators to mark internal messages later if needed
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const actorId = (ctx.user as any).userId ?? (ctx.user as any).id;
      const actorRole = ((ctx.user as any).role || '').toString().toUpperCase();
      const isModerator = actorRole === 'ADMIN' || actorRole === 'MODERATOR';

      const ticket = await prisma.supportTicket.findUnique({ where: { id: input.ticketId } });
      if (!ticket) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket not found' });
      }

      // Users can only respond to their own tickets
      if (!isModerator && ticket.userId !== actorId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You cannot respond to this ticket' });
      }

      const response = await prisma.supportResponse.create({
        data: {
          ticketId: ticket.id,
          userId: actorId,
          message: input.message.trim(),
          isAdmin: isModerator,
          attachments: input.attachments ?? [],
        },
      });

      // Move ticket to in_progress when a moderator responds
      const updateData: any = {
        updatedAt: new Date(),
      };
      if (isModerator && ticket.status === 'open') {
        updateData.status = 'in_progress';
        updateData.assignedModeratorId = actorId;
      }

      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: updateData,
      });

      logger.info('[Support] Ticket response added:', {
        ticketId: ticket.id,
        by: actorId,
        isAdmin: isModerator,
      });

      return response;
    } catch (error) {
      logger.error('[Support] Add ticket response error:', error);
      throw error;
    }
  });


import { moderatorProcedure } from '../../../create-context';
import { moderationDb } from '../../../../db/moderation';
import { prisma } from '../../../../db/client';

export const getStatsProcedure = moderatorProcedure
  .query(async () => {
    const base = moderationDb.stats.getOverview();

    const [openTickets, inProgressTickets, resolvedTickets, totalTickets] = await Promise.all([
      prisma.supportTicket.count({ where: { status: 'open' } }),
      prisma.supportTicket.count({ where: { status: 'in_progress' } }),
      prisma.supportTicket.count({ where: { status: 'resolved' } }),
      prisma.supportTicket.count(),
    ]);

    return {
      ...base,
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
    };
  });

import { z } from 'zod';
import { moderatorProcedure } from '../../../create-context';
import { moderationDb } from '../../../../db/moderation';

export const getReportsProcedure = moderatorProcedure
  .input(z.object({
    status: z.enum(['pending', 'in_review', 'resolved', 'dismissed']).optional(),
    moderatorId: z.string().optional(),
  }).optional())
  .query(({ input }) => {
    if (!input) {
      return moderationDb.reports.getAll();
    }
    if (input.status) {
      return moderationDb.reports.getByStatus(input.status);
    }
    if (input.moderatorId) {
      return moderationDb.reports.getByModerator(input.moderatorId);
    }
    return moderationDb.reports.getAll();
  });

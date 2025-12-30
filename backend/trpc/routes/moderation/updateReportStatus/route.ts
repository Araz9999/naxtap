import { z } from 'zod';
import { moderatorProcedure } from '../../../create-context';
import { moderationDb } from '../../../../db/moderation';
import { logger } from '../../../../utils/logger';
import { TRPCError } from '@trpc/server';

export const updateReportStatusProcedure = moderatorProcedure
  .input(z.object({
    reportId: z.string(),
    status: z.enum(['pending', 'in_review', 'resolved', 'dismissed']),
    moderatorNotes: z.string().optional(),
    resolution: z.string().optional(),
  }))
  .mutation(({ input, ctx }) => {
    const trimmedResolution = input.resolution?.trim();
    const trimmedNotes = input.moderatorNotes?.trim();

    // Require an explicit resolution/reason when closing a report
    if ((input.status === 'resolved' || input.status === 'dismissed') && !trimmedResolution) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Resolution (reason) is required when resolving or dismissing a report',
      });
    }

    logger.info('[Moderation] Report status updated:', {
      reportId: input.reportId,
      status: input.status,
      moderatorId: ctx.user.userId,
    });

    if (input.status === 'resolved' && trimmedResolution) {
      logger.info('[Moderation] Report resolved:', { reportId: input.reportId });
      const updated = moderationDb.reports.resolve(input.reportId, trimmedResolution, ctx.user.userId);
      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Report not found' });
      }
      return updated;
    }
    if (input.status === 'dismissed' && trimmedResolution) {
      logger.info('[Moderation] Report dismissed:', { reportId: input.reportId });
      const updated = moderationDb.reports.dismiss(input.reportId, trimmedResolution, ctx.user.userId);
      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Report not found' });
      }
      return updated;
    }
    const updated = moderationDb.reports.updateStatus(
      input.reportId,
      input.status,
      ctx.user.userId,
      trimmedNotes,
    );
    if (!updated) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Report not found' });
    }
    return updated;
  });

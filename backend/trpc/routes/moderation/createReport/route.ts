import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { moderationDb } from '../../../../db/moderation';
import { Report } from '../../../../types/moderation';
import { logger } from '../../../../utils/logger';

export const createReportProcedure = protectedProcedure
  .input(z.object({
    reportedUserId: z.string().optional(),
    reportedListingId: z.string().optional(),
    reportedStoreId: z.string().optional(),
    type: z.enum(['spam', 'inappropriate_content', 'fake_listing', 'harassment', 'fraud', 'copyright', 'other']),
    reason: z.string(),
    description: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    evidence: z.array(z.string()).optional(),
  }))
  .mutation(({ input, ctx }) => {
    logger.info('[Moderation] Report created:', {
      reporterId: ctx.user.userId,
      type: input.type,
      priority: input.priority || 'medium',
    });
    const report: Report = {
      id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      reporterId: ctx.user.userId,
      reportedUserId: input.reportedUserId,
      reportedListingId: input.reportedListingId,
      reportedStoreId: input.reportedStoreId,
      type: input.type,
      reason: input.reason,
      description: input.description,
      status: 'pending',
      priority: input.priority || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evidence: input.evidence,
    };

    return moderationDb.reports.create(report);
  });

import { 
  Report, 
  ModerationAction, 
  SupportTicket, 
  SupportResponse,
  ReportStatus,
  ReportPriority,
  TicketStatus 
} from '../types/moderation';
import { logger } from '../utils/logger';

const reports: Map<string, Report> = new Map();
const moderationActions: Map<string, ModerationAction> = new Map();
const supportTickets: Map<string, SupportTicket> = new Map();

const sortByCreatedAtDesc = <T extends { createdAt: string }>(items: T[]) =>
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export const moderationDb = {
  reports: {
    getAll: () => sortByCreatedAtDesc(Array.from(reports.values())),
    getById: (id: string) => reports.get(id) || null,
    getByStatus: (status: ReportStatus) => {
      return sortByCreatedAtDesc(Array.from(reports.values()).filter(r => r.status === status));
    },
    getByModerator: (moderatorId: string) => {
      return sortByCreatedAtDesc(
        Array.from(reports.values()).filter(r => r.assignedModeratorId === moderatorId)
      );
    },
    getByReporter: (reporterId: string) => {
      return sortByCreatedAtDesc(Array.from(reports.values()).filter(r => r.reporterId === reporterId));
    },
    create: (report: Report) => {
      logger.info('[ModerationDB] Creating report:', report.id);
      reports.set(report.id, report);
      return report;
    },
    update: (id: string, updates: Partial<Report>) => {
      logger.info('[ModerationDB] Updating report:', id);
      const report = reports.get(id);
      if (report) {
        const updated = { ...report, ...updates, updatedAt: new Date().toISOString() };
        reports.set(id, updated);
        return updated;
      }
      logger.warn('[ModerationDB] Report not found:', id);
      return null;
    },
    delete: (id: string) => {
      logger.info('[ModerationDB] Deleting report:', id);
      return reports.delete(id);
    },
    updateStatus: (id: string, status: ReportStatus, moderatorId?: string, notes?: string) => {
      logger.info('[ModerationDB] Updating report status:', id, 'to', status);
      const report = reports.get(id);
      if (report) {
        const updated = {
          ...report,
          status,
          assignedModeratorId: moderatorId || report.assignedModeratorId,
          moderatorNotes: notes || report.moderatorNotes,
          updatedAt: new Date().toISOString(),
        };
        reports.set(id, updated);
        return updated;
      }
      logger.warn('[ModerationDB] Report not found:', id);
      return null;
    },
    assignToModerator: (id: string, moderatorId: string) => {
      logger.info('[ModerationDB] Assigning report to moderator:', id, moderatorId);
      const report = reports.get(id);
      if (report) {
        const updated = {
          ...report,
          assignedModeratorId: moderatorId,
          status: 'in_review' as const,
          updatedAt: new Date().toISOString(),
        };
        reports.set(id, updated);
        return updated;
      }
      logger.warn('[ModerationDB] Report not found:', id);
      return null;
    },
    resolve: (id: string, resolution: string, moderatorId: string) => {
      logger.info('[ModerationDB] Resolving report:', id);
      const report = reports.get(id);
      if (report) {
        const updated = {
          ...report,
          status: 'resolved' as const,
          resolution,
          assignedModeratorId: moderatorId,
          updatedAt: new Date().toISOString(),
        };
        reports.set(id, updated);
        return updated;
      }
      logger.warn('[ModerationDB] Report not found:', id);
      return null;
    },
    dismiss: (id: string, reason: string, moderatorId: string) => {
      logger.info('[ModerationDB] Dismissing report:', id);
      const report = reports.get(id);
      if (report) {
        const updated = {
          ...report,
          status: 'dismissed' as const,
          resolution: reason,
          assignedModeratorId: moderatorId,
          updatedAt: new Date().toISOString(),
        };
        reports.set(id, updated);
        return updated;
      }
      logger.warn('[ModerationDB] Report not found:', id);
      return null;
    },
  },

  actions: {
    getAll: () => Array.from(moderationActions.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    getById: (id: string) => moderationActions.get(id) || null,
    getByModerator: (moderatorId: string) => {
      return Array.from(moderationActions.values()).filter(a => a.moderatorId === moderatorId);
    },
    getByTargetUser: (userId: string) => {
      return Array.from(moderationActions.values()).filter(a => a.targetUserId === userId);
    },
    getActive: () => {
      return Array.from(moderationActions.values()).filter(a => a.isActive);
    },
    create: (action: ModerationAction) => {
      logger.info('[ModerationDB] Creating moderation action:', action.id);
      moderationActions.set(action.id, action);
      return action;
    },
    update: (id: string, updates: Partial<ModerationAction>) => {
      logger.info('[ModerationDB] Updating moderation action:', id);
      const action = moderationActions.get(id);
      if (action) {
        const updated = { ...action, ...updates };
        moderationActions.set(id, updated);
        return updated;
      }
      logger.warn('[ModerationDB] Moderation action not found:', id);
      return null;
    },
    deactivate: (id: string) => {
      logger.info('[ModerationDB] Deactivating moderation action:', id);
      const action = moderationActions.get(id);
      if (action) {
        const updated = { ...action, isActive: false };
        moderationActions.set(id, updated);
        return updated;
      }
      logger.warn('[ModerationDB] Moderation action not found:', id);
      return null;
    },
    delete: (id: string) => {
      logger.info('[ModerationDB] Deleting moderation action:', id);
      return moderationActions.delete(id);
    },
  },

  tickets: {
    getAll: () => Array.from(supportTickets.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    getById: (id: string) => supportTickets.get(id) || null,
    getByStatus: (status: TicketStatus) => {
      return Array.from(supportTickets.values()).filter(t => t.status === status);
    },
    getByUser: (userId: string) => {
      return Array.from(supportTickets.values()).filter(t => t.userId === userId);
    },
    getByModerator: (moderatorId: string) => {
      return Array.from(supportTickets.values()).filter(t => t.assignedModeratorId === moderatorId);
    },
    create: (ticket: SupportTicket) => {
      logger.info('[ModerationDB] Creating support ticket:', ticket.id);
      supportTickets.set(ticket.id, ticket);
      return ticket;
    },
    update: (id: string, updates: Partial<SupportTicket>) => {
      logger.info('[ModerationDB] Updating support ticket:', id);
      const ticket = supportTickets.get(id);
      if (ticket) {
        const updated = { ...ticket, ...updates, updatedAt: new Date().toISOString() };
        supportTickets.set(id, updated);
        return updated;
      }
      logger.warn('[ModerationDB] Support ticket not found:', id);
      return null;
    },
    updateStatus: (id: string, status: TicketStatus) => {
      logger.info('[ModerationDB] Updating ticket status:', id, 'to', status);
      const ticket = supportTickets.get(id);
      if (ticket) {
        const updated = {
          ...ticket,
          status,
          updatedAt: new Date().toISOString(),
        };
        supportTickets.set(id, updated);
        return updated;
      }
      logger.warn('[ModerationDB] Support ticket not found:', id);
      return null;
    },
    assignToModerator: (id: string, moderatorId: string) => {
      logger.info('[ModerationDB] Assigning ticket to moderator:', id, moderatorId);
      const ticket = supportTickets.get(id);
      if (ticket) {
        const updated = {
          ...ticket,
          assignedModeratorId: moderatorId,
          status: 'in_progress' as const,
          updatedAt: new Date().toISOString(),
        };
        supportTickets.set(id, updated);
        return updated;
      }
      logger.warn('[ModerationDB] Support ticket not found:', id);
      return null;
    },
    addResponse: (id: string, response: SupportResponse) => {
      logger.info('[ModerationDB] Adding response to ticket:', id);
      const ticket = supportTickets.get(id);
      if (ticket) {
        const updated = {
          ...ticket,
          responses: [...ticket.responses, response],
          updatedAt: new Date().toISOString(),
        };
        supportTickets.set(id, updated);
        return updated;
      }
      logger.warn('[ModerationDB] Support ticket not found:', id);
      return null;
    },
    delete: (id: string) => {
      logger.info('[ModerationDB] Deleting support ticket:', id);
      return supportTickets.delete(id);
    },
  },

  stats: {
    getOverview: () => {
      const allReports = Array.from(reports.values());
      const allActions = Array.from(moderationActions.values());
      const allTickets = Array.from(supportTickets.values());

      return {
        totalReports: allReports.length,
        pendingReports: allReports.filter(r => r.status === 'pending').length,
        inReviewReports: allReports.filter(r => r.status === 'in_review').length,
        resolvedReports: allReports.filter(r => r.status === 'resolved').length,
        dismissedReports: allReports.filter(r => r.status === 'dismissed').length,
        totalActions: allActions.length,
        activeActions: allActions.filter(a => a.isActive).length,
        totalTickets: allTickets.length,
        openTickets: allTickets.filter(t => t.status === 'open').length,
        inProgressTickets: allTickets.filter(t => t.status === 'in_progress').length,
        resolvedTickets: allTickets.filter(t => t.status === 'resolved').length,
      };
    },
  },
};

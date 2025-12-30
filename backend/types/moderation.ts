import { LocalizedText } from './category';

export type ReportType =
  | 'spam'
  | 'inappropriate_content'
  | 'fake_listing'
  | 'harassment'
  | 'fraud'
  | 'copyright'
  | 'other';

export type ReportStatus = 'pending' | 'in_review' | 'resolved' | 'dismissed';

export type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  reportedListingId?: string;
  reportedStoreId?: string;
  type: ReportType;
  reason: string;
  description: string;
  status: ReportStatus;
  priority: ReportPriority;
  createdAt: string;
  updatedAt: string;
  assignedModeratorId?: string;
  moderatorNotes?: string;
  resolution?: string;
  evidence?: string[]; // URLs to screenshots or other evidence
}

export interface ModerationAction {
  id: string;
  moderatorId: string;
  targetUserId?: string;
  targetListingId?: string;
  targetStoreId?: string;
  reportId?: string;
  action: ModerationActionType;
  reason: string;
  duration?: number; // For temporary bans, in hours
  createdAt: string;
  isActive: boolean;
}

export type ModerationActionType =
  | 'warning'
  | 'temporary_ban'
  | 'permanent_ban'
  | 'listing_removal'
  | 'store_suspension'
  | 'content_edit'
  | 'account_restriction';

export interface ModerationStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  dismissedReports: number;
  averageResolutionTime: number; // In hours
  reportsByType: Record<ReportType, number>;
  reportsByPriority: Record<ReportPriority, number>;
  moderatorStats: {
    [moderatorId: string]: {
      handledReports: number;
      averageResponseTime: number;
      resolutionRate: number;
    };
  };
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  category: SupportCategory;
  priority: ReportPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  assignedModeratorId?: string;
  responses: SupportResponse[];
  attachments?: string[];
}

export type SupportCategory =
  | 'technical'
  | 'billing'
  | 'account'
  | 'listing'
  | 'store'
  | 'report'
  | 'other';

export type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';

export interface SupportResponse {
  id: string;
  ticketId: string;
  responderId: string;
  responderRole: 'user' | 'moderator' | 'admin';
  message: string;
  createdAt: string;
  isInternal: boolean; // Internal notes only visible to moderators
  attachments?: string[];
}

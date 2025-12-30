import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Report, ModerationAction, ModerationStats, SupportTicket, SupportResponse, ReportType, ReportStatus, ReportPriority, SupportCategory, TicketStatus } from '@/types/moderation';
import { User, ModeratorPermission } from '@/types/user';

interface ModerationState {
  reports: Report[];
  moderationActions: ModerationAction[];
  supportTickets: SupportTicket[];
  moderators: User[];
  stats: ModerationStats;

  // Permission helpers
  hasPermission: (moderatorId: string, permission: ModeratorPermission) => boolean;
  checkPermission: (moderatorId: string, permission: ModeratorPermission) => void;

  // Report management
  createReport: (report: Omit<Report, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  updateReportStatus: (reportId: string, status: ReportStatus, moderatorId?: string, notes?: string) => void;
  assignReportToModerator: (reportId: string, moderatorId: string) => void;
  resolveReport: (reportId: string, resolution: string, moderatorId: string) => void;
  dismissReport: (reportId: string, reason: string, moderatorId: string) => void;

  // Moderation actions
  createModerationAction: (action: Omit<ModerationAction, 'id' | 'createdAt' | 'isActive'>) => void;
  deactivateModerationAction: (actionId: string) => void;

  // Support tickets
  createSupportTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'responses'>) => void;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  assignTicketToModerator: (ticketId: string, moderatorId: string) => void;
  addTicketResponse: (ticketId: string, response: Omit<SupportResponse, 'id' | 'createdAt'>) => void;

  // Moderator management
  addModerator: (user: User, permissions: ModeratorPermission[]) => void;
  removeModerator: (userId: string) => void;
  updateModeratorPermissions: (userId: string, permissions: ModeratorPermission[]) => void;

  // Getters
  getReportsByStatus: (status: ReportStatus) => Report[];
  getReportsByModerator: (moderatorId: string) => Report[];
  getTicketsByStatus: (status: TicketStatus) => SupportTicket[];
  getTicketsByModerator: (moderatorId: string) => SupportTicket[];
  getUserModerationHistory: (userId: string) => ModerationAction[];

  // Statistics
  updateStats: () => void;
}

export const useModerationStore = create<ModerationState>()(
  persist(
    (set, get) => ({
      reports: [],
      moderationActions: [],
      supportTickets: [],
      moderators: [],
      stats: {
        totalReports: 0,
        pendingReports: 0,
        resolvedReports: 0,
        dismissedReports: 0,
        averageResolutionTime: 0,
        reportsByType: {
          spam: 0,
          inappropriate_content: 0,
          fake_listing: 0,
          harassment: 0,
          fraud: 0,
          copyright: 0,
          other: 0,
        },
        reportsByPriority: {
          low: 0,
          medium: 0,
          high: 0,
          urgent: 0,
        },
        moderatorStats: {},
      },

      // ===== PERMISSION HELPERS =====

      hasPermission: (moderatorId, permission) => {
        // ✅ Admin always has all permissions
        const moderator = get().moderators.find(m => m.id === moderatorId);

        if (!moderator) {
          return false;
        }

        // ✅ Admin role has all permissions
        if (moderator.role === 'admin') {
          return true;
        }

        // ✅ Check if moderator has the specific permission
        if (moderator.role === 'moderator' && moderator.moderatorInfo) {
          return moderator.moderatorInfo.permissions.includes(permission);
        }

        return false;
      },

      checkPermission: (moderatorId, permission) => {
        if (!get().hasPermission(moderatorId, permission)) {
          throw new Error(`İcazə yoxdur: ${permission}`);
        }
      },

      createReport: (reportData) => {
        // ===== VALIDATION START =====

        // ✅ 1. Validate required fields
        if (!reportData || typeof reportData !== 'object') {
          throw new Error('Şikayət məlumatları düzgün deyil');
        }

        if (!reportData.reporterId || typeof reportData.reporterId !== 'string') {
          throw new Error('Şikayət edən istifadəçi ID-si tələb olunur');
        }

        // ✅ 2. Validate at least one target (user/listing/store)
        const hasTarget = !!(
          reportData.reportedUserId ||
          reportData.reportedListingId ||
          reportData.reportedStoreId
        );

        if (!hasTarget) {
          throw new Error('Ən azı bir hədəf (istifadəçi, elan və ya mağaza) tələb olunur');
        }

        // ✅ 3. Validate target IDs if provided
        if (reportData.reportedUserId && typeof reportData.reportedUserId !== 'string') {
          throw new Error('İstifadəçi ID-si düzgün deyil');
        }

        if (reportData.reportedListingId && typeof reportData.reportedListingId !== 'string') {
          throw new Error('Elan ID-si düzgün deyil');
        }

        if (reportData.reportedStoreId && typeof reportData.reportedStoreId !== 'string') {
          throw new Error('Mağaza ID-si düzgün deyil');
        }

        // ✅ 4. Validate type
        if (!reportData.type || typeof reportData.type !== 'string') {
          throw new Error('Şikayət növü tələb olunur');
        }

        // ✅ 5. Validate type enum
        const validTypes: ReportType[] = ['spam', 'inappropriate_content', 'fake_listing', 'harassment', 'fraud', 'copyright', 'other'];
        if (!validTypes.includes(reportData.type as ReportType)) {
          throw new Error('Şikayət növü yanlışdır');
        }

        // ✅ 6. Validate reason
        if (!reportData.reason || typeof reportData.reason !== 'string') {
          throw new Error('Səbəb tələb olunur');
        }

        const trimmedReason = reportData.reason.trim();
        if (trimmedReason.length < 10) {
          throw new Error('Səbəb ən azı 10 simvol olmalıdır');
        }
        if (trimmedReason.length > 1000) {
          throw new Error('Səbəb maksimum 1000 simvol ola bilər');
        }

        // ✅ 7. Validate description if provided
        if (reportData.description) {
          if (typeof reportData.description !== 'string') {
            throw new Error('Təsvir mətn olmalıdır');
          }

          const trimmedDesc = reportData.description.trim();
          if (trimmedDesc.length > 2000) {
            throw new Error('Təsvir maksimum 2000 simvol ola bilər');
          }
        }

        // ✅ 8. Validate priority
        if (reportData.priority) {
          const validPriorities: ReportPriority[] = ['low', 'medium', 'high', 'urgent'];
          if (!validPriorities.includes(reportData.priority as ReportPriority)) {
            throw new Error('Öncəlik səviyyəsi yanlışdır');
          }
        }

        // ===== VALIDATION END =====

        const newReport: Report = {
          ...reportData,
          id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`, // ✅ Use substring()
          status: 'pending',
          priority: reportData.priority || 'medium',
          reason: trimmedReason,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          reports: [...state.reports, newReport],
        }));

        get().updateStats();
      },

      updateReportStatus: (reportId, status, moderatorId, notes) => {
        // ===== VALIDATION START =====

        // ✅ 1. Validate reportId
        if (!reportId || typeof reportId !== 'string') {
          throw new Error('Şikayət ID-si tələb olunur');
        }

        // ✅ 2. Check if report exists
        const report = get().reports.find(r => r.id === reportId);
        if (!report) {
          throw new Error('Şikayət tapılmadı');
        }

        // ✅ 3. Validate status
        const validStatuses: ReportStatus[] = ['pending', 'in_review', 'resolved', 'dismissed'];
        if (!validStatuses.includes(status)) {
          throw new Error('Status yanlışdır');
        }

        // ✅ 4. Validate moderatorId if provided
        if (moderatorId) {
          if (typeof moderatorId !== 'string') {
            throw new Error('Moderator ID-si düzgün deyil');
          }

          // Check if moderator exists
          const moderator = get().moderators.find(m => m.id === moderatorId);
          if (!moderator) {
            throw new Error('Moderator tapılmadı');
          }

          // ✅ Check permission
          get().checkPermission(moderatorId, 'manage_reports');
        }

        // ✅ 5. Validate notes if provided
        if (notes) {
          if (typeof notes !== 'string') {
            throw new Error('Qeydlər mətn olmalıdır');
          }

          const trimmedNotes = notes.trim();
          if (trimmedNotes.length > 1000) {
            throw new Error('Qeydlər maksimum 1000 simvol ola bilər');
          }
        }

        // ===== VALIDATION END =====

        set((state) => ({
          reports: state.reports.map((report) =>
            report.id === reportId
              ? {
                ...report,
                status,
                assignedModeratorId: moderatorId || report.assignedModeratorId,
                moderatorNotes: notes?.trim() || report.moderatorNotes,
                updatedAt: new Date().toISOString(),
              }
              : report,
          ),
        }));

        get().updateStats();
      },

      assignReportToModerator: (reportId, moderatorId) => {
        // ===== VALIDATION START =====

        // ✅ 1. Validate reportId
        if (!reportId || typeof reportId !== 'string') {
          throw new Error('Şikayət ID-si tələb olunur');
        }

        // ✅ 2. Check if report exists
        const report = get().reports.find(r => r.id === reportId);
        if (!report) {
          throw new Error('Şikayət tapılmadı');
        }

        // ✅ 3. Validate moderatorId
        if (!moderatorId || typeof moderatorId !== 'string') {
          throw new Error('Moderator ID-si tələb olunur');
        }

        // ✅ 4. Check if moderator exists
        const moderator = get().moderators.find(m => m.id === moderatorId);
        if (!moderator) {
          throw new Error('Moderator tapılmadı');
        }

        // ===== VALIDATION END =====

        set((state) => ({
          reports: state.reports.map((report) =>
            report.id === reportId
              ? {
                ...report,
                assignedModeratorId: moderatorId,
                status: 'in_review',
                updatedAt: new Date().toISOString(),
              }
              : report,
          ),
        }));
      },

      resolveReport: (reportId, resolution, moderatorId) => {
        // ===== VALIDATION START =====

        // ✅ 1. Validate reportId
        if (!reportId || typeof reportId !== 'string') {
          throw new Error('Şikayət ID-si tələb olunur');
        }

        // ✅ 2. Check if report exists
        const report = get().reports.find(r => r.id === reportId);
        if (!report) {
          throw new Error('Şikayət tapılmadı');
        }

        // ✅ 3. Validate resolution
        if (!resolution || typeof resolution !== 'string') {
          throw new Error('Həll yolu tələb olunur');
        }

        const trimmedResolution = resolution.trim();
        if (trimmedResolution.length < 10) {
          throw new Error('Həll yolu ən azı 10 simvol olmalıdır');
        }
        if (trimmedResolution.length > 1000) {
          throw new Error('Həll yolu maksimum 1000 simvol ola bilər');
        }

        // ✅ 4. Validate moderatorId
        if (!moderatorId || typeof moderatorId !== 'string') {
          throw new Error('Moderator ID-si tələb olunur');
        }

        // ✅ 5. Check if moderator exists
        const moderator = get().moderators.find(m => m.id === moderatorId);
        if (!moderator) {
          throw new Error('Moderator tapılmadı');
        }

        // ✅ 6. Check permission
        get().checkPermission(moderatorId, 'manage_reports');

        // ===== VALIDATION END =====

        set((state) => ({
          reports: state.reports.map((report) =>
            report.id === reportId
              ? {
                ...report,
                status: 'resolved',
                resolution: trimmedResolution,
                assignedModeratorId: moderatorId,
                updatedAt: new Date().toISOString(),
              }
              : report,
          ),
        }));

        get().updateStats();
      },

      dismissReport: (reportId, reason, moderatorId) => {
        // ===== VALIDATION START =====

        // ✅ 1. Validate reportId
        if (!reportId || typeof reportId !== 'string') {
          throw new Error('Şikayət ID-si tələb olunur');
        }

        // ✅ 2. Check if report exists
        const report = get().reports.find(r => r.id === reportId);
        if (!report) {
          throw new Error('Şikayət tapılmadı');
        }

        // ✅ 3. Validate reason
        if (!reason || typeof reason !== 'string') {
          throw new Error('Rədd səbəbi tələb olunur');
        }

        const trimmedReason = reason.trim();
        if (trimmedReason.length < 10) {
          throw new Error('Rədd səbəbi ən azı 10 simvol olmalıdır');
        }
        if (trimmedReason.length > 1000) {
          throw new Error('Rədd səbəbi maksimum 1000 simvol ola bilər');
        }

        // ✅ 4. Validate moderatorId
        if (!moderatorId || typeof moderatorId !== 'string') {
          throw new Error('Moderator ID-si tələb olunur');
        }

        // ✅ 5. Check if moderator exists
        const moderator = get().moderators.find(m => m.id === moderatorId);
        if (!moderator) {
          throw new Error('Moderator tapılmadı');
        }

        // ✅ 6. Check permission
        get().checkPermission(moderatorId, 'manage_reports');

        // ===== VALIDATION END =====

        set((state) => ({
          reports: state.reports.map((report) =>
            report.id === reportId
              ? {
                ...report,
                status: 'dismissed',
                resolution: trimmedReason,
                assignedModeratorId: moderatorId,
                updatedAt: new Date().toISOString(),
              }
              : report,
          ),
        }));

        get().updateStats();
      },

      createModerationAction: (actionData) => {
        const newAction: ModerationAction = {
          ...actionData,
          id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`, // ✅ Use substring()
          createdAt: new Date().toISOString(),
          isActive: true,
        };

        set((state) => ({
          moderationActions: [...state.moderationActions, newAction],
        }));
      },

      deactivateModerationAction: (actionId) => {
        set((state) => ({
          moderationActions: state.moderationActions.map((action) =>
            action.id === actionId ? { ...action, isActive: false } : action,
          ),
        }));
      },

      createSupportTicket: (ticketData) => {
        // ===== VALIDATION START =====

        // ✅ 1. Validate required fields
        if (!ticketData || typeof ticketData !== 'object') {
          throw new Error('Bilet məlumatları düzgün deyil');
        }

        if (!ticketData.userId || typeof ticketData.userId !== 'string') {
          throw new Error('İstifadəçi ID-si tələb olunur');
        }

        if (!ticketData.subject || typeof ticketData.subject !== 'string') {
          throw new Error('Mövzu tələb olunur');
        }

        const trimmedSubject = ticketData.subject.trim();
        if (trimmedSubject.length < 5) {
          throw new Error('Mövzu ən azı 5 simvol olmalıdır');
        }
        if (trimmedSubject.length > 200) {
          throw new Error('Mövzu maksimum 200 simvol ola bilər');
        }

        // ✅ 2. Validate message
        if (!ticketData.message || typeof ticketData.message !== 'string') {
          throw new Error('Mesaj tələb olunur');
        }

        const trimmedMessage = ticketData.message.trim();
        if (trimmedMessage.length < 10) {
          throw new Error('Mesaj ən azı 10 simvol olmalıdır');
        }
        if (trimmedMessage.length > 2000) {
          throw new Error('Mesaj maksimum 2000 simvol ola bilər');
        }

        // ✅ 3. Validate category
        if (!ticketData.category || typeof ticketData.category !== 'string') {
          throw new Error('Kateqoriya tələb olunur');
        }

        const validCategories: SupportCategory[] = ['technical', 'billing', 'account', 'listing', 'store', 'report', 'other'];
        if (!validCategories.includes(ticketData.category as SupportCategory)) {
          throw new Error('Kateqoriya yanlışdır');
        }

        // ===== VALIDATION END =====

        const newTicket: SupportTicket = {
          ...ticketData,
          id: `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`, // ✅ Use substring()
          subject: trimmedSubject,
          message: trimmedMessage,
          status: 'open',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          responses: [],
        };

        set((state) => ({
          supportTickets: [...state.supportTickets, newTicket],
        }));
      },

      updateTicketStatus: (ticketId, status) => {
        // ===== VALIDATION START =====

        // ✅ 1. Validate ticketId
        if (!ticketId || typeof ticketId !== 'string') {
          throw new Error('Bilet ID-si tələb olunur');
        }

        // ✅ 2. Check if ticket exists
        const ticket = get().supportTickets.find(t => t.id === ticketId);
        if (!ticket) {
          throw new Error('Bilet tapılmadı');
        }

        // ✅ 3. Validate status
        const validStatuses: TicketStatus[] = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
          throw new Error('Status yanlışdır');
        }

        // ===== VALIDATION END =====

        set((state) => ({
          supportTickets: state.supportTickets.map((ticket) =>
            ticket.id === ticketId
              ? {
                ...ticket,
                status,
                updatedAt: new Date().toISOString(),
              }
              : ticket,
          ),
        }));
      },

      assignTicketToModerator: (ticketId, moderatorId) => {
        // ===== VALIDATION START =====

        // ✅ 1. Validate ticketId
        if (!ticketId || typeof ticketId !== 'string') {
          throw new Error('Bilet ID-si tələb olunur');
        }

        // ✅ 2. Check if ticket exists
        const ticket = get().supportTickets.find(t => t.id === ticketId);
        if (!ticket) {
          throw new Error('Bilet tapılmadı');
        }

        // ✅ 3. Validate moderatorId
        if (!moderatorId || typeof moderatorId !== 'string') {
          throw new Error('Moderator ID-si tələb olunur');
        }

        // ✅ 4. Check if moderator exists
        const moderator = get().moderators.find(m => m.id === moderatorId);
        if (!moderator) {
          throw new Error('Moderator tapılmadı');
        }

        // ✅ 5. Check permission
        get().checkPermission(moderatorId, 'manage_tickets');

        // ===== VALIDATION END =====

        set((state) => ({
          supportTickets: state.supportTickets.map((ticket) =>
            ticket.id === ticketId
              ? {
                ...ticket,
                assignedModeratorId: moderatorId,
                status: 'in_progress',
                updatedAt: new Date().toISOString(),
              }
              : ticket,
          ),
        }));
      },

      addTicketResponse: (ticketId, responseData) => {
        // ===== VALIDATION START =====

        // ✅ 1. Validate ticketId
        if (!ticketId || typeof ticketId !== 'string') {
          throw new Error('Bilet ID-si tələb olunur');
        }

        // ✅ 2. Check if ticket exists
        const ticket = get().supportTickets.find(t => t.id === ticketId);
        if (!ticket) {
          throw new Error('Bilet tapılmadı');
        }

        // ✅ 3. Validate response data
        if (!responseData || typeof responseData !== 'object') {
          throw new Error('Cavab məlumatları düzgün deyil');
        }

        if (!responseData.message || typeof responseData.message !== 'string') {
          throw new Error('Cavab mesajı tələb olunur');
        }

        const trimmedMessage = responseData.message.trim();
        if (trimmedMessage.length < 5) {
          throw new Error('Cavab ən azı 5 simvol olmalıdır');
        }
        if (trimmedMessage.length > 2000) {
          throw new Error('Cavab maksimum 2000 simvol ola bilər');
        }

        if (!responseData.responderId || typeof responseData.responderId !== 'string') {
          throw new Error('Cavab verən ID-si tələb olunur');
        }

        // ✅ 4. Check permission if responder is a moderator
        if (responseData.responderRole === 'moderator' || responseData.responderRole === 'admin') {
          get().checkPermission(responseData.responderId, 'manage_tickets');
        }

        // ===== VALIDATION END =====

        const newResponse: SupportResponse = {
          ...responseData,
          id: `response_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`, // ✅ Use substring()
          message: trimmedMessage,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          supportTickets: state.supportTickets.map((ticket) =>
            ticket.id === ticketId
              ? {
                ...ticket,
                responses: [...ticket.responses, newResponse],
                updatedAt: new Date().toISOString(),
              }
              : ticket,
          ),
        }));
      },

      addModerator: (user, permissions) => {
        // ===== VALIDATION START =====

        // ✅ 1. Validate user object
        if (!user || typeof user !== 'object') {
          throw new Error('İstifadəçi məlumatları düzgün deyil');
        }

        if (!user.id || typeof user.id !== 'string') {
          throw new Error('İstifadəçi ID-si tələb olunur');
        }

        // ✅ 2. Check if user is already a moderator
        const existingModerator = get().moderators.find(m => m.id === user.id);
        if (existingModerator) {
          throw new Error('İstifadəçi artıq moderatordur');
        }

        // ✅ 3. Validate permissions array
        if (!permissions || !Array.isArray(permissions)) {
          throw new Error('İcazələr düzgün deyil');
        }

        const validPermissions: ModeratorPermission[] = [
          'manage_reports',
          'manage_users',
          'manage_listings',
          'manage_stores',
          'manage_tickets',
          'view_analytics',
          'manage_moderators',
        ];

        const invalidPerms = permissions.filter(p => !validPermissions.includes(p as ModeratorPermission));
        if (invalidPerms.length > 0) {
          throw new Error(`Yanlış icazələr: ${invalidPerms.join(', ')}`);
        }

        // ✅ 4. Require at least one permission
        if (permissions.length === 0) {
          throw new Error('Ən azı 1 icazə tələb olunur');
        }

        // ===== VALIDATION END =====

        const moderatorUser: User = {
          ...user,
          role: 'moderator',
          moderatorInfo: {
            assignedDate: new Date().toISOString(),
            permissions,
            handledReports: 0,
            averageResponseTime: 0,
            isActive: true,
          },
        };

        set((state) => ({
          moderators: [...state.moderators, moderatorUser],
        }));
      },

      removeModerator: (userId) => {
        // ===== VALIDATION START =====

        // ✅ 1. Validate userId
        if (!userId || typeof userId !== 'string') {
          throw new Error('İstifadəçi ID-si tələb olunur');
        }

        // ✅ 2. Check if moderator exists
        const moderator = get().moderators.find(m => m.id === userId);
        if (!moderator) {
          throw new Error('Moderator tapılmadı');
        }

        // ✅ 3. Check if this is the last moderator
        if (get().moderators.length === 1) {
          throw new Error('Son moderatoru silmək olmaz');
        }

        // ===== VALIDATION END =====

        set((state) => ({
          moderators: state.moderators.filter((mod) => mod.id !== userId),
        }));
      },

      updateModeratorPermissions: (userId, permissions) => {
        // ===== VALIDATION START =====

        // ✅ 1. Validate userId
        if (!userId || typeof userId !== 'string') {
          throw new Error('İstifadəçi ID-si tələb olunur');
        }

        // ✅ 2. Check if moderator exists
        const moderator = get().moderators.find(m => m.id === userId);
        if (!moderator || !moderator.moderatorInfo) {
          throw new Error('Moderator tapılmadı');
        }

        // ✅ 3. Validate permissions array
        if (!permissions || !Array.isArray(permissions)) {
          throw new Error('İcazələr düzgün deyil');
        }

        const validPermissions: ModeratorPermission[] = [
          'manage_reports',
          'manage_users',
          'manage_listings',
          'manage_stores',
          'manage_tickets',
          'view_analytics',
          'manage_moderators',
        ];

        const invalidPerms = permissions.filter(p => !validPermissions.includes(p as ModeratorPermission));
        if (invalidPerms.length > 0) {
          throw new Error(`Yanlış icazələr: ${invalidPerms.join(', ')}`);
        }

        // ✅ 4. Require at least one permission
        if (permissions.length === 0) {
          throw new Error('Ən azı 1 icazə tələb olunur');
        }

        // ===== VALIDATION END =====

        set((state) => ({
          moderators: state.moderators.map((mod) =>
            mod.id === userId && mod.moderatorInfo
              ? {
                ...mod,
                moderatorInfo: {
                  ...mod.moderatorInfo,
                  permissions,
                },
              }
              : mod,
          ),
        }));
      },

      getReportsByStatus: (status) => {
        return get().reports.filter((report) => report.status === status);
      },

      getReportsByModerator: (moderatorId) => {
        return get().reports.filter((report) => report.assignedModeratorId === moderatorId);
      },

      getTicketsByStatus: (status) => {
        return get().supportTickets.filter((ticket) => ticket.status === status);
      },

      getTicketsByModerator: (moderatorId) => {
        return get().supportTickets.filter((ticket) => ticket.assignedModeratorId === moderatorId);
      },

      getUserModerationHistory: (userId) => {
        return get().moderationActions.filter((action) => action.targetUserId === userId);
      },

      updateStats: () => {
        const { reports, moderators } = get();

        // ✅ Validate reports array
        if (!reports || !Array.isArray(reports)) {
          set({ stats: {
            totalReports: 0,
            pendingReports: 0,
            resolvedReports: 0,
            dismissedReports: 0,
            averageResolutionTime: 0,
            reportsByType: {
              spam: 0,
              inappropriate_content: 0,
              fake_listing: 0,
              harassment: 0,
              fraud: 0,
              copyright: 0,
              other: 0,
            },
            reportsByPriority: {
              low: 0,
              medium: 0,
              high: 0,
              urgent: 0,
            },
            moderatorStats: {},
          }});
          return;
        }

        // ✅ Calculate average resolution time
        const resolvedReports = reports.filter((r) => r.status === 'resolved');
        let averageResolutionTime = 0;

        if (resolvedReports.length > 0) {
          const totalResolutionTime = resolvedReports.reduce((sum, report) => {
            const created = new Date(report.createdAt).getTime();
            const updated = new Date(report.updatedAt).getTime();

            // ✅ Validate dates
            if (isNaN(created) || isNaN(updated)) {
              return sum;
            }

            const resolutionTime = updated - created;

            // ✅ Validate resolution time is positive
            if (resolutionTime < 0 || !isFinite(resolutionTime)) {
              return sum;
            }

            return sum + resolutionTime;
          }, 0);

          // ✅ Prevent division by zero
          averageResolutionTime = totalResolutionTime / Math.max(resolvedReports.length, 1);

          // ✅ Convert to hours and round
          averageResolutionTime = Math.round((averageResolutionTime / (1000 * 60 * 60)) * 10) / 10;
        }

        // ✅ Calculate moderator stats
        const moderatorStats: Record<string, { handledReports: number; averageResponseTime: number; resolutionRate: number }> = {};

        for (const moderator of moderators || []) {
          if (!moderator?.id) continue;

          // Get all reports assigned to this moderator
          const assignedReports = reports.filter(r => r.assignedModeratorId === moderator.id);
          const handledReports = assignedReports.filter(r => r.status === 'resolved');

          // ✅ Calculate resolution rate
          const totalAssigned = assignedReports.length;
          const totalResolved = handledReports.length;
          const resolutionRate = totalAssigned > 0
            ? Math.round((totalResolved / totalAssigned) * 100 * 10) / 10 // Round to 1 decimal
            : 0;

          // ✅ Calculate average response time for this moderator
          let avgResponseTime = 0;
          if (handledReports.length > 0) {
            const totalResponseTime = handledReports.reduce((sum, report) => {
              const created = new Date(report.createdAt).getTime();
              const updated = new Date(report.updatedAt).getTime();

              // ✅ Validate dates
              if (isNaN(created) || isNaN(updated)) {
                return sum;
              }

              const responseTime = updated - created;

              // ✅ Validate response time is positive
              if (responseTime < 0 || !isFinite(responseTime)) {
                return sum;
              }

              return sum + responseTime;
            }, 0);

            // ✅ Prevent division by zero
            avgResponseTime = totalResponseTime / Math.max(handledReports.length, 1);

            // ✅ Convert to hours and round
            avgResponseTime = Math.round((avgResponseTime / (1000 * 60 * 60)) * 10) / 10;
          }

          moderatorStats[moderator.id] = {
            handledReports: totalResolved,
            averageResponseTime: avgResponseTime,
            resolutionRate: resolutionRate,
          };
        }

        const stats: ModerationStats = {
          totalReports: reports.length,
          pendingReports: reports.filter((r) => r.status === 'pending').length,
          resolvedReports: resolvedReports.length,
          dismissedReports: reports.filter((r) => r.status === 'dismissed').length,
          averageResolutionTime,
          reportsByType: {
            spam: reports.filter((r) => r.type === 'spam').length,
            inappropriate_content: reports.filter((r) => r.type === 'inappropriate_content').length,
            fake_listing: reports.filter((r) => r.type === 'fake_listing').length,
            harassment: reports.filter((r) => r.type === 'harassment').length,
            fraud: reports.filter((r) => r.type === 'fraud').length,
            copyright: reports.filter((r) => r.type === 'copyright').length,
            other: reports.filter((r) => r.type === 'other').length,
          },
          reportsByPriority: {
            low: reports.filter((r) => r.priority === 'low').length,
            medium: reports.filter((r) => r.priority === 'medium').length,
            high: reports.filter((r) => r.priority === 'high').length,
            urgent: reports.filter((r) => r.priority === 'urgent').length,
          },
          moderatorStats,
        };

        set({ stats });
      },
    }),
    {
      name: 'moderation-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

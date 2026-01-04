/**
 * Tests for admin panel "quick operations" backend rules.
 * These cover the same constraints the UI relies on:
 * - Moderation report status updates require resolution for resolved/dismissed
 * - Support ticket status updates require resolution for resolved/closed
 * - Admin user operations prevent self-delete and self-demotion
 * - Support responses enforce ownership for normal users
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// IMPORTANT:
// Prisma client isn't generated in CI/unit-test env for this repo.
// Mock the prisma module so importing the router (which imports many routes) doesn't crash.
const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  supportTicket: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  supportResponse: {
    create: jest.fn(),
  },
  socialAccount: { deleteMany: jest.fn() },
  verificationToken: { deleteMany: jest.fn() },
  passwordResetToken: { deleteMany: jest.fn() },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
} as any;

jest.mock('@/backend/db/client', () => ({ prisma: mockPrisma }));

// Load after mocks are in place. Use a minimal router (do NOT import full appRouter),
// because appRouter pulls in modules that use Node ESM dynamic imports (not enabled in Jest env).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createTRPCRouter } = require('@/backend/trpc/create-context');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { updateReportStatusProcedure } = require('@/backend/trpc/routes/moderation/updateReportStatus/route');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { updateTicketStatusProcedure } = require('@/backend/trpc/routes/support/updateTicketStatus/route');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { addTicketResponseProcedure } = require('@/backend/trpc/routes/support/addTicketResponse/route');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { updateUserProcedure } = require('@/backend/trpc/routes/admin/updateUser/route');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { deleteUserProcedure } = require('@/backend/trpc/routes/admin/deleteUser/route');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { moderationDb } = require('@/backend/db/moderation');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require('@/backend/db/client');

const testRouter = createTRPCRouter({
  moderation: createTRPCRouter({
    updateReportStatus: updateReportStatusProcedure,
  }),
  support: createTRPCRouter({
    updateTicketStatus: updateTicketStatusProcedure,
    addTicketResponse: addTicketResponseProcedure,
  }),
  admin: createTRPCRouter({
    updateUser: updateUserProcedure,
    deleteUser: deleteUserProcedure,
  }),
});

type CtxUser = { userId: string; id?: string; email?: string; role: string };

const makeCaller = (user: CtxUser) =>
  testRouter.createCaller({
    // req/ip are unused by most procedures, but exist in Context
    req: new Request('http://localhost/test'),
    ip: '127.0.0.1',
    user: { ...user, id: user.id ?? user.userId },
  } as any);

describe('Admin panel quick operations', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    // best-effort cleanup for in-memory moderation DB entries we create in tests
    // (moderationDb is module-global and persists within the Jest process)
  });

  describe('Moderation: update report status', () => {
    test('requires resolution when resolving a report', async () => {
      const reportId = 'r_test_resolve_1';
      moderationDb.reports.create({
        id: reportId,
        type: 'spam',
        reason: 'Test reason',
        description: 'Test description',
        reporterId: 'u_reporter',
        reportedUserId: 'u_target',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      const caller = makeCaller({ userId: 'm1', role: 'MODERATOR' });

      await expect(
        caller.moderation.updateReportStatus({
          reportId,
          status: 'resolved',
          // no resolution
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining('Resolution'),
      });

      // cleanup
      moderationDb.reports.delete(reportId);
    });

    test('sets status/resolution and assigns moderator on resolve', async () => {
      const reportId = 'r_test_resolve_2';
      moderationDb.reports.create({
        id: reportId,
        type: 'fraud',
        reason: 'Test reason',
        description: 'Test description',
        reporterId: 'u_reporter',
        reportedListingId: 'l_1',
        status: 'pending',
        priority: 'high',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      const caller = makeCaller({ userId: 'm2', role: 'moderator' });

      const updated = await caller.moderation.updateReportStatus({
        reportId,
        status: 'resolved',
        resolution: 'Issue confirmed and handled',
        moderatorNotes: 'Internal note',
      });

      expect(updated.status).toBe('resolved');
      expect(updated.resolution).toBe('Issue confirmed and handled');
      expect(updated.assignedModeratorId).toBe('m2');

      // cleanup
      moderationDb.reports.delete(reportId);
    });
  });

  describe('Support: update ticket status', () => {
    test('requires resolution when resolving a ticket (backend enforcement)', async () => {
      const caller = makeCaller({ userId: 'mod_tickets', role: 'MODERATOR' });

      const findUnique = jest
        .spyOn(prisma.supportTicket, 'findUnique')
        .mockResolvedValue({ id: 't1', userId: 'u1', status: 'open', moderatorNotes: null, resolution: null } as any);
      const update = jest.spyOn(prisma.supportTicket, 'update').mockResolvedValue({ id: 't1' } as any);

      await expect(
        caller.support.updateTicketStatus({
          ticketId: 't1',
          status: 'resolved',
          // no resolution -> should fail
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining('Resolution is required'),
      });

      expect(findUnique).toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('Admin: user operations safety', () => {
    test('prevents admin from changing their own role (self-demotion)', async () => {
      const caller = makeCaller({ userId: 'admin1', role: 'ADMIN' });

      // Should fail before hitting prisma, but spy anyway to ensure no DB hit
      const updateSpy = jest.spyOn(prisma.user, 'update').mockResolvedValue({ id: 'admin1' } as any);

      await expect(
        caller.admin.updateUser({
          userId: 'admin1',
          role: 'USER',
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining('cannot change your own role'),
      });

      expect(updateSpy).not.toHaveBeenCalled();
    });

    test('prevents admin from deleting themselves', async () => {
      const caller = makeCaller({ userId: 'admin2', role: 'ADMIN' });

      const findUniqueSpy = jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'admin2', role: 'ADMIN' } as any);
      const txSpy = jest.spyOn(prisma, '$transaction' as any).mockResolvedValue([] as any);

      await expect(
        caller.admin.deleteUser({
          userId: 'admin2',
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining('cannot delete your own account'),
      });

      // should fail before touching DB
      expect(findUniqueSpy).not.toHaveBeenCalled();
      expect(txSpy).not.toHaveBeenCalled();
    });
  });

  describe('Support: add ticket response permissions', () => {
    test('blocks normal user from replying to someone else’s ticket', async () => {
      const caller = makeCaller({ userId: 'u_other', role: 'user' });

      jest.spyOn(prisma.supportTicket, 'findUnique').mockResolvedValue({ id: 't2', userId: 'u_owner', status: 'open' } as any);
      const createSpy = jest.spyOn(prisma.supportResponse, 'create').mockResolvedValue({ id: 'r1' } as any);

      await expect(
        caller.support.addTicketResponse({
          ticketId: 't2',
          message: 'Hello',
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining('cannot respond'),
      });

      expect(createSpy).not.toHaveBeenCalled();
    });

    test('moderator reply moves open ticket to in_progress', async () => {
      const caller = makeCaller({ userId: 'mod3', role: 'MODERATOR' });

      jest.spyOn(prisma.supportTicket, 'findUnique').mockResolvedValue({ id: 't3', userId: 'u_owner', status: 'open' } as any);
      jest.spyOn(prisma.supportResponse, 'create').mockResolvedValue({ id: 'resp1', ticketId: 't3' } as any);
      const ticketUpdateSpy = jest.spyOn(prisma.supportTicket, 'update').mockResolvedValue({ id: 't3' } as any);

      const resp = await caller.support.addTicketResponse({
        ticketId: 't3',
        message: 'We are looking into it.',
      });

      expect(resp).toHaveProperty('id');
      expect(ticketUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't3' },
          data: expect.objectContaining({
            status: 'in_progress',
            assignedModeratorId: 'mod3',
          }),
        }),
      );
    });
  });
});


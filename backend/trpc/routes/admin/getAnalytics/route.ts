import { adminProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { logger } from '../../../../utils/logger';

export const getAnalyticsProcedure = adminProcedure.query(async () => {
  try {
    const [
      totalUsers,
      verifiedUsers,
      totalModerators,
      totalAdmins,
      usersLast24h,
      usersLast7d,
      usersLast30d,
      totalBalance,
      usersByRole,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { verified: true } }),
      prisma.user.count({ where: { role: 'MODERATOR' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.user.aggregate({
        _sum: { balance: true },
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
    ]);
    
    // Get users with social accounts
    const usersWithSocial = await prisma.user.count({
      where: {
        socialAccounts: {
          some: {},
        },
      },
    });
    
    return {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        unverified: totalUsers - verifiedUsers,
        withSocial: usersWithSocial,
        last24h: usersLast24h,
        last7d: usersLast7d,
        last30d: usersLast30d,
      },
      roles: {
        moderators: totalModerators,
        admins: totalAdmins,
        regular: totalUsers - totalModerators - totalAdmins,
        byRole: usersByRole.map((r) => ({
          role: r.role,
          count: r._count,
        })),
      },
      balance: {
        total: totalBalance._sum.balance || 0,
      },
    };
  } catch (error) {
    logger.error('[Admin] Get analytics error:', error);
    throw error;
  }
});


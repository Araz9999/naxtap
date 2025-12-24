import { z } from 'zod';
import { adminProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { logger } from '../../../../utils/logger';

export const deleteUserProcedure = adminProcedure
  .input(z.object({ userId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      // Prevent admin from deleting themselves
      if (ctx.user.id === input.userId) {
        throw new Error('You cannot delete your own account');
      }
      
      const user = await prisma.user.findUnique({ where: { id: input.userId } });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Prevent deleting the last admin
      if (user.role === 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
        if (adminCount <= 1) {
          throw new Error('Cannot delete the last admin');
        }
      }
      
      // Delete related data
      await prisma.$transaction([
        prisma.socialAccount.deleteMany({ where: { userId: input.userId } }),
        prisma.verificationToken.deleteMany({ where: { userId: input.userId } }),
        prisma.passwordResetToken.deleteMany({ where: { userId: input.userId } }),
        prisma.user.delete({ where: { id: input.userId } }),
      ]);
      
      logger.info('[Admin] User deleted:', { userId: input.userId, deletedBy: ctx.user.id });
      
      return { success: true };
    } catch (error) {
      logger.error('[Admin] Delete user error:', error);
      throw error;
    }
  });


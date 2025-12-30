import { z } from 'zod';
import { adminProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { logger } from '../../../../utils/logger';

export const updateUserProcedure = adminProcedure
  .input(
    z.object({
      userId: z.string(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional().nullable(),
      role: z.enum(['USER', 'MODERATOR', 'ADMIN']).optional(),
      verified: z.boolean().optional(),
      balance: z.number().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const { userId, ...updates } = input;
      
      const actorId = (ctx.user as any).userId ?? (ctx.user as any).id;
      const actorRole = ((ctx.user as any).role || '').toString().toUpperCase();

      // Prevent admin from changing their own role
      if (updates.role && actorId === userId && updates.role !== actorRole) {
        throw new Error('You cannot change your own role');
      }
      
      // Prevent removing the last admin
      if (updates.role && updates.role !== 'ADMIN') {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.role === 'ADMIN') {
          const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
          if (adminCount <= 1) {
            throw new Error('Cannot remove the last admin');
          }
        }
      }
      
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.email) updateData.email = updates.email.toLowerCase();
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.role) updateData.role = updates.role;
      if (updates.verified !== undefined) updateData.verified = updates.verified;
      if (updates.balance !== undefined) updateData.balance = updates.balance;
      
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          phone: true,
          verified: true,
          role: true,
          balance: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      
      logger.info('[Admin] User updated:', { userId, updatedBy: actorId });
      
      return updatedUser;
    } catch (error) {
      logger.error('[Admin] Update user error:', error);
      throw error;
    }
  });


import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';

export default protectedProcedure
  .input(
    z.object({
      userId: z.string().min(1),
    }),
  )
  .query(async ({ input }) => {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, name: true, avatar: true, email: true, phone: true },
    });
    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }
    return user;
  });


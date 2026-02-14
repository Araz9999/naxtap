import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../../create-context';
import { userDB } from '../../../../db/users';
import { getSystemUser } from '../../../../services/welcomeMessage';

export default protectedProcedure
  .input(
    z.object({
      userId: z.string().min(1),
    }),
  )
  .query(async ({ input }) => {
    // Handle system user
    if (input.userId === 'system') {
      const systemUser = getSystemUser();
      return {
        id: systemUser.id,
        name: systemUser.name,
        avatar: systemUser.avatar,
        email: 'system@naxtap.az',
        phone: null,
      };
    }

    const user = await userDB.findById(input.userId);
    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }
    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
    };
  });


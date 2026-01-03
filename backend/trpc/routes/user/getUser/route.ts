import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { userDB } from '../../../../db/users';
import { TRPCError } from '@trpc/server';

export const getUserProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
    }),
  )
  .query(async ({ input }) => {
    const user = await userDB.findById(input.id);

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Don't expose sensitive information
    const { passwordHash, verificationToken, passwordResetToken, ...safeUser } = user;
    return safeUser;
  });

export const getAllUsersProcedure = publicProcedure
  .query(async () => {
    const users = await userDB.getAllUsers();

    // Don't expose sensitive information
    return users.map(user => {
      const { passwordHash, verificationToken, passwordResetToken, ...safeUser } = user;
      return safeUser;
    });
  });

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../../create-context';
import { chatDb } from '../../../../db/chat';
import { userDB } from '../../../../db/users';

export default protectedProcedure
  .input(
    z.object({
      userId: z.string().min(1),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const currentUserId = ctx.user.userId;
    if (currentUserId === input.userId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete your own messages via this operation' });
    }

    const other = await userDB.findById(input.userId);
    if (!other) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

    const totalDeleted = chatDb.messages.deleteAllFromUser(currentUserId, input.userId);
    return { totalDeleted };
  });


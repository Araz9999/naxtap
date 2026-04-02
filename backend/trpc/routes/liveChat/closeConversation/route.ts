import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';
import { realtimeServer } from '../../../../realtime/server';
import { TRPCError } from '@trpc/server';

export default protectedProcedure
  .input(z.object({
    conversationId: z.string(),
  }))
  .mutation(({ ctx, input }) => {
    const conversation = liveChatDb.conversations.getById(input.conversationId);
    if (!conversation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
    }
    const isOwner = conversation.userId === ctx.user.userId;
    const isAssignedAgent = !!conversation.supportAgentId && conversation.supportAgentId === ctx.user.userId;
    const isPrivileged = ctx.user.role === 'admin' || ctx.user.role === 'moderator';
    if (!isOwner && !isAssignedAgent && !isPrivileged) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed to close this conversation' });
    }

    if (conversation.supportAgentId) {
      liveChatDb.agents.decrementActiveChats(conversation.supportAgentId);
    }

    const updated = liveChatDb.conversations.update(input.conversationId, {
      status: 'closed',
    });

    if (updated) {
      realtimeServer.broadcastSupportClosed(input.conversationId);
    }
    return updated;
  });

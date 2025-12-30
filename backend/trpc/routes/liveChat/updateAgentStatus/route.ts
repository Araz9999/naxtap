import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';

export default publicProcedure
  .input(
    z.object({
      agentId: z.string(),
      status: z.enum(['online', 'offline', 'busy']),
    }),
  )
  .mutation(({ input }) => {
    return liveChatDb.agents.updateStatus(input.agentId, input.status);
  });


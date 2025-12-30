import { publicProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';

export default publicProcedure.query(() => {
  return liveChatDb.conversations.getAll();
});


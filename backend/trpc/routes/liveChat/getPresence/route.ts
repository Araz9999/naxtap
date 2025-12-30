import { publicProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';

export default publicProcedure.query(() => {
  const agents = liveChatDb.agents.getAll();

  const onlineAgents = agents.filter((a) => a.status !== 'offline');
  const availableAgents = agents.filter((a) => a.status === 'online');

  return {
    onlineCount: onlineAgents.length,
    availableCount: availableAgents.length,
    agents,
    updatedAt: new Date().toISOString(),
  };
});


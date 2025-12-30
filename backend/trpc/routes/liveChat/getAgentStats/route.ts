import { publicProcedure } from '../../../create-context';
import { liveChatDb } from '../../../../db/liveChat';

export default publicProcedure.query(() => {
  const agents = liveChatDb.agents.getAll();
  const onlineAgents = agents.filter(a => a.status === 'online');
  const maxChatsPerAgent = 3;
  const availableAgents = onlineAgents.filter(a => a.activeChats < maxChatsPerAgent);

  return {
    totalCount: agents.length,
    onlineCount: onlineAgents.length,
    // "Available" = online and not overloaded
    availableCount: availableAgents.length,
    agents: agents.map(a => ({
      id: a.id,
      name: a.name,
      avatar: a.avatar,
      status: a.status,
      activeChats: a.activeChats,
    })),
    asOf: new Date().toISOString(),
  };
});


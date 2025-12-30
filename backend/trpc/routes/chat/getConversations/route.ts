import { protectedProcedure } from '../../../create-context';
import { chatDb } from '../../../../db/chat';
import { prisma } from '../../../../db/client';

export default protectedProcedure.query(async ({ ctx }) => {
  const userId = ctx.user.userId;
  const conversations = chatDb.conversations.getForUser(userId);

  const otherUserIds = Array.from(
    new Set(
      conversations
        .map((c) => c.participants.find((p) => p !== userId))
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
    )
  );

  const otherUsers = otherUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: otherUserIds } },
        select: { id: true, name: true, avatar: true, email: true, phone: true },
      })
    : [];

  const userMap = new Map(otherUsers.map((u) => [u.id, u]));

  return conversations.map((c) => {
    const otherId = c.participants.find((p) => p !== userId) || '';
    const other = userMap.get(otherId);
    return {
      id: c.id,
      participants: c.participants,
      listingId: c.listingId,
      lastMessage: c.lastMessage || '',
      lastMessageDate: c.lastMessageDate || c.updatedAt,
      unreadCount: c.unreadByUserId[userId] || 0,
      otherUser: other
        ? {
            id: other.id,
            name: other.name,
            avatar: other.avatar,
            email: other.email,
            phone: other.phone,
          }
        : {
            id: otherId,
            name: 'Unknown',
            avatar: null,
            email: null,
            phone: null,
          },
    };
  });
});


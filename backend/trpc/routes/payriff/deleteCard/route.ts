import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { savedCardsDB } from '../../../../db/savedCards';

export const deleteCardProcedure = protectedProcedure
  .input(
    z.object({
      cardId: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.user.userId;
    const card = await savedCardsDB.findById(input.cardId);

    if (!card) {
      throw new Error('Card not found');
    }

    if (card.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const deleted = await savedCardsDB.deleteCard(input.cardId);

    return {
      success: deleted,
    };
  });

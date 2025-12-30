import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { savedCardsDB } from '../../../../db/savedCards';

export const saveCardProcedure = protectedProcedure
  .input(
    z.object({
      cardUuid: z.string(),
      pan: z.string().transform((v) => {
        // Persist only masked PAN
        if (v && v.length >= 12) {
          const last4 = v.slice(-4);
          return `**** **** **** ${last4}`;
        }
        return v;
      }),
      brand: z.string(),
      cardHolderName: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.user.userId;

    const existingCard = await savedCardsDB.cardExists(userId, input.cardUuid);
    if (existingCard) {
      throw new Error('Card already saved');
    }

    const savedCard = await savedCardsDB.saveCard({
      userId,
      cardUuid: input.cardUuid,
      pan: input.pan,
      brand: input.brand,
      cardHolderName: input.cardHolderName || '',
    });

    return {
      success: true,
      card: savedCard,
    };
  });

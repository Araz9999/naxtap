import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { findByVerificationToken, verifyEmail as verifyEmailDb } from '../../../../db/userPrisma';
import { emailService } from '../../../../services/email';

import { logger } from '../../../../utils/logger';
export const verifyEmailProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    logger.debug('[Auth] Email verification attempt');

    const user = await findByVerificationToken(input.token);
    if (!user) {
      throw new Error('Təsdiq linki etibarsızdır və ya vaxtı keçib');
    }

    if (user.verified) {
      return {
        success: true,
        message: 'Email artıq təsdiqlənib',
        alreadyVerified: true,
      };
    }

    await verifyEmailDb(user.id);

    await emailService.sendWelcomeEmail(user.email, user.name);

    logger.debug('[Auth] Email verified successfully:', user.id);

    return {
      success: true,
      message: 'Email uğurla təsdiqləndi',
      alreadyVerified: false,
    };
  });

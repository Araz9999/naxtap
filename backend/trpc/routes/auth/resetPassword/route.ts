import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { findByPasswordResetToken, updatePassword } from '../../../../db/userPrisma';
import { hashPassword } from '../../../../utils/password';

import { logger } from '../../../../utils/logger';
export const resetPasswordProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      // ✅ Match registration requirements (8+ chars, uppercase, lowercase, number)
      password: z.string()
        .min(8, 'Şifrə ən azı 8 simvol olmalıdır')
        .regex(/[A-Z]/, 'Şifrə ən azı 1 böyük hərf olmalıdır')
        .regex(/[a-z]/, 'Şifrə ən azı 1 kiçik hərf olmalıdır')
        .regex(/[0-9]/, 'Şifrə ən azı 1 rəqəm olmalıdır'),
    })
  )
  .mutation(async ({ input }) => {
    logger.debug('[Auth] Password reset attempt');

    const user = await findByPasswordResetToken(input.token);
    if (!user) {
      throw new Error('Şifrə sıfırlama linki etibarsızdır və ya vaxtı keçib');
    }

    const passwordHash = await hashPassword(input.password);
    await updatePassword(user.id, passwordHash);

    logger.debug('[Auth] Password reset successfully:', user.id);

    return {
      success: true,
      message: 'Şifrə uğurla dəyişdirildi',
    };
  });


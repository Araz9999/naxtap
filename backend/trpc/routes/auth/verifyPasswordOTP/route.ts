import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { findUserByEmail, setPasswordResetToken } from '../../../../db/userPrisma';
import { generateRandomToken } from '../../../../utils/password';
import { logger } from '../../../../utils/logger';

// OTP store (in production, use Redis or database)
const otpStore = new Map<string, { code: string; expiresAt: number; userId: string }>();

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const verifyPasswordOTPProcedure = publicProcedure
  .input(
    z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      otp: z.string().length(6, 'OTP kodu 6 rəqəm olmalıdır'),
    })
    .refine((data) => data.email || data.phone, {
      message: 'Email və ya telefon nömrəsi tələb olunur',
    })
  )
  .mutation(async ({ input }) => {
    try {
      const { email, phone, otp } = input;
      const contactInfo = email 
        ? email.toLowerCase().trim()
        : phone?.replace(/\s/g, '') || '';

      logger.debug('[Auth] Verifying password reset OTP:', contactInfo);

      // Check OTP
      const storedOTP = otpStore.get(contactInfo);
      
      if (!storedOTP) {
        throw new Error('OTP tapılmadı. Zəhmət olmasa yenidən göndərin');
      }

      if (storedOTP.code !== otp) {
        throw new Error('Yanlış OTP kodu');
      }

      if (Date.now() > storedOTP.expiresAt) {
        otpStore.delete(contactInfo);
        throw new Error('OTP müddəti bitib. Zəhmət olmasa yenidən göndərin');
      }

      // OTP verified, generate reset token
      const resetToken = generateRandomToken();
      await setPasswordResetToken(storedOTP.userId, resetToken, 1); // 1 hour expiry

      // Clean up OTP
      otpStore.delete(contactInfo);

      logger.info('[Auth] Password reset OTP verified:', storedOTP.userId);

      return {
        success: true,
        resetToken,
        message: 'OTP təsdiqləndi',
      };
    } catch (error) {
      logger.error('[Auth] Verify password OTP error:', error);
      throw error;
    }
  });

// Export OTP store for use in forgotPassword route
export { otpStore, generateOTP };


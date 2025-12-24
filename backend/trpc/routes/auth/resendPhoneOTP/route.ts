import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { logger } from '../../../../utils/logger';
import { validatePhone } from '../../../../utils/validation';
import { smsService } from '../../../../services/sms';

// OTP store
const otpStore = new Map<string, { code: string; expiresAt: number; phone: string }>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const resendPhoneOTPProcedure = publicProcedure
  .input(z.object({ phone: z.string().min(1) }))
  .mutation(async ({ input }) => {
    try {
      const phone = input.phone.trim().replace(/\s+/g, '');
      
      if (!validatePhone(phone)) {
        throw new Error('Yanlış telefon nömrəsi formatı');
      }
      
      // Generate new OTP
      const otp = generateOTP();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      
      // Store OTP
      otpStore.set(phone, { code: otp, expiresAt, phone });
      
      // Send SMS
      await smsService.sendOTP(phone, otp, 'verification');
      
      logger.info(`[Phone Registration] OTP resent to ${phone}`);
      
      return {
        success: true,
        message: 'OTP yenidən göndərildi',
      };
    } catch (error) {
      logger.error('[Phone Registration] Resend OTP error:', error);
      throw error;
    }
  });


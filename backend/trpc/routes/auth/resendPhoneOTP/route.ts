import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { logger } from '../../../../utils/logger';
import { validatePhone } from '../../../../utils/validation';
import { smsService } from '../../../../services/sms';
import { checkThrottle } from '../../../../utils/throttle';
import { generatePhoneOTP, phoneOtpStore } from '../phoneOtpStore';

const OTP_COOLDOWN_MS = 60 * 1000; // 60s between sends
const OTP_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const OTP_MAX_IN_WINDOW = 5; // max 5 sends/hour per phone

export const resendPhoneOTPProcedure = publicProcedure
  .input(z.object({ phone: z.string().min(1) }))
  .mutation(async ({ input }) => {
    try {
      const phone = input.phone.trim().replace(/\s+/g, '');

      if (!validatePhone(phone)) {
        throw new Error('Yanlış telefon nömrəsi formatı');
      }

      const throttle = checkThrottle(`otp:phone:verification:${phone}`, {
        cooldownMs: OTP_COOLDOWN_MS,
        windowMs: OTP_WINDOW_MS,
        maxInWindow: OTP_MAX_IN_WINDOW,
      });
      if (throttle.allowed === false) {
        const seconds = throttle.retryAfterSeconds;
        throw new Error(
          throttle.reason === 'cooldown'
            ? `Zəhmət olmasa yenidən göndərmək üçün ${seconds} saniyə gözləyin.`
            : `Çoxlu sorğu göndərildi. ${seconds} saniyə sonra yenidən cəhd edin.`,
        );
      }

      // Generate new OTP
      const otp = generatePhoneOTP();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store OTP
      phoneOtpStore.set(phone, { code: otp, expiresAt, phone });

      // Send SMS
      await smsService.sendOTP(phone, otp, 'verification');

      logger.info(`[Phone Registration] OTP resent to ${phone}`);

      return {
        success: true,
        message: 'OTP yenidən göndərildi',
        retryAfterSeconds: throttle.retryAfterSeconds,
      };
    } catch (error) {
      logger.error('[Phone Registration] Resend OTP error:', error);
      throw error;
    }
  });


import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { generateTokenPair } from '../../../../utils/jwt';
import { logger } from '../../../../utils/logger';
import { validatePhone } from '../../../../utils/validation';
import { checkThrottle } from '../../../../utils/throttle';
import { generatePhoneOTP, phoneOtpStore } from '../phoneOtpStore'; // max 5 sends/hour per phone

import { smsService } from '../../../../services/sms';

const OTP_COOLDOWN_MS = 60 * 1000; // 60s between sends
const OTP_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const OTP_MAX_IN_WINDOW = 5;

export const registerWithPhoneProcedure = publicProcedure
  .input(
    z.object({
      phone: z.string().min(1),
      name: z.string().min(1),
    }),
  )
  .mutation(async ({ input }) => {
    try {
      const phone = input.phone.trim().replace(/\s+/g, '');

      // Validate phone number
      if (!validatePhone(phone)) {
        throw new Error('Yanlış telefon nömrəsi formatı');
      }

      // Check if phone already exists
      const existingUser = await prisma.user.findFirst({
        where: { phone },
      });

      if (existingUser) {
        throw new Error('Bu telefon nömrəsi artıq qeydiyyatdan keçib');
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

      // Generate OTP
      const otp = generatePhoneOTP();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store OTP
      phoneOtpStore.set(phone, { code: otp, expiresAt, phone });

      // Send SMS
      await smsService.sendOTP(phone, otp, 'verification');

      logger.info(`[Phone Registration] OTP sent to ${phone}`);

      return {
        success: true,
        message: 'OTP göndərildi',
        phone,
        retryAfterSeconds: throttle.retryAfterSeconds,
      };
    } catch (error) {
      logger.error('[Phone Registration] Error:', error);
      throw error;
    }
  });


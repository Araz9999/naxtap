import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { userDB } from '../../../../db/users';
import { emailService } from '../../../../services/email';
import { logger } from '../../../../utils/logger';
import { otpStore, generateOTP } from '../verifyPasswordOTP/route';
import { checkThrottle } from '../../../../utils/throttle';

const OTP_COOLDOWN_MS = 60 * 1000; // 60s between sends
const OTP_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const OTP_MAX_IN_WINDOW = 5; // max 5 sends/hour per contact

export const forgotPasswordProcedure = publicProcedure
  .input(
    z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
    })
      .refine((data) => data.email || data.phone, {
        message: 'Email və ya telefon nömrəsi tələb olunur',
      }),
  )
  .mutation(async ({ input }) => {
    try {
      let user = null;
      let contactInfo = '';
      let contactType: 'email' | 'phone' = 'email';

      if (input.email) {
        contactInfo = input.email.toLowerCase().trim();
        contactType = 'email';
        user = await userDB.findByEmail(contactInfo);
      } else if (input.phone) {
        contactInfo = input.phone.replace(/\s/g, '');
        contactType = 'phone';
        user = await userDB.findByPhone(contactInfo);
      }

      // Check if user exists - show error if phone number not registered
      if (!user) {
        if (contactType === 'phone') {
          throw new Error('Bu telefon nömrəsi qeydiyyatdan keçməyib. Düzgün nömrə daxil edin.');
        }
        // For email, don't reveal if user exists (security best practice)
        return {
          success: true,
          message: 'Əgər bu email qeydiyyatdan keçibsə, OTP kodu göndəriləcək',
          retryAfterSeconds: Math.ceil(OTP_COOLDOWN_MS / 1000),
        };
      }

      const throttleKey =
        contactType === 'email'
          ? `otp:password_reset:email:${contactInfo}`
          : `otp:password_reset:phone:${contactInfo}`;
      const throttle = checkThrottle(throttleKey, {
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
      const otp = generateOTP();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store OTP
      otpStore.set(contactInfo, {
        code: otp,
        expiresAt,
        userId: user.id,
      });

      // Send OTP via email (no Twilio/SMS)
      const emailSent = await emailService.sendOTPToEmail(user.email, {
        name: user.name,
        otp,
        purpose: 'password-reset',
      });

      if (!emailSent) {
        logger.warn('[Auth] Failed to send password reset OTP email');
      } else {
        logger.info('[Auth] Password reset OTP sent via email:', {
          email: user.email,
          contactType,
        });
      }

      logger.info('[Auth] Password reset OTP sent:', { userId: user.id, contactType });

      return {
        success: true,
        message: 'OTP kodu e-poçt ünvanınıza göndərildi',
        retryAfterSeconds: throttle.retryAfterSeconds,
      };
    } catch (error) {
      logger.error('[Auth] Forgot password error:', error);
      throw error;
    }
  });


import { protectedProcedure } from '../../../create-context';
import { findUserById, setVerificationToken } from '../../../../db/userPrisma';
import { emailService } from '../../../../services/email';

import { logger } from '../../../../utils/logger';
import { checkThrottle } from '../../../../utils/throttle';

const VERIFICATION_COOLDOWN_MS = 60 * 1000; // 60s between sends
const VERIFICATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const VERIFICATION_MAX_IN_WINDOW = 5; // max 5 sends/hour per user
export const resendVerificationProcedure = protectedProcedure
  .mutation(async ({ ctx }) => {
    logger.debug('[Auth] Resend verification attempt:', ctx.user.userId);

    const user = await findUserById(ctx.user.userId);
    if (!user) {
      throw new Error('İstifadəçi tapılmadı');
    }

    if (user.verified) {
      return {
        success: false,
        message: 'Email artıq təsdiqlənib',
      };
    }

    const throttle = checkThrottle(`email_verification:${user.id}`, {
      cooldownMs: VERIFICATION_COOLDOWN_MS,
      windowMs: VERIFICATION_WINDOW_MS,
      maxInWindow: VERIFICATION_MAX_IN_WINDOW,
    });
    if (throttle.allowed === false) {
      const seconds = throttle.retryAfterSeconds;
      throw new Error(
        throttle.reason === 'cooldown'
          ? `Zəhmət olmasa yenidən göndərmək üçün ${seconds} saniyə gözləyin.`
          : `Çoxlu sorğu göndərildi. ${seconds} saniyə sonra yenidən cəhd edin.`,
      );
    }

    const verificationToken = generateRandomToken();
    await setVerificationToken(user.id, verificationToken, 24);

    const frontendUrl = process.env.FRONTEND_URL || process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://1r36dhx42va8pxqbqz5ja.rork.app';
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${verificationToken}`;

    const emailSent = await emailService.sendVerificationEmail(user.email, {
      name: user.name,
      verificationUrl,
    });

    if (!emailSent) {
      throw new Error('Email göndərilə bilmədi. Zəhmət olmasa bir az sonra yenidən cəhd edin.');
    }

    logger.debug('[Auth] Verification email resent:', user.id);

    return {
      success: true,
      message: 'Təsdiq emaili yenidən göndərildi',
      retryAfterSeconds: throttle.retryAfterSeconds,
    };
  });

function generateRandomToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

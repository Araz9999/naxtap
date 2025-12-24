import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { createUser } from '../../../../db/userPrisma';
import { generateTokenPair } from '../../../../utils/jwt';
import { logger } from '../../../../utils/logger';
import { validatePhone } from '../../../../utils/validation';

// OTP store (same as in registerWithPhone)
const otpStore = new Map<string, { code: string; expiresAt: number; phone: string }>();

export const verifyPhoneOTPProcedure = publicProcedure
  .input(
    z.object({
      phone: z.string().min(1),
      otp: z.string().length(6),
      name: z.string().min(1),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const phone = input.phone.trim().replace(/\s+/g, '');
      const otp = input.otp.trim();
      
      // Validate phone number
      if (!validatePhone(phone)) {
        throw new Error('Yanlış telefon nömrəsi formatı');
      }
      
      // Check OTP
      const storedOTP = otpStore.get(phone);
      
      if (!storedOTP) {
        throw new Error('OTP tapılmadı. Zəhmət olmasa yenidən göndərin');
      }
      
      if (storedOTP.code !== otp) {
        throw new Error('Yanlış OTP kodu');
      }
      
      if (Date.now() > storedOTP.expiresAt) {
        otpStore.delete(phone);
        throw new Error('OTP müddəti bitib. Zəhmət olmasa yenidən göndərin');
      }
      
      // OTP verified, create user
      const user = await createUser({
        email: `phone_${phone.replace(/[^0-9]/g, '')}@naxtap.local`, // Temporary email
        name: input.name.trim(),
        phone,
        passwordHash: null, // No password for phone-only users
        verified: true, // Phone verified via OTP
        role: 'USER',
        balance: 0,
      });
      
      if (!user) {
        throw new Error('İstifadəçi yaradıla bilmədi');
      }
      
      // Clean up OTP
      otpStore.delete(phone);
      
      // Generate tokens
      const tokens = await generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
      
      logger.info(`[Phone Registration] User created: ${user.id}`);
      
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          phone: user.phone,
          verified: user.verified,
          role: user.role,
          balance: user.balance,
        },
        tokens,
      };
    } catch (error) {
      logger.error('[Phone Registration] Verify OTP error:', error);
      throw error;
    }
  });


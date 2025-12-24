import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { prisma } from '../../../../db/client';
import { generateTokenPair } from '../../../../utils/jwt';
import { logger } from '../../../../utils/logger';
import { validatePhone } from '../../../../utils/validation';

// Simple OTP storage (in production, use Redis or database)
const otpStore = new Map<string, { code: string; expiresAt: number; phone: string }>();

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

import { smsService } from '../../../../services/sms';

export const registerWithPhoneProcedure = publicProcedure
  .input(
    z.object({
      phone: z.string().min(1),
      name: z.string().min(1),
    })
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
      
      // Generate OTP
      const otp = generateOTP();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      
      // Store OTP
      otpStore.set(phone, { code: otp, expiresAt, phone });
      
      // Send SMS
      await smsService.sendOTP(phone, otp, 'verification');
      
      logger.info(`[Phone Registration] OTP sent to ${phone}`);
      
      return {
        success: true,
        message: 'OTP göndərildi',
        phone,
      };
    } catch (error) {
      logger.error('[Phone Registration] Error:', error);
      throw error;
    }
  });


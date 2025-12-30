// Simple OTP storage for phone registration (process-local).
// In production, use Redis or DB.

export type PhoneOtpEntry = { code: string; expiresAt: number; phone: string };

export const phoneOtpStore = new Map<string, PhoneOtpEntry>();

export function generatePhoneOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


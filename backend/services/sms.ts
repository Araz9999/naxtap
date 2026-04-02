import { logger } from '../utils/logger';

interface SMSOptions {
  to: string;
  message: string;
}

class SMSService {
  private apiKey: string;
  private fromNumber: string;
  private provider: string;

  constructor() {
    this.apiKey = process.env.SMS_API_KEY || '';
    this.fromNumber = process.env.SMS_FROM_NUMBER || '';
    this.provider = process.env.SMS_PROVIDER || 'console';

    if (this.isConfigured()) {
      logger.info('[SMS] SMS service configured:', {
        provider: this.provider,
        fromNumber: this.fromNumber ? `${this.fromNumber.substring(0, 4)}***` : 'not set',
      });
    } else {
      logger.info('[SMS] SMS service running in development mode (console logging only)');
    }
  }

  isConfigured(): boolean {
    if (!this.provider || this.provider === 'console') {
      return false;
    }
    return !!this.apiKey &&
           !this.apiKey.includes('your-') &&
           !!this.fromNumber;
  }

  async sendSMS(options: SMSOptions): Promise<boolean> {
    logger.info('[SMS] Sending SMS:', {
      to: options.to,
      provider: this.provider,
      messageLength: options.message.length,
    });

    // For development/testing: log to console if not configured
    if (!this.isConfigured()) {
      logger.warn('[SMS] SMS service not configured, logging OTP to console:', {
        to: options.to,
        message: options.message,
      });
      console.log('\n📱 ===== SMS OTP (Development Mode) =====');
      console.log(`To: ${options.to}`);
      console.log(`Message: ${options.message}`);
      console.log('==========================================\n');
      return true; // Return true for development
    }

    try {
      if (this.provider.toLowerCase() === 'aws-sns') {
        return await this.sendViaAWSSNS(options);
      }
      // Fallback: log to console for any other provider
      logger.warn('[SMS] SMS provider not implemented:', this.provider);
      console.log('\n📱 ===== SMS OTP =====');
      console.log(`To: ${options.to}`);
      console.log(`Message: ${options.message}`);
      console.log('=====================\n');
      return true;
    } catch (error) {
      logger.error('[SMS] Failed to send SMS:', error);
      return false;
    }
  }

  private async sendViaAWSSNS(options: SMSOptions): Promise<boolean> {
    // TODO: Implement AWS SNS SMS sending
    logger.warn('[SMS] AWS SNS not yet implemented');
    return false;
  }

  async sendOTP(phone: string, otp: string, purpose: string = 'verification'): Promise<boolean> {
    const message = purpose === 'password-reset'
      ? `NaxtaPaz şifrə sıfırlama kodu: ${otp}. Bu kod 10 dəqiqə ərzində etibarlıdır.`
      : `NaxtaPaz təsdiq kodu: ${otp}. Bu kod 10 dəqiqə ərzində etibarlıdır.`;

    return this.sendSMS({
      to: phone,
      message,
    });
  }
}

export const smsService = new SMSService();


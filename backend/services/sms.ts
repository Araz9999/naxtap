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
    this.provider = process.env.SMS_PROVIDER || 'console'; // 'console', 'twilio', 'aws-sns', etc.
    
    // Log configuration status on startup
    if (this.isConfigured()) {
      logger.info('[SMS] SMS service configured:', { 
        provider: this.provider,
        fromNumber: this.fromNumber ? `${this.fromNumber.substring(0, 4)}***` : 'not set'
      });
    } else {
      logger.info('[SMS] SMS service running in development mode (console logging)');
      logger.info('[SMS] To enable real SMS, set in .env: SMS_PROVIDER=twilio, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, SMS_FROM_NUMBER');
    }
  }

  isConfigured(): boolean {
    // Check if provider is set and not 'console'
    if (!this.provider || this.provider === 'console') {
      return false;
    }

    // For Twilio, check for Twilio-specific credentials
    if (this.provider.toLowerCase() === 'twilio') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
      const authToken = process.env.TWILIO_AUTH_TOKEN || '';
      return !!accountSid && 
             !!authToken && 
             !!this.fromNumber &&
             !accountSid.includes('your-') && 
             !authToken.includes('your-');
    }

    // For other providers, check generic API key
    return !!this.apiKey && 
           !this.apiKey.includes('your-') && 
           !!this.fromNumber;
  }

  async sendSMS(options: SMSOptions): Promise<boolean> {
    logger.info('[SMS] Sending SMS:', { 
      to: options.to,
      provider: this.provider,
      messageLength: options.message.length
    });
    
    // For development/testing: log to console if not configured
    if (!this.isConfigured()) {
      logger.warn('[SMS] SMS service not configured, logging OTP to console:', { 
        to: options.to,
        message: options.message
      });
      console.log('\n📱 ===== SMS OTP (Development Mode) =====');
      console.log(`To: ${options.to}`);
      console.log(`Message: ${options.message}`);
      console.log('==========================================\n');
      return true; // Return true for development
    }

    try {
      switch (this.provider.toLowerCase()) {
        case 'twilio':
          return await this.sendViaTwilio(options);
        case 'aws-sns':
          return await this.sendViaAWSSNS(options);
        default:
          logger.warn('[SMS] Unknown SMS provider:', this.provider);
          // Fallback to console logging
          console.log('\n📱 ===== SMS OTP =====');
          console.log(`To: ${options.to}`);
          console.log(`Message: ${options.message}`);
          console.log('=====================\n');
          return true;
      }
    } catch (error) {
      logger.error('[SMS] Failed to send SMS:', error);
      return false;
    }
  }

  private async sendViaTwilio(options: SMSOptions): Promise<boolean> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    const authToken = process.env.TWILIO_AUTH_TOKEN || '';
    
    if (!accountSid || !authToken || !this.fromNumber) {
      logger.error('[SMS] Twilio credentials not fully configured', {
        hasAccountSid: !!accountSid,
        hasAuthToken: !!authToken,
        hasFromNumber: !!this.fromNumber
      });
      return false;
    }

    // Validate credentials format
    if (accountSid.includes('your-') || authToken.includes('your-') || this.fromNumber.includes('1234567890')) {
      logger.warn('[SMS] Twilio credentials appear to be placeholder values');
      return false;
    }

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: this.fromNumber,
            To: options.to,
            Body: options.message,
          }),
          signal: AbortSignal.timeout(15000), // 15 second timeout
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[SMS] Twilio API error:', { 
          status: response.status,
          error: errorText
        });
        return false;
      }

      logger.info('[SMS] Successfully sent SMS via Twilio', { to: options.to });
      return true;
    } catch (error) {
      logger.error('[SMS] Twilio send error:', error);
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


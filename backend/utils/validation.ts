/**
 * Input validation utilities
 * BUG FIX: Provides validation for user inputs
 * Fixes bugs #1160-#1309 (missing input validation)
 */

// Zod schemas for tRPC
import { z } from 'zod';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Email validation - Enhanced security
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Stricter email validation with length limits
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  // Length validation
  if (email.length > 254) {
    return false;
  }

  return emailRegex.test(email.trim());
}

/**
 * Phone number validation (Azerbaijan format)
 */
export function validatePhone(phone: string): boolean {
  // Accepts: +994XXXXXXXXX, 994XXXXXXXXX, or 0XXXXXXXXX
  const phoneRegex = /^(\+?994|0)?[0-9]{9}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Password strength validation
 */
export function validatePassword(
  password: string,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Şifrə ən azı 8 simvol olmalıdır');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Şifrə ən azı 1 böyük hərf olmalıdır');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Şifrə ən azı 1 kiçik hərf olmalıdır');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Şifrə ən azı 1 rəqəm olmalıdır');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Amount validation
 */
export function validateAmount(
  amount: number | string,
  options: {
    min?: number;
    max?: number;
    required?: boolean;
  } = {},
): { valid: boolean; error?: string } {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, required = true } = options;

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (required && (amount === '' || amount === null || amount === undefined)) {
    return { valid: false, error: 'Məbləğ daxil edilməlidir' };
  }

  if (isNaN(numAmount)) {
    return { valid: false, error: 'Etibarlı məbləğ daxil edin' };
  }

  if (numAmount < min) {
    return { valid: false, error: `Minimum məbləğ ${min} olmalıdır` };
  }

  if (numAmount > max) {
    return { valid: false, error: `Maksimum məbləğ ${max} olmalıdır` };
  }

  return { valid: true };
}

/**
 * Date validation
 */
export function validateDate(date: Date | string): {
  valid: boolean;
  error?: string;
} {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return { valid: false, error: 'Etibarlı tarix daxil edin' };
  }

  return { valid: true };
}

/**
 * Future date validation
 */
export function validateFutureDate(date: Date | string): {
  valid: boolean;
  error?: string;
} {
  const dateValidation = validateDate(date);
  if (!dateValidation.valid) {
    return dateValidation;
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  if (dateObj <= now) {
    return { valid: false, error: 'Tarix gələcəkdə olmalıdır' };
  }

  return { valid: true };
}

/**
 * URL validation
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe parseInt with validation
 */
export function safeParseInt(
  value: string | number,
  fallback: number = 0,
): number {
  const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Safe parseFloat with validation
 */
export function safeParseFloat(
  value: string | number,
  fallback: number = 0,
): number {
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Sanitize string input - XSS Protection
 * Removes potentially dangerous characters and limits length
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    // Remove HTML tags and dangerous characters
    .replace(/[<>\"'`]/g, '')
    // Remove script tags and event handlers
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Limit length to prevent DoS
    .substring(0, maxLength);
}

/**
 * Sanitize HTML input - Comprehensive XSS Protection
 */
export function sanitizeHTML(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize JSON input
 */
export function safeJSONParse<T = any>(
  jsonString: string,
  fallback: T,
): T {
  try {
    // Prevent prototype pollution
    const parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === 'object' && parsed.__proto__) {
      delete parsed.__proto__;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

/**
 * Validate file upload
 */
export function validateFile(
  file: { size: number; type: string; name: string },
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
  } = {},
): { valid: boolean; error?: string } {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = [] } = options;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Fayl ölçüsü maksimum ${Math.round(maxSize / 1024 / 1024)}MB olmalıdır`,
    };
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Yalnız ${allowedTypes.join(', ')} formatları qəbul edilir`,
    };
  }

  return { valid: true };
}

/**
 * Validate array bounds - Type safe version
 */
export function validateArrayIndex<T>(
  array: T[],
  index: number,
): { valid: boolean; error?: string } {
  if (!Array.isArray(array)) {
    return { valid: false, error: 'Array deyil' };
  }

  if (index < 0 || index >= array.length) {
    return { valid: false, error: 'İndeks sərhədlərdən kənardır' };
  }

  return { valid: true };
}

/**
 * Validate credit card number (Luhn algorithm)
 */
export function validateCreditCard(cardNumber: string): boolean {
  if (!cardNumber || typeof cardNumber !== 'string') {
    return false;
  }

  // Remove spaces and dashes
  const cleaned = cardNumber.replace(/[\s-]/g, '');

  // Check if it's all digits and proper length
  if (!/^\d{13,19}$/.test(cleaned)) {
    return false;
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate IBAN (International Bank Account Number)
 */
export function validateIBAN(iban: string): boolean {
  if (!iban || typeof iban !== 'string') {
    return false;
  }

  // Remove spaces and convert to uppercase
  const cleaned = iban.replace(/\s/g, '').toUpperCase();

  // Basic format check
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(cleaned)) {
    return false;
  }

  // Length check (varies by country, 15-34 characters)
  if (cleaned.length < 15 || cleaned.length > 34) {
    return false;
  }

  return true;
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000, // 15 minutes
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetAt) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (record.count >= this.maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  getRemainingAttempts(key: string): number {
    const record = this.attempts.get(key);
    if (!record || Date.now() > record.resetAt) {
      return this.maxAttempts;
    }
    return Math.max(0, this.maxAttempts - record.count);
  }
}

/**
 * Generic required field validation
 */
export function validateRequired<T>(
  value: T,
  fieldName: string,
): asserts value is NonNullable<T> {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} tələb olunur`);
  }
}

export const emailSchema = z
  .string({ message: 'Email tələb olunur' })
  .min(1, 'Email tələb olunur')
  .email('Etibarlı email daxil edin')
  .max(254, 'Email maksimum 254 simvol ola bilər')
  .transform(email => email.toLowerCase().trim());

export const passwordSchema = z
  .string({ message: 'Şifrə tələb olunur' })
  .min(1, 'Şifrə tələb olunur')
  .min(8, 'Şifrə ən azı 8 simvol olmalıdır')
  .max(128, 'Şifrə maksimum 128 simvol ola bilər')
  .regex(/[A-Z]/, 'Şifrə ən azı 1 böyük hərf olmalıdır')
  .regex(/[a-z]/, 'Şifrə ən azı 1 kiçik hərf olmalıdır')
  .regex(/[0-9]/, 'Şifrə ən azı 1 rəqəm olmalıdır');

export const nameSchema = z
  .string({ message: 'Ad tələb olunur' })
  .min(1, 'Ad tələb olunur')
  .min(2, 'Ad ən azı 2 simvol olmalıdır')
  .max(100, 'Ad maksimum 100 simvol ola bilər')
  .transform(name => name.trim());

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Şifrə tələb olunur'),
});

export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  phone: z.string().optional(),
});

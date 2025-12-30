/**
 * Security Utilities
 * Comprehensive security helpers for the application
 */

import { Platform } from 'react-native';
import { sanitizeString, RateLimiter } from './validation';
import { logger } from './logger';

/**
 * CSRF Token Manager
 */
class CSRFTokenManager {
  private token: string | null = null;

  generateToken(): string {
    // Generate a cryptographically secure random token
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for environments without crypto API
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }

    this.token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return this.token;
  }

  getToken(): string {
    if (!this.token) {
      return this.generateToken();
    }
    return this.token;
  }

  validateToken(token: string): boolean {
    return this.token === token;
  }

  clearToken(): void {
    this.token = null;
  }
}

export const csrfTokenManager = new CSRFTokenManager();

/**
 * Content Security Policy Helper
 */
export const CSP_POLICY = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com', 'https://cdn.mxpnl.com'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:', 'blob:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", 'https://api.resend.com', 'wss:'],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

/**
 * Security Headers for API Requests
 */
export function getSecurityHeaders(includeCSRF: boolean = true): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };

  if (includeCSRF) {
    headers['X-CSRF-Token'] = csrfTokenManager.getToken();
  }

  return headers;
}

/**
 * Secure String Comparison (timing-safe)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Password Strength Validator
 */
export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isStrong: boolean;
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Complexity checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score++;
  } else {
    feedback.push('Kiçik və böyük hərflərdən istifadə edin');
  }

  if (/[0-9]/.test(password)) {
    score++;
  } else {
    feedback.push('Ən azı bir rəqəm əlavə edin');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score++;
  } else {
    feedback.push('Xüsusi simvollar əlavə edin');
  }

  // Common password check
  const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    score = Math.max(0, score - 2);
    feedback.push('Ümumi şifrələrdən istifadə etməyin');
  }

  const finalScore = Math.min(4, Math.max(0, score - 2)); // Normalize to 0-4

  return {
    score: finalScore,
    feedback,
    isStrong: finalScore >= 3,
  };
}

/**
 * Rate Limiters for different operations
 */
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 min
export const apiRateLimiter = new RateLimiter(100, 60 * 1000); // 100 requests per minute
export const emailRateLimiter = new RateLimiter(3, 60 * 60 * 1000); // 3 emails per hour

/**
 * Input Sanitizer Middleware
 */
export function sanitizeInputs<T>(inputs: T): T {
  // Preserve arrays (previous implementation converted arrays into plain objects)
  if (Array.isArray(inputs)) {
    return inputs.map((v) => sanitizeInputs(v)) as unknown as T;
  }

  // Sanitize strings directly
  if (typeof inputs === 'string') {
    return sanitizeString(inputs) as unknown as T;
  }

  // Recurse objects (and drop prototype-pollution keys)
  if (inputs && typeof inputs === 'object') {
    const out: Record<string, unknown> = {};
    for (const [rawKey, value] of Object.entries(inputs as Record<string, unknown>)) {
      if (rawKey === '__proto__' || rawKey === 'constructor' || rawKey === 'prototype') continue;
      out[rawKey] = sanitizeInputs(value);
    }
    return out as unknown as T;
  }

  // numbers/booleans/null/undefined/etc.
  return inputs;
}

/**
 * Secure Token Storage
 */
export async function secureStoreToken(key: string, token: string): Promise<void> {
  // In a real app, you would use expo-secure-store or similar
  // This is a simplified version
  if (Platform.OS === 'web') {
    // Use secure cookie with httpOnly flag
    // This is a placeholder - implement proper secure storage
    sessionStorage.setItem(`secure_${key}`, token);
  } else {
    // Use secure-store on mobile
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.default.setItem(`secure_${key}`, token);
  }
}

export async function secureGetToken(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return sessionStorage.getItem(`secure_${key}`);
  } else {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    return await AsyncStorage.default.getItem(`secure_${key}`);
  }
}

export async function secureRemoveToken(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    sessionStorage.removeItem(`secure_${key}`);
  } else {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.default.removeItem(`secure_${key}`);
  }
}

/**
 * Audit Logger for Security Events
 */
export interface SecurityEvent {
  type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'suspicious_activity';
  userId?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

class SecurityAuditLogger {
  private events: SecurityEvent[] = [];
  private maxEvents = 1000;

  log(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.events.push(fullEvent);

    // Keep only last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // In production, send to logging service
    if (__DEV__) {
      logger.debug('[Security Audit]', fullEvent);
    }
  }

  getEvents(userId?: string): SecurityEvent[] {
    if (userId) {
      return this.events.filter(e => e.userId === userId);
    }
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }
}

export const securityAuditLogger = new SecurityAuditLogger();

/**
 * Prevent Prototype Pollution
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };

  // Remove dangerous properties
  delete (sanitized as Record<string, unknown>)['__proto__'];
  delete (sanitized as Record<string, unknown>)['constructor'];
  delete (sanitized as Record<string, unknown>)['prototype'];

  return sanitized;
}

/**
 * SQL Injection Prevention Helper
 */
export function escapeSQLString(str: string): string {
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\%]/g, (char) => {
    switch (char) {
      case '\0':
        return '\\0';
      case '\x08':
        return '\\b';
      case '\x09':
        return '\\t';
      case '\x1a':
        return '\\z';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '"':
      case "'":
      case '\\':
      case '%':
        return '\\' + char;
      default:
        return char;
    }
  });
}

/**
 * File Upload Security
 */
export function validateFileUpload(file: {
  name: string;
  size: number;
  type: string;
}): { valid: boolean; error?: string } {
  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx'];
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Yalnız ${allowedExtensions.join(', ')} formatları qəbul edilir`,
    };
  }

  // Check MIME type
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!allowedMimeTypes.includes(file.type)) {
    return { valid: false, error: 'Etibarsız fayl tipi' };
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'Fayl ölçüsü maksimum 10MB olmalıdır' };
  }

  return { valid: true };
}

/**
 * Export all security utilities
 */
export default {
  csrfTokenManager,
  getSecurityHeaders,
  secureCompare,
  checkPasswordStrength,
  loginRateLimiter,
  apiRateLimiter,
  emailRateLimiter,
  sanitizeInputs,
  secureStoreToken,
  secureGetToken,
  secureRemoveToken,
  securityAuditLogger,
  sanitizeObject,
  escapeSQLString,
  validateFileUpload,
  CSP_POLICY,
};

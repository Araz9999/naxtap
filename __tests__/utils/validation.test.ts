/**
 * Unit tests for validation utilities
 * @module __tests__/utils/validation
 */

import {
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isValidPrice,
  sanitizeInput,
  validateListingData,
} from '@/utils/validation';

describe('Validation Utils', () => {
  describe('isValidEmail', () => {
    test('should accept valid email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user+tag@domain.co.uk')).toBe(true);
      expect(isValidEmail('valid_email@test-domain.com')).toBe(true);
    });

    test('should reject invalid email addresses', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@.com')).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(isValidEmail(null as any)).toBe(false);
      expect(isValidEmail(undefined as any)).toBe(false);
      expect(isValidEmail(' user@example.com ')).toBe(true); // Should trim
    });
  });

  describe('isValidPassword', () => {
    test('should accept valid passwords', () => {
      expect(isValidPassword('SecurePass123!')).toBe(true);
      expect(isValidPassword('MyP@ssw0rd')).toBe(true);
      expect(isValidPassword('12345678')).toBe(true); // Min 8 chars
    });

    test('should reject invalid passwords', () => {
      expect(isValidPassword('')).toBe(false);
      expect(isValidPassword('short')).toBe(false); // Too short
      expect(isValidPassword('       ')).toBe(false); // Only whitespace
    });
  });

  describe('isValidPhone', () => {
    test('should accept valid Azerbaijani phone numbers', () => {
      expect(isValidPhone('994501234567')).toBe(true);
      expect(isValidPhone('+994501234567')).toBe(true);
      expect(isValidPhone('0501234567')).toBe(true);
    });

    test('should reject invalid phone numbers', () => {
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('abcd')).toBe(false);
    });
  });

  describe('isValidPrice', () => {
    test('should accept valid prices', () => {
      expect(isValidPrice(10)).toBe(true);
      expect(isValidPrice(99.99)).toBe(true);
      expect(isValidPrice(1000000)).toBe(true);
    });

    test('should reject invalid prices', () => {
      expect(isValidPrice(0)).toBe(false);
      expect(isValidPrice(-10)).toBe(false);
      expect(isValidPrice(NaN)).toBe(false);
      expect(isValidPrice(Infinity)).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    test('should remove dangerous characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).not.toContain('<script>');
      expect(sanitizeInput('Normal text')).toBe('Normal text');
    });

    test('should trim whitespace', () => {
      expect(sanitizeInput('  text  ')).toBe('text');
    });

    test('should handle special characters safely', () => {
      const input = 'Test & <test> "quotes"';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });
  });

  describe('validateListingData', () => {
    const validListing = {
      title: { az: 'Test', ru: 'Тест' },
      description: { az: 'Description', ru: 'Описание' },
      price: 100,
      categoryId: 1,
      subcategoryId: 1,
      images: ['image1.jpg'],
    };

    test('should accept valid listing data', () => {
      expect(validateListingData(validListing)).toEqual({ valid: true });
    });

    test('should reject listing with missing required fields', () => {
      const invalid = { ...validListing, title: undefined };
      const result = validateListingData(invalid as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('title');
    });

    test('should reject listing with invalid price', () => {
      const invalid = { ...validListing, price: -10 };
      const result = validateListingData(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('price');
    });

    test('should reject listing without images', () => {
      const invalid = { ...validListing, images: [] };
      const result = validateListingData(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('images');
    });
  });
});

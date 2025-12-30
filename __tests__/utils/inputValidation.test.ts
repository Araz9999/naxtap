/**
 * Unit tests for input validation utilities
 * @module __tests__/utils/inputValidation
 */

import {
  sanitizeNumericInput,
  sanitizeIntegerInput,
  validateNumericRange,
  validateDiscountPercentage,
  validateTimeInput,
  formatDecimal,
  validatePrice,
  validateEmail,
  validateAzerbaijanPhone,
  sanitizeTextInput,
  validateRequired,
  validateForm,
} from '@/utils/inputValidation';

describe('Input Validation Utils', () => {
  describe('sanitizeNumericInput', () => {
    test('should remove non-numeric characters', () => {
      expect(sanitizeNumericInput('abc123def')).toBe('123');
      expect(sanitizeNumericInput('test')).toBe('');
      expect(sanitizeNumericInput('123.45')).toBe('123.45');
    });

    test('should allow only one decimal point', () => {
      expect(sanitizeNumericInput('123.45.67')).toBe('123.45');
      expect(sanitizeNumericInput('1.2.3.4')).toBe('1.234');
    });

    test('should handle empty input', () => {
      expect(sanitizeNumericInput('')).toBe('');
      expect(sanitizeNumericInput('   ')).toBe('');
    });

    test('should handle special characters', () => {
      expect(sanitizeNumericInput('$123.45')).toBe('123.45');
      expect(sanitizeNumericInput('123,45')).toBe('12345');
    });
  });

  describe('sanitizeIntegerInput', () => {
    test('should remove all non-digits', () => {
      expect(sanitizeIntegerInput('123abc')).toBe('123');
      expect(sanitizeIntegerInput('12.34')).toBe('1234');
      expect(sanitizeIntegerInput('test123')).toBe('123');
    });

    test('should handle empty input', () => {
      expect(sanitizeIntegerInput('')).toBe('');
    });
  });

  describe('validateNumericRange', () => {
    test('should validate numbers within range', () => {
      expect(validateNumericRange(5, 0, 10, 'Value')).toBeNull();
      expect(validateNumericRange('7.5', 0, 10, 'Value')).toBeNull();
    });

    test('should reject numbers outside range', () => {
      expect(validateNumericRange(-1, 0, 10, 'Value')).toContain('at least 0');
      expect(validateNumericRange(11, 0, 10, 'Value')).toContain('at most 10');
    });

    test('should reject NaN', () => {
      expect(validateNumericRange('abc', 0, 10, 'Value')).toContain('valid number');
      expect(validateNumericRange(NaN, 0, 10, 'Value')).toContain('valid number');
    });
  });

  describe('validateDiscountPercentage', () => {
    test('should accept valid percentages', () => {
      expect(validateDiscountPercentage(0)).toBeNull();
      expect(validateDiscountPercentage(50)).toBeNull();
      expect(validateDiscountPercentage(100)).toBeNull();
      expect(validateDiscountPercentage('25.5')).toBeNull();
    });

    test('should reject invalid percentages', () => {
      expect(validateDiscountPercentage(-1)).not.toBeNull();
      expect(validateDiscountPercentage(101)).not.toBeNull();
      expect(validateDiscountPercentage('abc')).not.toBeNull();
    });
  });

  describe('validateTimeInput', () => {
    test('should validate hours (0-23)', () => {
      expect(validateTimeInput(0, 'hours')).toBeNull();
      expect(validateTimeInput(12, 'hours')).toBeNull();
      expect(validateTimeInput(23, 'hours')).toBeNull();
      expect(validateTimeInput(24, 'hours')).toContain('0 and 23');
      expect(validateTimeInput(-1, 'hours')).toContain('positive');
    });

    test('should validate minutes (0-59)', () => {
      expect(validateTimeInput(0, 'minutes')).toBeNull();
      expect(validateTimeInput(30, 'minutes')).toBeNull();
      expect(validateTimeInput(59, 'minutes')).toBeNull();
      expect(validateTimeInput(60, 'minutes')).toContain('0 and 59');
    });

    test('should validate days', () => {
      expect(validateTimeInput(1, 'days')).toBeNull();
      expect(validateTimeInput(100, 'days')).toBeNull();
      expect(validateTimeInput(365, 'days')).toBeNull();
      expect(validateTimeInput(366, 'days')).toContain('less than 365');
      expect(validateTimeInput(-1, 'days')).toContain('positive');
    });
  });

  describe('formatDecimal', () => {
    test('should format to 2 decimal places by default', () => {
      expect(formatDecimal(10.12345)).toBe('10.12');
      expect(formatDecimal(10.1)).toBe('10.10');
      expect(formatDecimal(10)).toBe('10.00');
    });

    test('should handle floating point arithmetic', () => {
      // Famous JavaScript bug: 0.1 + 0.2 = 0.30000000000000004
      expect(formatDecimal(0.1 + 0.2)).toBe('0.30');
      expect(formatDecimal(0.7 * 3)).toBe('2.10');
    });

    test('should support custom decimal places', () => {
      expect(formatDecimal(10.12345, 3)).toBe('10.123');
      expect(formatDecimal(10.12345, 1)).toBe('10.1');
      expect(formatDecimal(10.12345, 0)).toBe('10');
    });
  });

  describe('validatePrice', () => {
    test('should validate valid prices', () => {
      const result1 = validatePrice('100.50');
      expect(result1.isValid).toBe(true);
      expect(result1.sanitized).toBe('100.50');

      const result2 = validatePrice('1000');
      expect(result2.isValid).toBe(true);
    });

    test('should reject invalid prices', () => {
      expect(validatePrice('').isValid).toBe(false);
      expect(validatePrice('0').isValid).toBe(false);
      expect(validatePrice('-10').isValid).toBe(false);
      expect(validatePrice('abc').isValid).toBe(false);
    });

    test('should reject prices too large', () => {
      const result = validatePrice('2000000');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too large');
    });

    test('should sanitize and format', () => {
      const result = validatePrice('$100.50');
      expect(result.sanitized).toBe('100.50');
    });
  });

  describe('validateEmail', () => {
    test('should accept valid emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    test('should reject invalid emails', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user@.com')).toBe(false);
    });
  });

  describe('validateAzerbaijanPhone', () => {
    test('should accept valid Azerbaijan phone numbers', () => {
      expect(validateAzerbaijanPhone('+994501234567')).toBe(true);
      expect(validateAzerbaijanPhone('994501234567')).toBe(true);
      expect(validateAzerbaijanPhone('0501234567')).toBe(true);
    });

    test('should reject invalid phone numbers', () => {
      expect(validateAzerbaijanPhone('123')).toBe(false);
      expect(validateAzerbaijanPhone('1234567890')).toBe(false);
      expect(validateAzerbaijanPhone('+1234567890')).toBe(false);
    });

    test('should handle phone numbers with spaces/dashes', () => {
      expect(validateAzerbaijanPhone('+994 50 123 45 67')).toBe(true);
      expect(validateAzerbaijanPhone('0-50-123-45-67')).toBe(true);
    });
  });

  describe('sanitizeTextInput', () => {
    test('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeTextInput(input);
      expect(result).not.toContain('<script>');
      expect(result).toBe('Hello');
    });

    test('should remove HTML tags', () => {
      const input = '<div>Hello</div> <span>World</span>';
      const result = sanitizeTextInput(input);
      expect(result).toBe('Hello World');
    });

    test('should trim whitespace', () => {
      expect(sanitizeTextInput('  hello  ')).toBe('hello');
    });

    test('should enforce max length', () => {
      const input = 'Hello World This Is A Long String';
      const result = sanitizeTextInput(input, 11);
      expect(result).toBe('Hello World');
      expect(result.length).toBe(11);
    });
  });

  describe('validateRequired', () => {
    test('should pass for non-empty values', () => {
      expect(validateRequired('hello', 'Field')).toBeNull();
      expect(validateRequired('123', 'Field')).toBeNull();
    });

    test('should fail for empty values', () => {
      expect(validateRequired('', 'Field')).toContain('required');
      expect(validateRequired('   ', 'Field')).toContain('required');
    });
  });

  describe('validateForm', () => {
    test('should validate complete form', () => {
      const result = validateForm({
        email: {
          value: 'user@example.com',
          required: true,
          type: 'email',
        },
        phone: {
          value: '+994501234567',
          required: true,
          type: 'phone',
        },
        price: {
          value: '100',
          required: true,
          type: 'number',
          min: 0,
          max: 1000,
        },
      });

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    test('should catch all validation errors', () => {
      const result = validateForm({
        email: {
          value: 'invalid-email',
          required: true,
          type: 'email',
        },
        phone: {
          value: '123',
          required: true,
          type: 'phone',
        },
        price: {
          value: '-10',
          required: true,
          type: 'number',
          min: 0,
          max: 1000,
        },
        name: {
          value: '',
          required: true,
        },
      });

      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.phone).toBeDefined();
      expect(result.errors.price).toBeDefined();
      expect(result.errors.name).toBeDefined();
    });

    test('should skip validation for non-required empty fields', () => {
      const result = validateForm({
        optionalEmail: {
          value: '',
          required: false,
          type: 'email',
        },
      });

      expect(result.isValid).toBe(true);
    });
  });
});

/**
 * Input Validation Utilities
 * @module utils/inputValidation
 *
 * Robust input validation and sanitization for forms
 */

/**
 * Sanitize numeric input - only allows numbers and decimal point
 * Prevents multiple decimal points
 *
 * @example
 * sanitizeNumericInput("123.45.67") // "123.45"
 * sanitizeNumericInput("abc123") // "123"
 * sanitizeNumericInput("12.34") // "12.34"
 */
export function sanitizeNumericInput(value: string, maxDecimals?: number): string {
  if (!value) return '';

  // Remove all non-numeric characters except decimal point
  let cleaned = value.replace(/[^0-9.]/g, '');

  // Ensure only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    const intPart = parts[0] || '';
    const firstDec = parts[1] || '';
    // If the first decimal segment already has 2+ digits, treat the next '.' as invalid
    // and ignore remaining segments (typical money input like "123.45.67" => "123.45").
    // Otherwise, salvage by concatenating remaining digits ("1.2.3.4" => "1.234").
    const rest = parts.slice(2).join('');
    cleaned = firstDec.length >= 2 ? `${intPart}.${firstDec}` : `${intPart}.${firstDec}${rest}`;
  }

  if (typeof maxDecimals === 'number' && Number.isFinite(maxDecimals) && maxDecimals >= 0) {
    const [intPart, decPart] = cleaned.split('.');
    if (maxDecimals === 0) return intPart ?? '';
    if (typeof decPart === 'string') {
      return `${intPart ?? ''}.${decPart.slice(0, maxDecimals)}`;
    }
    return intPart ?? '';
  }

  return cleaned;
}

/**
 * Sanitize integer input - only allows numbers
 *
 * @example
 * sanitizeIntegerInput("123abc") // "123"
 * sanitizeIntegerInput("12.34") // "1234"
 */
export function sanitizeIntegerInput(value: string): string {
  if (!value) return '';
  return value.replace(/[^0-9]/g, '');
}

/**
 * Validate numeric range
 *
 * @param value - Value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Error message or null if valid
 */
export function validateNumericRange(
  value: string | number,
  min: number,
  max: number,
  fieldName: string = 'Value',
): string | null {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return `${fieldName} must be a valid number`;
  }

  if (num < min) {
    return `${fieldName} must be at least ${min}`;
  }

  if (num > max) {
    return `${fieldName} must be at most ${max}`;
  }

  return null;
}

/**
 * Validate discount percentage (0-100)
 */
export function validateDiscountPercentage(value: string | number): string | null {
  return validateNumericRange(value, 0, 100, 'Discount percentage');
}

/**
 * Validate time input (hours, minutes, etc.)
 */
export function validateTimeInput(
  value: string | number,
  unit: 'hours' | 'minutes' | 'days',
): string | null {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;

  if (isNaN(num) || num < 0) {
    return `${unit} must be a positive number`;
  }

  switch (unit) {
    case 'hours':
      if (num > 23) return 'Hours must be between 0 and 23';
      break;
    case 'minutes':
      if (num > 59) return 'Minutes must be between 0 and 59';
      break;
    case 'days':
      if (num > 365) return 'Days must be less than 365';
      break;
  }

  return null;
}

/**
 * Format decimal number to specific precision
 * Prevents floating point arithmetic issues
 *
 * @example
 * formatDecimal(0.1 + 0.2, 2) // "0.30"
 * formatDecimal(10.12345, 2) // "10.12"
 */
export function formatDecimal(value: number, decimals: number = 2): string {
  return (Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals);
}

/**
 * Validate and sanitize price input
 */
export function validatePrice(value: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  // Reject negative values explicitly (sanitization removes '-')
  if (typeof value === 'string' && value.trim().startsWith('-')) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Price must be greater than 0',
    };
  }
  const sanitized = sanitizeNumericInput(value);

  if (!sanitized) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Price is required',
    };
  }

  const num = parseFloat(sanitized);

  if (isNaN(num) || num <= 0) {
    return {
      isValid: false,
      sanitized,
      error: 'Price must be greater than 0',
    };
  }

  if (num > 1000000) {
    return {
      isValid: false,
      sanitized,
      error: 'Price is too large',
    };
  }

  return {
    isValid: true,
    sanitized: formatDecimal(num, 2),
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate phone number (Azerbaijan format)
 */
export function validateAzerbaijanPhone(phone: string): boolean {
  // Azerbaijan phone: +994XXXXXXXXX or 994XXXXXXXXX or 0XXXXXXXXX
  const cleaned = phone.replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+994') && cleaned.length === 13) return true;
  if (cleaned.startsWith('994') && cleaned.length === 12) return true;
  if (cleaned.startsWith('0') && cleaned.length === 10) return true;

  return false;
}

/**
 * Sanitize text input (remove XSS, trim whitespace)
 */
export function sanitizeTextInput(value: string, maxLength?: number): string {
  let sanitized = value
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '');

  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate required field
 */
export function validateRequired(value: string, fieldName: string = 'Field'): string | null {
  if (!value || !value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * Comprehensive form validation
 */
export function validateForm(fields: Record<string, {
  value: string;
  required?: boolean;
  type?: 'email' | 'phone' | 'number' | 'text';
  min?: number;
  max?: number;
}>): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const [fieldName, config] of Object.entries(fields)) {
    const { value, required, type, min, max } = config;

    // Check required
    if (required) {
      const error = validateRequired(value, fieldName);
      if (error) {
        errors[fieldName] = error;
        continue;
      }
    }

    // Skip type validation if field is empty and not required
    if (!value && !required) continue;

    // Type-specific validation
    switch (type) {
      case 'email':
        if (!validateEmail(value)) {
          errors[fieldName] = 'Invalid email format';
        }
        break;

      case 'phone':
        if (!validateAzerbaijanPhone(value)) {
          errors[fieldName] = 'Invalid phone number';
        }
        break;

      case 'number':
        const num = parseFloat(value);
        if (isNaN(num)) {
          errors[fieldName] = `${fieldName} must be a number`;
        } else {
          const rangeError = validateNumericRange(
            num,
            min ?? -Infinity,
            max ?? Infinity,
            fieldName,
          );
          if (rangeError) {
            errors[fieldName] = rangeError;
          }
        }
        break;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates website URL format
 * @param url - URL string to validate
 * @param required - If false, empty URL is valid
 * @returns true if valid URL format
 */
export const validateWebsiteURL = (url: string, required: boolean = false): boolean => {
  const trimmed = url.trim();
  if (!required && !trimmed) return true;
  if (required && !trimmed) return false;

  try {
    const urlObj = new URL(trimmed);
    // Must start with http:// or https://
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Validates store name
 * @param name - Store name to validate
 * @param minLength - Minimum length (default: 3)
 * @param maxLength - Maximum length (default: 50)
 * @returns object with isValid flag and error message
 */
export const validateStoreName = (name: string, minLength: number = 3, maxLength: number = 50): { isValid: boolean; error?: string } => {
  const trimmed = name.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Mağaza adı boş ola bilməz' };
  }

  if (trimmed.length < minLength) {
    return { isValid: false, error: `Mağaza adı ən azı ${minLength} simvol olmalıdır` };
  }

  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Mağaza adı maksimum ${maxLength} simvol ola bilər` };
  }

  return { isValid: true };
};

export default {
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
  validateWebsiteURL,
  validateStoreName,
};

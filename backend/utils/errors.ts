/**
 * Custom Error Classes for Backend
 * Provides structured error handling with proper typing
 */

export class DatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: unknown,
    public operation?: string,
  ) {
    super(message);
    this.name = 'DatabaseError';

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      operation: this.operation,
      originalError: this.originalError instanceof Error
        ? this.originalError.message
        : String(this.originalError),
    };
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: unknown,
  ) {
    super(message);
    this.name = 'ValidationError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      field: this.field,
    };
  }
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public reason?: string,
  ) {
    super(message);
    this.name = 'AuthenticationError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthenticationError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      reason: this.reason,
    };
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public requiredRole?: string,
  ) {
    super(message);
    this.name = 'AuthorizationError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthorizationError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      requiredRole: this.requiredRole,
    };
  }
}

export class PaymentError extends Error {
  constructor(
    message: string,
    public code?: string,
    public transactionId?: string,
  ) {
    super(message);
    this.name = 'PaymentError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PaymentError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      transactionId: this.transactionId,
    };
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = 'RateLimitError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      retryAfter: this.retryAfter,
    };
  }
}

export class ExternalAPIError extends Error {
  constructor(
    message: string,
    public service?: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'ExternalAPIError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExternalAPIError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      service: this.service,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Helper to determine if error is of specific type
 */
export function isErrorType<T extends Error>(
  error: unknown,
  errorClass: new (...args: unknown[]) => T,
): error is T {
  return error instanceof errorClass;
}

/**
 * Safe error message extraction
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error as unknown as Record<string, unknown>),
    };
  }

  return {
    error: String(error),
  };
}

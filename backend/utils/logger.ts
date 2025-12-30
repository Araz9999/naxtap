/**
 * Production-safe logger utility
 * BUG FIX: Replaces console.log to prevent logs in production
 * Fixes bugs #123-#720 (598 console.log instances)
 */

/* eslint-disable no-console */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  prefix?: string;
}

// Determine dev mode in both React Native / web (__DEV__) and Node.js
const IS_TEST: boolean = process.env.NODE_ENV === 'test';
const IS_DEV: boolean =
  // @ts-ignore - __DEV__ is provided by React Native / Expo on the client
  !IS_TEST &&
  (typeof __DEV__ !== 'undefined'
    ? __DEV__
    : process.env.NODE_ENV !== 'production');

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      // Keep logs minimal in tests (prevents noisy Jest output)
      enabled: IS_DEV || IS_TEST,
      minLevel: IS_DEV ? 'debug' : 'error',
      prefix: '',
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    return `${timestamp} ${prefix}[${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, error?: unknown, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), error || '', ...args);

      // In production, send to error tracking service
      if (!IS_DEV && error) {
        this.reportError(message, error);
      }
    }
  }

  auth(message: string, metadata?: unknown): void {
    this.info(`[Auth] ${message}`, metadata);
  }

  security(message: string, metadata?: unknown): void {
    this.warn(`[Security] ${message}`, metadata);
  }

  private reportError(message: string, error: unknown): void {
    // TODO: Integrate with error tracking service (Sentry, Bugsnag, etc.)
    // For now, just ensure it's logged
    if (error instanceof Error) {
      logger.error('Error Report:', {
        message,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  group(label: string): void {
    if (this.config.enabled && IS_DEV) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.config.enabled && IS_DEV) {
      console.groupEnd();
    }
  }

  table(data: unknown): void {
    if (this.config.enabled && IS_DEV) {
      console.table(data);
    }
  }
}

// Create default logger instance
export const logger = new Logger();

// Create specialized loggers for different parts of the app
export const authLogger = new Logger({ prefix: 'Auth' });
export const apiLogger = new Logger({ prefix: 'API' });
export const storeLogger = new Logger({ prefix: 'Store' });
export const uiLogger = new Logger({ prefix: 'UI' });

// Export the class for custom loggers
export { Logger };
export type { LogLevel, LoggerConfig };

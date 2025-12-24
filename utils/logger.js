"use strict";
/**
 * Production-safe logger utility
 * BUG FIX: Replaces console.log to prevent logs in production
 * Fixes bugs #123-#720 (598 console.log instances)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.uiLogger = exports.storeLogger = exports.apiLogger = exports.authLogger = exports.logger = void 0;
// Determine dev mode in both React Native / web (__DEV__) and Node.js
const IS_DEV = 
// @ts-ignore - __DEV__ is provided by React Native / Expo on the client
typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
class Logger {
    constructor(config) {
        this.config = {
            enabled: IS_DEV,
            minLevel: IS_DEV ? 'debug' : 'error',
            prefix: '',
            ...config,
        };
    }
    shouldLog(level) {
        if (!this.config.enabled)
            return false;
        return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
    }
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
        return `${timestamp} ${prefix}[${level.toUpperCase()}] ${message}`;
    }
    debug(message, metadata) {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message), metadata || '');
        }
    }
    info(message, metadata) {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message), metadata || '');
        }
    }
    warn(message, metadata) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message), metadata || '');
        }
    }
    error(message, error, metadata) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message), error || '', metadata || '');
            // In production, send to error tracking service
            if (!IS_DEV && error) {
                this.reportError(message, error);
            }
        }
    }
    reportError(message, error) {
        // TODO: Integrate with error tracking service (Sentry, Bugsnag, etc.)
        // For now, just ensure it's logged
        if (error instanceof Error) {
            exports.logger.error('Error Report:', {
                message,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
            });
        }
    }
    group(label) {
        if (this.config.enabled && IS_DEV) {
            console.group(label);
        }
    }
    groupEnd() {
        if (this.config.enabled && IS_DEV) {
            console.groupEnd();
        }
    }
    table(data) {
        if (this.config.enabled && IS_DEV) {
            console.table(data);
        }
    }
}
exports.Logger = Logger;
// Create default logger instance
exports.logger = new Logger();
// Create specialized loggers for different parts of the app
exports.authLogger = new Logger({ prefix: 'Auth' });
exports.apiLogger = new Logger({ prefix: 'API' });
exports.storeLogger = new Logger({ prefix: 'Store' });
exports.uiLogger = new Logger({ prefix: 'UI' });

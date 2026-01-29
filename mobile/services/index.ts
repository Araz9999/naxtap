// Import and export all services
import { apiService } from './apiService';
import { paymentService } from './paymentService';
import { notificationService } from './notificationService';
import { analyticsService } from './analyticsService';
import { storageService } from './storageService';
import { authService } from './authService';
import { payriffService } from './payriffService';

import { logger } from '@/utils/logger';
export { apiService, paymentService, notificationService, analyticsService, storageService, authService, payriffService };

// Export types
export type { PaymentMethod, PaymentIntent } from './paymentService';
export type { PayriffPaymentRequest, PayriffPaymentResponse, PayriffPaymentStatus } from './payriffService';
export type { PushNotification } from './notificationService';
export type { AnalyticsEvent, UserProperties } from './analyticsService';
export type { UploadResult, UploadOptions } from './storageService';
export type { AuthUser, LoginCredentials, RegisterData, AuthTokens } from './authService';

// Service initialization
export const initializeServices = async () => {
  logger.debug('Initializing services...');

  try {
    // Initialize authentication service first
    await authService.initialize();
    logger.debug('✓ Auth service initialized');

    // Initialize analytics
    await analyticsService.initialize();
    logger.debug('✓ Analytics service initialized');

    // Set auth token for API service if user is logged in
    const token = authService.getAccessToken();
    if (token) {
      apiService.setAuthToken(token);
      logger.debug('✓ API service configured with auth token');
    }

    logger.debug('✓ All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services');
  }
};

// Service health check
export const checkServicesHealth = () => {
  const services = {
    api: true, // API service is always available
    payment: paymentService.isConfigured(),
    payriff: payriffService.isConfigured(),
    notification: notificationService.isConfigured(),
    analytics: analyticsService.isConfigured(),
    storage: storageService.isConfigured(),
    auth: authService.isConfigured(),
  };

  logger.debug('Services health check:', {
    ...services,
    // Avoid printing secrets; only booleans here
  });
  return services;
};

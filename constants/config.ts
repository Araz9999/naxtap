import { Platform } from 'react-native';

// API Configuration
export const API_CONFIG = {
  // Base URLs
  BASE_URL: Platform.select({
    web: typeof window !== 'undefined' && window.location ? `${window.location.origin}/api` : 'https://naxtap.az/api',
    default: 'https://naxtap.az/api',
  }),

  // AI Services
  OPENAI_API_KEY: '',

  // Payment Services
  STRIPE_PUBLISHABLE_KEY: Platform.select({
    web: '',
    default: '',
  }),
  PAYPAL_CLIENT_ID: '',

  // Payriff Payment Gateway
  // Never hardcode real credentials here; use env on server instead
  PAYRIFF_MERCHANT_ID: '',
  PAYRIFF_SECRET_KEY: '',
  PAYRIFF_BASE_URL: 'https://api.payriff.com',
  FRONTEND_URL: 'https://naxtap.az',

  // Push Notifications
  EXPO_PUSH_TOKEN: '',
  FCM_SERVER_KEY: '',

  // Analytics
  GOOGLE_ANALYTICS_ID: '',
  MIXPANEL_TOKEN: '',

  // Social Login
  GOOGLE_CLIENT_ID: Platform.select({
    ios: '',
    android: '',
    web: '',
  }),
  FACEBOOK_APP_ID: '',

  // Maps & Location
  GOOGLE_MAPS_API_KEY: Platform.select({
    ios: 'your-google-maps-ios-key-here',
    android: 'your-google-maps-android-key-here',
    web: 'your-google-maps-web-key-here',
  }),

  // File Storage
  AWS_ACCESS_KEY_ID: '',
  AWS_SECRET_ACCESS_KEY: '',
  AWS_REGION: '',
  AWS_BUCKET_NAME: '',

  // SMS Services
  TWILIO_ACCOUNT_SID: '',
  TWILIO_AUTH_TOKEN: '',

  // Email Services
  SENDGRID_API_KEY: '',

  // Real-time Communication
  SOCKET_IO_URL: 'wss://your-socket-server.com',

  // Feature Flags
  ENABLE_ANALYTICS: true,
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_SOCIAL_LOGIN: true,
  ENABLE_PAYMENTS: true,
  ENABLE_REAL_TIME_CHAT: false,

  // App Configuration
  APP_VERSION: '1.0.0',
  MIN_SUPPORTED_VERSION: '1.0.0',
  FORCE_UPDATE_VERSION: '1.0.0',

  // Rate Limiting
  API_RATE_LIMIT: 100, // requests per minute

  // Cache Configuration
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes in milliseconds
};

// Environment-specific configurations
export const getEnvironmentConfig = () => {
  const isDevelopment =
    typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    return {
      ...API_CONFIG,
      BASE_URL: Platform.select({
        web: typeof window !== 'undefined' && window.location ? `${window.location.origin}/api` : 'https://naxtap.az/api',
        default: 'https://naxtap.az/api',
      }),
      ENABLE_ANALYTICS: false, // Disable analytics in development
    };
  }

  return API_CONFIG;
};

// Helper function to validate required API keys
export const validateApiKeys = () => {
  const config = getEnvironmentConfig();
  const requiredKeys = [
    'BASE_URL',
    'OPENAI_API_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'GOOGLE_MAPS_API_KEY',
  ];

  const missingKeys = requiredKeys.filter(key => {
    const value = config[key as keyof typeof config];
    return !value || (typeof value === 'string' && value.includes('your-'));
  });

  if (missingKeys.length > 0) {
    console.warn('Missing or placeholder API keys:', missingKeys);
    return false;
  }

  return true;
};

// Export default configuration
export default getEnvironmentConfig();

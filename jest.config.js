/**
 * Jest configuration for React Native / Expo project
 * @see https://jestjs.io/docs/configuration
 */

module.exports = {
  preset: 'jest-expo',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/store/(.*)$': '<rootDir>/store/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/backend/(.*)$': '<rootDir>/backend/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/constants/(.*)$': '<rootDir>/constants/$1',
    '^@/services/(.*)$': '<rootDir>/services/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    // Mock static assets
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx)',
    '**/*.test.(ts|tsx)',
    '**/*.spec.(ts|tsx)',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'backend/**/*.{ts,tsx}',
    'store/**/*.ts',
    'utils/**/*.ts',
    'services/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/coverage/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.expo/',
    '/dist/',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Verbose output
  verbose: true,

  // Timeout for tests
  testTimeout: 10000,
};

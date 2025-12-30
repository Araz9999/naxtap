/**
 * Integration tests for authentication routes
 * @module __tests__/backend/auth
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { generateTokenPair, verifyToken } from '@/backend/utils/jwt';
import { hashPassword, comparePassword } from '@/backend/utils/hash';

describe('Authentication System', () => {
  describe('JWT Token Generation', () => {
    test('should generate valid access and refresh tokens', async () => {
      const payload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'user' as const,
      };

      const tokens = await generateTokenPair(payload);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    test('should create tokens that can be verified', async () => {
      const payload = {
        userId: 'user456',
        email: 'verify@example.com',
        role: 'user' as const,
      };

      const tokens = await generateTokenPair(payload);
      const decoded = await verifyToken(tokens.accessToken);

      expect(decoded).toHaveProperty('userId');
      expect(decoded?.userId).toBe('user456');
      expect(decoded?.email).toBe('verify@example.com');
    });

    test('should handle invalid tokens', async () => {
      const invalidToken = 'invalid.token.here';
      const decoded = await verifyToken(invalidToken);

      expect(decoded).toBeNull();
    });

    test('should include expiration time', async () => {
      const payload = {
        userId: 'user789',
        email: 'expire@example.com',
        role: 'user' as const,
      };

      const tokens = await generateTokenPair(payload);
      const decoded = await verifyToken(tokens.accessToken);

      expect(decoded).toHaveProperty('exp');
      expect(decoded?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('Password Hashing', () => {
    test('should hash passwords securely', async () => {
      const password = 'MySecurePassword123!';
      const hashed = await hashPassword(password);

      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(30); // PBKDF2 hash is long
      expect(hashed).toContain(':'); // salt:hash format
    });

    test('should produce different hashes for same password', async () => {
      const password = 'SamePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Salt ensures uniqueness
    });

    test('should verify correct passwords', async () => {
      const password = 'CorrectPassword123!';
      const hashed = await hashPassword(password);
      const isMatch = await comparePassword(password, hashed);

      expect(isMatch).toBe(true);
    });

    test('should reject incorrect passwords', async () => {
      const password = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashed = await hashPassword(password);
      const isMatch = await comparePassword(wrongPassword, hashed);

      expect(isMatch).toBe(false);
    });

    test('should reject empty passwords', async () => {
      await expect(hashPassword('')).rejects.toThrow();
    });
  });

  describe('Token Payload Structure', () => {
    test('should include all required fields', async () => {
      const payload = {
        userId: 'abc123',
        email: 'complete@example.com',
        role: 'admin' as const,
      };

      const tokens = await generateTokenPair(payload);
      const decoded = await verifyToken(tokens.accessToken);

      expect(decoded?.userId).toBe('abc123');
      expect(decoded?.email).toBe('complete@example.com');
      expect(decoded?.role).toBe('admin');
    });

    test('should handle different user roles', async () => {
      const roles: ('user' | 'moderator' | 'admin')[] = ['user', 'moderator', 'admin'];

      for (const role of roles) {
        const payload = {
          userId: `${role}Id`,
          email: `${role}@example.com`,
          role,
        };

        const tokens = await generateTokenPair(payload);
        const decoded = await verifyToken(tokens.accessToken);

        expect(decoded?.role).toBe(role);
      }
    });
  });

  describe('Security Edge Cases', () => {
    test('should reject tokens with tampered payload', async () => {
      const payload = {
        userId: 'user999',
        email: 'tamper@example.com',
        role: 'user' as const,
      };

      const tokens = await generateTokenPair(payload);

      // Attempt to tamper with token
      const parts = tokens.accessToken.split('.');
      if (parts.length === 3) {
        const tamperedToken = `${parts[0]}.${Buffer.from('{"userId":"admin999"}').toString('base64')}.${parts[2]}`;
        const decoded = await verifyToken(tamperedToken);

        expect(decoded).toBeNull(); // Signature verification should fail
      }
    });

    test('should handle extremely long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      const hashed = await hashPassword(longPassword);
      const isMatch = await comparePassword(longPassword, hashed);

      expect(isMatch).toBe(true);
    });

    test('should handle special characters in passwords', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
      const hashed = await hashPassword(specialPassword);
      const isMatch = await comparePassword(specialPassword, hashed);

      expect(isMatch).toBe(true);
    });
  });
});

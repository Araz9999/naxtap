import { logger } from '../utils/logger';

export interface SocialProvider {
  provider: 'google' | 'facebook' | 'vk';
  socialId: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface DBUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  passwordHash?: string;
  socialProviders: SocialProvider[];
  role: 'user' | 'moderator' | 'admin';
  balance: number;
  verificationToken?: string;
  verificationTokenExpiry?: string;
  passwordResetToken?: string;
  passwordResetTokenExpiry?: string;
}

class UserDatabase {
  private users: Map<string, DBUser> = new Map();
  private emailIndex: Map<string, string> = new Map();
  private socialIndex: Map<string, string> = new Map();
  private verificationTokenIndex: Map<string, string> = new Map();
  private passwordResetTokenIndex: Map<string, string> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initializeDefaultUsers();
    this.startCleanupTask();
  }

  /**
   * BUG FIX: Periodically clean up expired tokens to prevent memory leaks
   */
  private startCleanupTask() {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60 * 60 * 1000);
  }

  /**
   * BUG FIX: Remove expired tokens from memory
   */
  private cleanupExpiredTokens() {
    const now = new Date();
    let cleanedCount = 0;

    // Clean up verification tokens
    for (const [token, userId] of this.verificationTokenIndex.entries()) {
      const user = this.users.get(userId);
      if (user?.verificationTokenExpiry && new Date(user.verificationTokenExpiry) < now) {
        this.verificationTokenIndex.delete(token);
        cleanedCount++;
      }
    }

    // Clean up password reset tokens
    for (const [token, userId] of this.passwordResetTokenIndex.entries()) {
      const user = this.users.get(userId);
      if (user?.passwordResetTokenExpiry && new Date(user.passwordResetTokenExpiry) < now) {
        this.passwordResetTokenIndex.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`[DB] Cleaned up ${cleanedCount} expired tokens`);
    }
  }

  /**
   * BUG FIX: Cleanup method for graceful shutdown
   */
  public cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private async initializeDefaultUsers() {
    // Import password hashing
    const { hashPassword } = await import('../utils/password');
    
    // Default regular user
    const defaultUser: DBUser = {
      id: '1',
      email: 'user@test.com',
      name: 'Test User',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      phone: '+994501234567',
      verified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      passwordHash: await hashPassword('Test1234'),
      socialProviders: [],
      role: 'user',
      balance: 1000,
    };

    // Admin user
    const adminUser: DBUser = {
      id: '2',
      email: 'admin@test.com',
      name: 'Admin User',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      phone: '+994501234568',
      verified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      passwordHash: await hashPassword('Admin1234'),
      socialProviders: [],
      role: 'admin',
      balance: 5000,
    };

    // Moderator user
    const moderatorUser: DBUser = {
      id: '3',
      email: 'moderator@test.com',
      name: 'Moderator User',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      phone: '+994501234569',
      verified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      passwordHash: await hashPassword('Mod1234'),
      socialProviders: [],
      role: 'moderator',
      balance: 2000,
    };

    this.users.set(defaultUser.id, defaultUser);
    this.emailIndex.set(defaultUser.email.toLowerCase(), defaultUser.id);
    
    this.users.set(adminUser.id, adminUser);
    this.emailIndex.set(adminUser.email.toLowerCase(), adminUser.id);
    
    this.users.set(moderatorUser.id, moderatorUser);
    this.emailIndex.set(moderatorUser.email.toLowerCase(), moderatorUser.id);
  }

  async findByEmail(email: string): Promise<DBUser | null> {
    const userId = this.emailIndex.get(email.toLowerCase());
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  async findById(id: string): Promise<DBUser | null> {
    return this.users.get(id) || null;
  }

  async findBySocialId(provider: string, socialId: string): Promise<DBUser | null> {
    const key = `${provider}:${socialId}`;
    const userId = this.socialIndex.get(key);
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  async createUser(userData: Partial<DBUser>): Promise<DBUser> {
    // Generate cryptographically secure ID
    const id = await this.generateSecureId();
    const now = new Date().toISOString();

    // Validate required fields
    if (!userData.email) {
      throw new Error('Email is required');
    }

    // Check for duplicate email
    const existingId = this.emailIndex.get(userData.email.toLowerCase());
    if (existingId) {
      throw new Error('Email already exists');
    }

    const user: DBUser = {
      id,
      email: userData.email,
      name: userData.name || 'User',
      avatar: userData.avatar,
      phone: userData.phone,
      verified: userData.verified || false,
      createdAt: now,
      updatedAt: now,
      passwordHash: userData.passwordHash,
      socialProviders: userData.socialProviders || [],
      role: userData.role || 'user',
      balance: userData.balance || 0,
    };

    // Atomic-like operation
    try {
      this.users.set(id, user);
      
      if (user.email) {
        this.emailIndex.set(user.email.toLowerCase(), id);
      }

      user.socialProviders.forEach(provider => {
        const key = `${provider.provider}:${provider.socialId}`;
        this.socialIndex.set(key, id);
      });

      logger.info(`[DB] Created user: ${user.id} (${user.email})`);
      return user;
    } catch (error) {
      // BUG FIX: Rollback on error
      this.users.delete(id);
      if (user.email) {
        this.emailIndex.delete(user.email.toLowerCase());
      }
      throw error;
    }
  }

  /**
   * Generate cryptographically secure user ID
   */
  private async generateSecureId(): Promise<string> {
    const timestamp = Date.now();
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const randomHex = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
    return `user_${timestamp}_${randomHex}`;
  }

  async updateUser(id: string, updates: Partial<DBUser>): Promise<DBUser | null> {
    const user = this.users.get(id);
    if (!user) return null;

    const updatedUser: DBUser = {
      ...user,
      ...updates,
      id: user.id,
      createdAt: user.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.users.set(id, updatedUser);

    if (updates.email && updates.email !== user.email) {
      this.emailIndex.delete(user.email.toLowerCase());
      this.emailIndex.set(updates.email.toLowerCase(), id);
    }

    logger.info(`[DB] Updated user: ${id}`);
    return updatedUser;
  }

  async addSocialProvider(userId: string, provider: SocialProvider): Promise<DBUser | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    const existingProviderIndex = user.socialProviders.findIndex(
      p => p.provider === provider.provider
    );

    if (existingProviderIndex >= 0) {
      user.socialProviders[existingProviderIndex] = provider;
    } else {
      user.socialProviders.push(provider);
    }

    const key = `${provider.provider}:${provider.socialId}`;
    this.socialIndex.set(key, userId);

    user.updatedAt = new Date().toISOString();
    this.users.set(userId, user);

    logger.info(`[DB] Added ${provider.provider} provider to user: ${userId}`);
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;

    // BUG FIX: Remove from all indexes to prevent stale references
    this.emailIndex.delete(user.email.toLowerCase());
    
    user.socialProviders.forEach(provider => {
      const key = `${provider.provider}:${provider.socialId}`;
      this.socialIndex.delete(key);
    });

    // BUG FIX: Clean up token indexes
    if (user.verificationToken) {
      this.verificationTokenIndex.delete(user.verificationToken);
    }
    if (user.passwordResetToken) {
      this.passwordResetTokenIndex.delete(user.passwordResetToken);
    }

    this.users.delete(id);
    logger.info(`[DB] Deleted user: ${id}`);
    return true;
  }

  async getAllUsers(): Promise<DBUser[]> {
    return Array.from(this.users.values());
  }

  async findByVerificationToken(token: string): Promise<DBUser | null> {
    const userId = this.verificationTokenIndex.get(token);
    if (!userId) return null;
    const user = this.users.get(userId);
    if (!user) return null;

    if (user.verificationTokenExpiry && new Date(user.verificationTokenExpiry) < new Date()) {
      return null;
    }

    return user;
  }

  async findByPasswordResetToken(token: string): Promise<DBUser | null> {
    const userId = this.passwordResetTokenIndex.get(token);
    if (!userId) return null;
    const user = this.users.get(userId);
    if (!user) return null;

    if (user.passwordResetTokenExpiry && new Date(user.passwordResetTokenExpiry) < new Date()) {
      return null;
    }

    return user;
  }

  async setVerificationToken(userId: string, token: string, expiryHours: number = 24): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    const expiry = new Date();
    expiry.setHours(expiry.getHours() + expiryHours);

    user.verificationToken = token;
    user.verificationTokenExpiry = expiry.toISOString();
    user.updatedAt = new Date().toISOString();

    this.users.set(userId, user);
    this.verificationTokenIndex.set(token, userId);

    logger.info(`[DB] Set verification token for user: ${userId}`);
    return true;
  }

  async setPasswordResetToken(userId: string, token: string, expiryHours: number = 1): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    const expiry = new Date();
    expiry.setHours(expiry.getHours() + expiryHours);

    user.passwordResetToken = token;
    user.passwordResetTokenExpiry = expiry.toISOString();
    user.updatedAt = new Date().toISOString();

    this.users.set(userId, user);
    this.passwordResetTokenIndex.set(token, userId);

    logger.info(`[DB] Set password reset token for user: ${userId}`);
    return true;
  }

  async verifyEmail(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    if (user.verificationToken) {
      this.verificationTokenIndex.delete(user.verificationToken);
    }

    user.verified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    user.updatedAt = new Date().toISOString();

    this.users.set(userId, user);

    logger.info(`[DB] Verified email for user: ${userId}`);
    return true;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    if (user.passwordResetToken) {
      this.passwordResetTokenIndex.delete(user.passwordResetToken);
    }

    user.passwordHash = passwordHash;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiry = undefined;
    user.updatedAt = new Date().toISOString();

    this.users.set(userId, user);

    logger.info(`[DB] Updated password for user: ${userId}`);
    return true;
  }
}

export const userDB = new UserDatabase();

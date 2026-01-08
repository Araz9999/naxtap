import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types/user';
import type { Listing } from '@/types/listing';

import { logger } from '@/utils/logger';
interface UserState {
  currentUser: User | null;
  isAuthenticated: boolean;
  favorites: string[];
  freeAdsThisMonth: number;
  lastFreeAdDate: string | null;
  walletBalance: number;
  bonusBalance: number;
  blockedUsers: string[];
  nudgeHistory: Record<string, string>; // userId -> last nudge date
  mutedUsers: string[];
  followedUsers: string[];
  favoriteUsers: string[];
  trustedUsers: string[];
  reportedUsers: string[];
  subscribedUsers: string[];
  userNotes: Record<string, string>; // userId -> note

  // ✅ Timeout tracking for cleanup
  favoriteTimeouts: Map<string, ReturnType<typeof setTimeout>>;

  // ✅ Rehydration status
  hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  login: (user: User) => void;
  logout: () => void;
  toggleFavorite: (listingId: string) => void;
  canPostFreeAd: () => boolean;
  incrementFreeAds: () => void;
  addToWallet: (amount: number) => void;
  addBonus: (amount: number) => void;
  spendFromWallet: (amount: number) => boolean;
  spendFromBonus: (amount: number) => boolean;
  spendFromBalance: (amount: number) => boolean;
  getTotalBalance: () => number;
  canAfford: (amount: number) => boolean;
  updateUserBalance: (userId: string, amount: number) => Promise<void>;
  updateUserProfile: (updates: Partial<Pick<User, 'name' | 'email' | 'phone' | 'avatar'>>) => void;
  updatePrivacySettings: (settings: Partial<User['privacySettings']>) => void;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  isUserBlocked: (userId: string) => boolean;
  canNudgeUser: (userId: string) => boolean;
  nudgeUser: (userId: string) => void;
  muteUser: (userId: string) => void;
  unmuteUser: (userId: string) => void;
  isUserMuted: (userId: string) => boolean;
  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
  isUserFollowed: (userId: string) => boolean;
  addToFavoriteUsers: (userId: string) => void;
  removeFromFavoriteUsers: (userId: string) => void;
  isUserFavorite: (userId: string) => boolean;
  trustUser: (userId: string) => void;
  untrustUser: (userId: string) => void;
  isUserTrusted: (userId: string) => boolean;
  reportUser: (userId: string, reason: string) => void;
  isUserReported: (userId: string) => boolean;
  subscribeToUser: (userId: string) => void;
  unsubscribeFromUser: (userId: string) => void;
  isSubscribedToUser: (userId: string) => boolean;
  addUserNote: (userId: string, note: string) => void;
  removeUserNote: (userId: string) => void;
  getUserNote: (userId: string) => string | null;
  deleteUserAccount: () => Promise<void>;

  // ✅ Cleanup
  cleanupTimeouts: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      favorites: [],
      freeAdsThisMonth: 0,
      lastFreeAdDate: null,
      walletBalance: 0,
      bonusBalance: 0,
      blockedUsers: [],
      nudgeHistory: {},
      mutedUsers: [],

      // ✅ Initialize timeout map (not persisted)
      favoriteTimeouts: new Map(),
      hasHydrated: false, // Start as false
      setHasHydrated: (state) => set({ hasHydrated: state }),

      followedUsers: [],
      favoriteUsers: [],
      trustedUsers: [],
      reportedUsers: [],
      subscribedUsers: [],
      userNotes: {},
      login: (user) => {
        // Ensure privacySettings has default values
        const userWithDefaults = {
          ...user,
          privacySettings: {
            ...user.privacySettings,
            hidePhoneNumber: user.privacySettings?.hidePhoneNumber ?? false,
            allowDirectContact: user.privacySettings?.allowDirectContact ?? true,
            onlyAppMessaging: user.privacySettings?.onlyAppMessaging ?? false,
          },
        };
        set({ currentUser: userWithDefaults, isAuthenticated: true });
      },
      logout: () => set({
        currentUser: null,
        isAuthenticated: false,
        freeAdsThisMonth: 0,
        lastFreeAdDate: null,
        walletBalance: 0,
        bonusBalance: 0,
        blockedUsers: [],
        nudgeHistory: {},
        mutedUsers: [],
        followedUsers: [],
        favoriteUsers: [],
        trustedUsers: [],
        reportedUsers: [],
        subscribedUsers: [],
        userNotes: {},
      }),
      toggleFavorite: (listingId) => {
        const { favorites } = get();

        // ✅ Validate listingId
        if (!listingId || typeof listingId !== 'string' || listingId.trim().length === 0) {
          logger.error('[UserStore] Invalid listingId for toggleFavorite:', listingId);
          return;
        }

        const isCurrentlyFavorite = favorites.includes(listingId);

        // Update user's favorites list first (immediate UI feedback)
        if (isCurrentlyFavorite) {
          set({ favorites: favorites.filter(id => id !== listingId) });
        } else {
          set({ favorites: [...favorites, listingId] });
        }

        // Also update the listing-level favorites counter (local real-time analytics).
        // Dynamic import avoids hard circular dependency issues (listingStore imports userStore).
        // ✅ Track timeout for cleanup
        const timeoutKey = `favorite_update_${listingId}_${Date.now()}`;
        const timeout = setTimeout(async () => {
          try {
            const listingStoreModule = await import('@/store/listingStore');
            const listingState = listingStoreModule.useListingStore.getState();
            const listing = listingState.listings.find((l: Listing) => l?.id === listingId);
            if (!listing) {
              // Remove from timeout map
              const newTimeouts = new Map(get().favoriteTimeouts);
              newTimeouts.delete(timeoutKey);
              set({ favoriteTimeouts: newTimeouts });
              return;
            }

            const currentCount = typeof listing.favorites === 'number' && isFinite(listing.favorites) ? listing.favorites : 0;
            const nextCount = Math.max(0, currentCount + (isCurrentlyFavorite ? -1 : 1));
            listingState.updateListing(listingId, { favorites: nextCount });
          } catch (err) {
            logger.error('[UserStore] Failed to update listing favorites counter:', err);
          }

          // ✅ Remove from timeout map after execution
          const newTimeouts = new Map(get().favoriteTimeouts);
          newTimeouts.delete(timeoutKey);
          set({ favoriteTimeouts: newTimeouts });
        }, 0);

        // ✅ Store timeout for cleanup
        set((state) => ({
          favoriteTimeouts: new Map(state.favoriteTimeouts).set(timeoutKey, timeout),
        }));
      },
      canPostFreeAd: () => {
        const { freeAdsThisMonth, lastFreeAdDate } = get();
        const now = new Date();
        const lastDate = lastFreeAdDate ? new Date(lastFreeAdDate) : null;

        // Reset counter if it's a new month
        if (!lastDate ||
            lastDate.getMonth() !== now.getMonth() ||
            lastDate.getFullYear() !== now.getFullYear()) {
          set({ freeAdsThisMonth: 0 });
          return true;
        }

        return freeAdsThisMonth < 3;
      },
      incrementFreeAds: () => {
        const { freeAdsThisMonth } = get();
        set({
          freeAdsThisMonth: freeAdsThisMonth + 1,
          lastFreeAdDate: new Date().toISOString(),
        });
      },
      addToWallet: (amount) => {
        // ===== VALIDATION START =====

        // 1. Check if amount is a number
        if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
          logger.error('[UserStore] Invalid amount for addToWallet:', amount);
          throw new Error('Məbləğ düzgün deyil');
        }

        // 2. Check if amount is positive
        if (amount <= 0) {
          logger.error('[UserStore] Amount must be positive:', amount);
          throw new Error('Məbləğ müsbət olmalıdır');
        }

        // 3. Check maximum single transaction (100,000 AZN)
        if (amount > 100000) {
          logger.error('[UserStore] Amount too large:', amount);
          throw new Error('Məbləğ çox böyükdür (maks 100,000 AZN)');
        }

        // 4. Check resulting balance won't overflow
        const { walletBalance } = get();
        const newBalance = walletBalance + amount;

        if (!isFinite(newBalance) || newBalance > 1000000) {
          logger.error('[UserStore] New balance would be too large:', newBalance);
          throw new Error('Maksimum balans limiti (1,000,000 AZN)');
        }

        // ===== VALIDATION END =====

        logger.info('[UserStore] Adding to wallet:', { amount, oldBalance: walletBalance, newBalance });
        set({ walletBalance: newBalance });
      },
      addBonus: (amount) => {
        // ===== VALIDATION START =====

        // 1. Check if amount is a number
        if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
          logger.error('[UserStore] Invalid amount for addBonus:', amount);
          throw new Error('Bonus məbləği düzgün deyil');
        }

        // 2. Check if amount is positive
        if (amount <= 0) {
          logger.error('[UserStore] Bonus amount must be positive:', amount);
          throw new Error('Bonus məbləği müsbət olmalıdır');
        }

        // 3. Check maximum single bonus (10,000 AZN)
        if (amount > 10000) {
          logger.error('[UserStore] Bonus amount too large:', amount);
          throw new Error('Bonus məbləği çox böyükdür (maks 10,000 AZN)');
        }

        // 4. Check resulting balance won't overflow
        const { bonusBalance } = get();
        const newBalance = bonusBalance + amount;

        if (!isFinite(newBalance) || newBalance > 100000) {
          logger.error('[UserStore] New bonus balance would be too large:', newBalance);
          throw new Error('Maksimum bonus limiti (100,000 AZN)');
        }

        // ===== VALIDATION END =====

        logger.info('[UserStore] Adding bonus:', { amount, oldBalance: bonusBalance, newBalance });
        set({ bonusBalance: newBalance });
      },
      spendFromWallet: (amount) => {
        const { walletBalance } = get();
        if (walletBalance >= amount) {
          set({ walletBalance: walletBalance - amount });
          return true;
        }
        return false;
      },
      spendFromBonus: (amount) => {
        const { bonusBalance } = get();
        if (bonusBalance >= amount) {
          set({ bonusBalance: bonusBalance - amount });
          return true;
        }
        return false;
      },
      spendFromBalance: (amount) => {
        // ✅ Validate amount
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
          logger.error('[UserStore] Invalid amount for spendFromBalance:', amount);
          return false;
        }

        const { walletBalance, bonusBalance } = get();
        const totalBalance = walletBalance + bonusBalance;

        logger.info('[UserStore] Attempting to spend:', { amount, totalBalance, walletBalance, bonusBalance });

        if (totalBalance < amount) {
          logger.warn('[UserStore] Insufficient balance:', { required: amount, available: totalBalance });
          return false;
        }

        let remainingAmount = amount;
        let newBonusBalance = bonusBalance;
        let newWalletBalance = walletBalance;

        // First spend from bonus balance
        if (bonusBalance > 0) {
          const bonusToSpend = Math.min(bonusBalance, remainingAmount);
          newBonusBalance = bonusBalance - bonusToSpend;
          remainingAmount -= bonusToSpend;

          logger.info('[UserStore] Spent from bonus:', { amount: bonusToSpend, remaining: newBonusBalance });
        }

        // Then spend from wallet balance if needed
        if (remainingAmount > 0) {
          newWalletBalance = walletBalance - remainingAmount;
          logger.info('[UserStore] Spent from wallet:', { amount: remainingAmount, remaining: newWalletBalance });
        }

        // ✅ Ensure non-negative balances
        newBonusBalance = Math.max(0, newBonusBalance);
        newWalletBalance = Math.max(0, newWalletBalance);

        // Atomically update both balances in a single set() call to avoid race conditions
        set({
          bonusBalance: newBonusBalance,
          walletBalance: newWalletBalance,
        });

        logger.info('[UserStore] Balance updated after spending:', { newBonusBalance, newWalletBalance });

        return true;
      },
      getTotalBalance: () => {
        const { walletBalance, bonusBalance } = get();
        const total = walletBalance + bonusBalance;
        return Math.max(0, total);
      },
      canAfford: (amount) => {
        // ✅ Validate amount
        if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
          logger.error('[UserStore] Invalid amount for canAfford:', amount);
          return false;
        }

        const { walletBalance, bonusBalance } = get();
        const totalBalance = walletBalance + bonusBalance;
        return totalBalance >= amount;
      },
      updateUserBalance: async (userId, amount) => {
        const { currentUser } = get();
        if (currentUser && currentUser.id === userId) {
          const newBalance = Math.max(0, currentUser.balance + amount);
          set({
            currentUser: { ...currentUser, balance: newBalance },
          });
        }
      },
      updateUserProfile: (updates) => {
        // ===== VALIDATION START =====

        // ✅ 1. Check if updates is an object
        if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
          logger.error('[UserStore] Invalid updates object');
          throw new Error('Yeniləmələr düzgün deyil');
        }

        // ✅ 2. Validate allowed keys only
        const allowedKeys = ['name', 'email', 'phone', 'avatar'];
        const invalidKeys = Object.keys(updates).filter(key => !allowedKeys.includes(key));

        if (invalidKeys.length > 0) {
          logger.warn('[UserStore] Invalid profile update keys:', invalidKeys);
          throw new Error(`Yanlış sahə: ${invalidKeys.join(', ')}`);
        }

        // ✅ 3. Validate name
        if ('name' in updates) {
          const name = updates.name;
          if (typeof name !== 'string') {
            throw new Error('Ad mətn olmalıdır');
          }

          const trimmedName = name.trim();
          if (trimmedName.length < 2) {
            throw new Error('Ad ən azı 2 simvol olmalıdır');
          }
          if (trimmedName.length > 100) {
            throw new Error('Ad maksimum 100 simvol ola bilər');
          }

          updates.name = trimmedName;
        }

        // ✅ 4. Validate email
        if ('email' in updates) {
          const email = updates.email;
          if (typeof email !== 'string') {
            throw new Error('Email mətn olmalıdır');
          }

          const trimmedEmail = email.trim().toLowerCase();
          const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

          if (!emailRegex.test(trimmedEmail)) {
            throw new Error('Email formatı düzgün deyil');
          }
          if (trimmedEmail.length > 255) {
            throw new Error('Email maksimum 255 simvol ola bilər');
          }

          updates.email = trimmedEmail;
        }

        // ✅ 5. Validate phone
        if ('phone' in updates) {
          const phone = updates.phone;
          if (typeof phone !== 'string') {
            throw new Error('Telefon mətn olmalıdır');
          }

          const cleanedPhone = phone.replace(/[^\d+]/g, '');
          if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
            throw new Error('Telefon nömrəsi 10-15 rəqəm olmalıdır');
          }

          updates.phone = cleanedPhone;
        }

        // ✅ 6. Validate avatar
        if ('avatar' in updates) {
          const avatar = updates.avatar;
          if (typeof avatar !== 'string') {
            throw new Error('Avatar URL mətn olmalıdır');
          }

          const trimmedAvatar = avatar.trim();
          if (trimmedAvatar.length > 500) {
            throw new Error('Avatar URL çox uzundur');
          }

          // Basic URL validation
          try {
            new URL(trimmedAvatar);
          } catch {
            throw new Error('Avatar URL düzgün deyil');
          }

          updates.avatar = trimmedAvatar;
        }

        // ✅ 7. Check if user is logged in
        const { currentUser } = get();
        if (!currentUser) {
          logger.error('[UserStore] No user logged in');
          throw new Error('İstifadəçi daxil olmayıb');
        }

        // ===== VALIDATION END =====

        logger.info('[UserStore] Updating user profile:', Object.keys(updates));

        set({
          currentUser: {
            ...currentUser,
            ...updates,
          },
        });
      },
      updatePrivacySettings: (settings) => {
        // ===== VALIDATION START =====

        // ✅ 1. Check if settings is an object
        if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
          logger.error('[UserStore] Invalid settings object');
          throw new Error('Tənzimləmələr düzgün deyil');
        }

        // ✅ 2. Validate allowed keys only
        const allowedKeys = ['hidePhoneNumber', 'allowDirectContact', 'onlyAppMessaging'];
        const nextSettings: Partial<User['privacySettings']> = { ...settings };
        const invalidKeys = Object.keys(nextSettings).filter(key => !allowedKeys.includes(key));

        if (invalidKeys.length > 0) {
          logger.warn('[UserStore] Invalid privacy settings keys:', invalidKeys);
          // Remove invalid keys
          invalidKeys.forEach((key) => {
            delete (nextSettings as Record<string, unknown>)[key];
          });
        }

        // ✅ 3. Validate values are booleans
        for (const key of Object.keys(nextSettings)) {
          const value = (nextSettings as Record<string, unknown>)[key];
          if (typeof value !== 'boolean') {
            logger.error('[UserStore] Privacy setting value must be boolean:', key, value);
            throw new Error(`Tənzimləmə dəyəri yanlışdır: ${key}`);
          }
        }

        // ✅ 4. Check conflicting settings
        if ('onlyAppMessaging' in nextSettings && 'allowDirectContact' in nextSettings) {
          if (nextSettings.onlyAppMessaging === true && nextSettings.allowDirectContact === true) {
            logger.warn('[UserStore] Conflicting privacy settings: both onlyAppMessaging and allowDirectContact are true');
            // Resolve conflict: onlyAppMessaging takes precedence
            nextSettings.allowDirectContact = false;
          }
        }

        // ✅ 5. Check if user is logged in
        const { currentUser } = get();
        if (!currentUser) {
          logger.error('[UserStore] No user logged in');
          throw new Error('İstifadəçi daxil olmayıb');
        }

        // ===== VALIDATION END =====

        logger.info('[UserStore] Updating privacy settings:', settings);

        set({
          currentUser: {
            ...currentUser,
            privacySettings: {
              ...currentUser.privacySettings,
              ...nextSettings,
            },
          },
        });
      },
      blockUser: (userId) => {
        // ✅ Comprehensive validation
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
          logger.error('[UserStore] Invalid userId for blocking');
          throw new Error('İstifadəçi ID-si yanlışdır');
        }

        // ✅ Check if user is authenticated
        const { currentUser } = get();
        if (!currentUser || !currentUser.id) {
          logger.error('[UserStore] User not authenticated');
          throw new Error('Hesaba daxil olmamısınız');
        }

        // ✅ Don't allow blocking yourself
        if (currentUser.id === userId) {
          logger.error('[UserStore] Cannot block yourself');
          throw new Error('Özünüzü blok edə bilməzsiniz');
        }

        const { blockedUsers } = get();

        // ✅ Check if already blocked
        if (blockedUsers.includes(userId)) {
          logger.warn('[UserStore] User already blocked:', userId);
          throw new Error('İstifadəçi artıq blok edilib');
        }

        // ✅ Add to blocked users
        set({ blockedUsers: [...blockedUsers, userId] });
        logger.info('[UserStore] User blocked:', userId);
      },
      unblockUser: (userId) => {
        // ✅ Comprehensive validation
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
          logger.error('[UserStore] Invalid userId for unblocking');
          throw new Error('İstifadəçi ID-si yanlışdır');
        }

        // ✅ Check if user is authenticated
        const { currentUser } = get();
        if (!currentUser || !currentUser.id) {
          logger.error('[UserStore] User not authenticated');
          throw new Error('Hesaba daxil olmamısınız');
        }

        const { blockedUsers } = get();

        // ✅ Check if user is actually blocked
        if (!blockedUsers.includes(userId)) {
          logger.warn('[UserStore] User is not blocked:', userId);
          throw new Error('İstifadəçi blok edilməyib');
        }

        // ✅ Remove from blocked users
        set({ blockedUsers: blockedUsers.filter(id => id !== userId) });
        logger.info('[UserStore] User unblocked:', userId);
      },
      isUserBlocked: (userId) => {
        // ✅ Validate userId
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
          logger.error('[UserStore] Invalid userId for isUserBlocked check');
          return false;
        }

        const { blockedUsers } = get();

        // ✅ Validate blockedUsers array
        if (!Array.isArray(blockedUsers)) {
          logger.error('[UserStore] Invalid blockedUsers array');
          return false;
        }

        return blockedUsers.includes(userId);
      },
      canNudgeUser: (userId) => {
        const { nudgeHistory } = get();
        const lastNudge = nudgeHistory[userId];
        if (!lastNudge) return true;

        const lastNudgeDate = new Date(lastNudge);
        const now = new Date();
        const diffInHours = (now.getTime() - lastNudgeDate.getTime()) / (1000 * 60 * 60);

        return diffInHours >= 24; // Can nudge once per day
      },
      nudgeUser: (userId) => {
        const { nudgeHistory } = get();
        set({
          nudgeHistory: {
            ...nudgeHistory,
            [userId]: new Date().toISOString(),
          },
        });
      },
      muteUser: (userId) => {
        // ✅ Validate userId
        if (!userId || typeof userId !== 'string' || userId.trim() === '') {
          logger.error('[UserStore] Invalid userId for mute:', userId);
          return;
        }

        // ✅ Prevent self-mute
        const { currentUser, mutedUsers } = get();
        if (currentUser?.id === userId) {
          logger.warn('[UserStore] Cannot mute yourself');
          return;
        }

        if (!mutedUsers.includes(userId)) {
          set({ mutedUsers: [...mutedUsers, userId] });
          logger.info('[UserStore] User muted:', userId);
        } else {
          logger.debug('[UserStore] User already muted:', userId);
        }
      },
      unmuteUser: (userId) => {
        // ✅ Validate userId
        if (!userId || typeof userId !== 'string') {
          logger.error('[UserStore] Invalid userId for unmute:', userId);
          return;
        }

        const { mutedUsers } = get();
        const wasMuted = mutedUsers.includes(userId);

        set({ mutedUsers: mutedUsers.filter(id => id !== userId) });

        if (wasMuted) {
          logger.info('[UserStore] User unmuted:', userId);
        }
      },
      isUserMuted: (userId) => {
        const { mutedUsers } = get();
        return mutedUsers.includes(userId);
      },
      followUser: (userId) => {
        // ✅ Validate userId
        if (!userId || typeof userId !== 'string' || userId.trim() === '') {
          logger.error('[UserStore] Invalid userId for follow:', userId);
          return;
        }

        // ✅ Prevent self-follow
        const { currentUser, followedUsers } = get();
        if (currentUser?.id === userId) {
          logger.warn('[UserStore] Cannot follow yourself');
          return;
        }

        if (!followedUsers.includes(userId)) {
          set({ followedUsers: [...followedUsers, userId] });
          logger.info('[UserStore] User followed:', userId);
        } else {
          logger.debug('[UserStore] Already following user:', userId);
        }
      },
      unfollowUser: (userId) => {
        // ✅ Validate userId
        if (!userId || typeof userId !== 'string') {
          logger.error('[UserStore] Invalid userId for unfollow:', userId);
          return;
        }

        const { followedUsers } = get();
        const wasFollowing = followedUsers.includes(userId);

        set({ followedUsers: followedUsers.filter(id => id !== userId) });

        if (wasFollowing) {
          logger.info('[UserStore] User unfollowed:', userId);
        }
      },
      isUserFollowed: (userId) => {
        const { followedUsers } = get();
        return followedUsers.includes(userId);
      },
      addToFavoriteUsers: (userId) => {
        // ✅ Validate userId
        if (!userId || typeof userId !== 'string' || userId.trim() === '') {
          logger.error('[UserStore] Invalid userId for favorite:', userId);
          return;
        }

        const { favoriteUsers } = get();
        if (!favoriteUsers.includes(userId)) {
          set({ favoriteUsers: [...favoriteUsers, userId] });
          logger.info('[UserStore] User added to favorites:', userId);
        } else {
          logger.debug('[UserStore] User already in favorites:', userId);
        }
      },
      removeFromFavoriteUsers: (userId) => {
        // ✅ Validate userId
        if (!userId || typeof userId !== 'string') {
          logger.error('[UserStore] Invalid userId for unfavorite:', userId);
          return;
        }

        const { favoriteUsers } = get();
        const wasFavorite = favoriteUsers.includes(userId);

        set({ favoriteUsers: favoriteUsers.filter(id => id !== userId) });

        if (wasFavorite) {
          logger.info('[UserStore] User removed from favorites:', userId);
        }
      },
      isUserFavorite: (userId) => {
        const { favoriteUsers } = get();
        return favoriteUsers.includes(userId);
      },
      trustUser: (userId) => {
        // ✅ Validate userId
        if (!userId || typeof userId !== 'string' || userId.trim() === '') {
          logger.error('[UserStore] Invalid userId for trust:', userId);
          return;
        }

        const { trustedUsers } = get();
        if (!trustedUsers.includes(userId)) {
          set({ trustedUsers: [...trustedUsers, userId] });
          logger.info('[UserStore] User trusted:', userId);
        } else {
          logger.debug('[UserStore] User already trusted:', userId);
        }
      },
      untrustUser: (userId) => {
        // ✅ Validate userId
        if (!userId || typeof userId !== 'string') {
          logger.error('[UserStore] Invalid userId for untrust:', userId);
          return;
        }

        const { trustedUsers } = get();
        const wasTrusted = trustedUsers.includes(userId);

        set({ trustedUsers: trustedUsers.filter(id => id !== userId) });

        if (wasTrusted) {
          logger.info('[UserStore] User untrusted:', userId);
        }
      },
      isUserTrusted: (userId) => {
        const { trustedUsers } = get();
        return trustedUsers.includes(userId);
      },
      reportUser: (userId, reason) => {
        // ✅ Validate inputs
        if (!userId || typeof userId !== 'string' || userId.trim() === '') {
          logger.error('[UserStore] Invalid userId for report:', userId);
          return;
        }

        if (!reason || typeof reason !== 'string' || reason.trim() === '') {
          logger.error('[UserStore] Invalid reason for report');
          return;
        }

        const { reportedUsers } = get();
        if (!reportedUsers.includes(userId)) {
          set({ reportedUsers: [...reportedUsers, userId] });
          logger.info(`[UserStore] User ${userId} reported for: ${reason}`);
        } else {
          logger.debug('[UserStore] User already reported:', userId);
        }
      },
      isUserReported: (userId) => {
        const { reportedUsers } = get();
        return reportedUsers.includes(userId);
      },
      subscribeToUser: (userId) => {
        // ✅ Validate userId
        if (!userId || typeof userId !== 'string' || userId.trim() === '') {
          logger.error('Invalid userId for subscription:', userId);
          return;
        }

        const { subscribedUsers, currentUser } = get();

        // ✅ Prevent self-subscription
        if (currentUser?.id === userId) {
          logger.warn('Cannot subscribe to yourself');
          return;
        }

        if (!subscribedUsers.includes(userId)) {
          set({ subscribedUsers: [...subscribedUsers, userId] });
          logger.debug('Subscribed to user:', userId);

          // ✅ Add notification to inform user
          void import('./notificationStore')
            .then(({ useNotificationStore }) => {
              const { addNotification } = useNotificationStore.getState();
              addNotification({
                type: 'general',
                title: 'Abunəlik uğurlu',
                message: 'İstifadəçiyə abunə oldunuz. Onların yeni elanlarından xəbərdar olacaqsınız.',
                data: { subscribedUserId: userId },
              });
            })
            .catch((error) => {
              logger.debug('Could not send subscription notification:', error);
            });
        } else {
          logger.debug('Already subscribed to user:', userId);
        }
      },
      unsubscribeFromUser: (userId) => {
        // ✅ Validate userId
        if (!userId || typeof userId !== 'string') {
          logger.error('Invalid userId for unsubscription:', userId);
          return;
        }

        const { subscribedUsers } = get();
        const wasSubscribed = subscribedUsers.includes(userId);

        set({ subscribedUsers: subscribedUsers.filter(id => id !== userId) });

        if (wasSubscribed) {
          logger.debug('Unsubscribed from user:', userId);
        }
      },
      isSubscribedToUser: (userId) => {
        // ✅ Validate userId
        if (!userId || typeof userId !== 'string') {
          return false;
        }

        const { subscribedUsers } = get();
        return subscribedUsers.includes(userId);
      },
      addUserNote: (userId, note) => {
        // ✅ Validate inputs
        if (!userId || typeof userId !== 'string' || userId.trim() === '') {
          logger.error('[UserStore] Invalid userId for note:', userId);
          return;
        }

        if (!note || typeof note !== 'string' || note.trim() === '') {
          logger.error('[UserStore] Invalid note content');
          return;
        }

        const { userNotes } = get();
        set({
          userNotes: {
            ...userNotes,
            [userId]: note.trim(),
          },
        });
        logger.info('[UserStore] Note added for user:', userId);
      },
      removeUserNote: (userId) => {
        // ✅ Validate userId
        if (!userId || typeof userId !== 'string') {
          logger.error('[UserStore] Invalid userId for note removal:', userId);
          return;
        }

        const { userNotes } = get();
        if (userNotes[userId]) {
          const newNotes = { ...userNotes };
          delete newNotes[userId];
          set({ userNotes: newNotes });
          logger.info('[UserStore] Note removed for user:', userId);
        }
      },
      getUserNote: (userId) => {
        // ✅ Validate userId
        if (!userId || typeof userId !== 'string') {
          return null;
        }

        const { userNotes } = get();
        return userNotes[userId] || null;
      },
      deleteUserAccount: async () => {
        // ✅ Validate current user exists
        const { currentUser, isAuthenticated } = get();

        if (!isAuthenticated || !currentUser) {
          logger.error('[deleteUserAccount] User not authenticated');
          throw new Error('User not authenticated');
        }

        logger.debug('[deleteUserAccount] Deleting user account:', currentUser.id);

        try {
          // ✅ Clear all user data from store
          set({
            currentUser: null,
            isAuthenticated: false,
            favorites: [],
            freeAdsThisMonth: 0,
            lastFreeAdDate: null,
            walletBalance: 0,
            bonusBalance: 0,
            blockedUsers: [],
            nudgeHistory: {},
            mutedUsers: [],
            followedUsers: [],
            favoriteUsers: [],
            trustedUsers: [],
            reportedUsers: [],
            subscribedUsers: [],
            userNotes: {},
          });

          logger.debug('[deleteUserAccount] User data cleared from store');
        } catch (error) {
          logger.error('[deleteUserAccount] Error clearing user data:', error);
          throw error;
        }
      },

      // ✅ Cleanup all pending timeouts
      cleanupTimeouts: () => {
        const { favoriteTimeouts } = get();

        try {
          favoriteTimeouts.forEach((timeout) => clearTimeout(timeout));
        } catch (error) {
          logger.debug('[UserStore] cleanupTimeouts encountered an error:', error);
        }

        set({
          favoriteTimeouts: new Map(),
        });

        logger.debug('[UserStore] Timeouts cleaned up');
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // ✅ Don't persist timeout map
      partialize: (state) => {
        const { favoriteTimeouts, ...rest } = state;
        return rest;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

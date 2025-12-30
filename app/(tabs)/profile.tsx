import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/constants/translations';
import { useUserStore } from '@/store/userStore';
import { useListingStore } from '@/store/listingStore';
import { useStoreStore } from '@/store/storeStore';
import Colors from '@/constants/colors';
import { users } from '@/mocks/users';
import { Star, LogOut, Heart, Settings, Bell, HelpCircle, Shield, Package, MessageCircle, ChevronRight, Wallet, Store, Trash2, Headphones, User as UserIcon } from 'lucide-react-native';
import LiveChatWidget from '@/components/LiveChatWidget';
import { authService } from '@/services/authService';
import { useSupportStore } from '@/store/supportStore';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '@/lib/trpc';

import { logger } from '@/utils/logger';
export default function ProfileScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { isAuthenticated, logout, favorites, freeAdsThisMonth, walletBalance, bonusBalance, currentUser, updateUserProfile } = useUserStore(); // ✅ Get real currentUser
  const { listings } = useListingStore();
  const { getUserStore } = useStoreStore();
  const { liveChats, getAvailableOperators } = useSupportStore();

  const [showLiveChat, setShowLiveChat] = React.useState<boolean>(false);
  const [isDeletingAccount, setIsDeletingAccount] = React.useState<boolean>(false); // ✅ Loading state
  const [isUpdatingAvatar, setIsUpdatingAvatar] = React.useState<boolean>(false);

  const updateMeMutation = trpc.user.updateMe.useMutation();

  // ✅ Use real currentUser from useUserStore (not mock data)
  const userStore = currentUser ? getUserStore(currentUser.id) : null;

  // Get user's active chats for live support
  const userChats = isAuthenticated ? liveChats.filter(chat =>
    chat.userId === currentUser?.id && chat.status !== 'closed'
  ) : [];
  const availableOperators = getAvailableOperators();
  const hasActiveChat = userChats.length > 0;

  const favoriteListings = listings.filter(listing => favorites.includes(listing.id));
  // Safely build userListings only when currentUser exists to avoid accessing .id on null
  const userListings = currentUser ? listings.filter(listing => listing.userId === currentUser.id) : [];

  const handleLogin = () => {
    router.push('/auth/login');
  };

  const handleLogout = () => {
    // Best-effort cleanup so protected requests don't use stale tokens
    AsyncStorage.removeItem('auth_tokens').catch(() => {});
    logout();
    router.push('/auth/login');
  };

  const handleDeleteProfile = () => {
    // ✅ Validate user is authenticated
    if (!isAuthenticated || !currentUser) {
      logger.error('[handleDeleteProfile] User not authenticated');
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Hesaba daxil olmamısınız' : 'Вы не авторизованы'
      );
      return;
    }

    // ✅ Check if deletion is already in progress
    if (isDeletingAccount) {
      logger.warn('[handleDeleteProfile] Deletion already in progress');
      return;
    }

    // ✅ Gather user data for detailed confirmation
    const activeListingsCount = userListings.filter(l => !l.deletedAt).length;
    const totalBalance = (typeof walletBalance === 'number' && isFinite(walletBalance) ? walletBalance : 0);
    const totalBonus = (typeof bonusBalance === 'number' && isFinite(bonusBalance) ? bonusBalance : 0);

    logger.debug('[handleDeleteProfile] Delete profile button pressed', {
      userId: currentUser.id,
      activeListings: activeListingsCount,
      walletBalance: totalBalance,
      bonusBalance: totalBonus,
      hasStore: !!userStore,
    });

    // ✅ First confirmation with actual user data
    Alert.alert(
      t('deleteProfile'),
      language === 'az'
        ? `Profilinizi silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.\n\nSilinəcək:\n• ${activeListingsCount} elanınız\n• Bütün mesajlarınız\n• ${totalBalance.toFixed(2)} AZN balans\n• ${totalBonus.toFixed(2)} AZN bonus\n• ${userStore ? '1 mağazanız' : 'Heç bir mağaza yoxdur'}\n• Bütün şəxsi məlumatlarınız`
        : `Вы уверены, что хотите удалить свой профиль? Это действие нельзя отменить.\n\nБудет удалено:\n• ${activeListingsCount} объявлений\n• Все ваши сообщения\n• ${totalBalance.toFixed(2)} AZN баланс\n• ${totalBonus.toFixed(2)} AZN бонус\n• ${userStore ? '1 магазин' : 'Нет магазинов'}\n• Все личные данные`,
      [
        {
          text: t('cancel'),
          style: 'cancel',
          onPress: () => logger.debug('[handleDeleteProfile] First confirmation cancelled')
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            logger.debug('[handleDeleteProfile] First confirmation accepted, showing second confirmation');

            // ✅ Second confirmation with delay
            setTimeout(() => {
              Alert.alert(
                t('confirmDelete'),
                language === 'az'
                  ? 'SON XƏBƏRDARLIQ!\n\nBu əməliyyatı geri qaytarmaq MÜMKÜN DEYİL!\n\nBütün məlumatlarınız DAİMİ OLARAQ silinəcək.'
                  : 'ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ!\n\nЭто действие НЕВОЗМОЖНО отменить!\n\nВсе ваши данные будут НАВСЕГДА удалены.',
                [
                  {
                    text: t('cancel'),
                    style: 'cancel',
                    onPress: () => logger.debug('[handleDeleteProfile] Second confirmation cancelled')
                  },
                  {
                    text: language === 'az' ? 'Bəli, profilimi sil' : 'Да, удалить мой профиль',
                    style: 'destructive',
                    onPress: async () => {
                      logger.debug('[handleDeleteProfile] Profile deletion confirmed, starting deletion process');

                      // ✅ Set loading state
                      setIsDeletingAccount(true);

                      try {
                        // ✅ Validate auth service availability
                        if (!authService || typeof authService.deleteAccount !== 'function') {
                          throw new Error('Auth service not available');
                        }

                        logger.debug('[handleDeleteProfile] Calling authService.deleteAccount()');
                        await authService.deleteAccount();

                        logger.debug('[handleDeleteProfile] Account deleted, calling logout');
                        logout();

                        logger.debug('[handleDeleteProfile] Logout successful, showing success message');

                        Alert.alert(
                          t('success'),
                          language === 'az' ? 'Profiliniz uğurla silindi. Sizi görməyə ümid edirik!' : 'Ваш профиль успешно удален. Надеемся увидеть вас снова!',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                logger.debug('[handleDeleteProfile] Navigating to login screen');
                                router.replace('/auth/login');
                              }
                            }
                          ],
                          { cancelable: false }
                        );
                      } catch (error) {
                        logger.error('[handleDeleteProfile] Error during profile deletion:', error);

                        // ✅ Provide specific error messages
                        let errorMessage = language === 'az'
                          ? 'Profil silinərkən xəta baş verdi'
                          : 'Произошла ошибка при удалении профиля';

                        if (error instanceof Error) {
                          if (error.message.includes('authenticated')) {
                            errorMessage = language === 'az'
                              ? 'Sessiya bitib. Zəhmət olmasa yenidən daxil olun.'
                              : 'Сессия истекла. Пожалуйста, войдите снова.';
                          } else if (error.message.includes('network') || error.message.includes('fetch')) {
                            errorMessage = language === 'az'
                              ? 'Şəbəkə xətası. İnternet bağlantınızı yoxlayın.'
                              : 'Ошибка сети. Проверьте подключение к интернету.';
                          }
                        }

                        Alert.alert(
                          t('error'),
                          errorMessage
                        );
                      } finally {
                        // ✅ Always reset loading state
                        setIsDeletingAccount(false);
                      }
                    },
                  },
                ]
              );
            }, 300);
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    // ✅ Validate date string
    if (!dateString || typeof dateString !== 'string') {
      logger.warn('[formatDate] Invalid date string:', dateString);
      return language === 'az' ? 'Tarix yoxdur' : 'Дата отсутствует';
    }

    try {
      const date = new Date(dateString);

      // ✅ Check if date is valid
      if (isNaN(date.getTime())) {
        logger.warn('[formatDate] Invalid date:', dateString);
        return language === 'az' ? 'Yanlış tarix' : 'Неверная дата';
      }

      const month = date.toLocaleString(language === 'az' ? 'az-AZ' : 'ru-RU', { month: 'long' });
      const year = date.getFullYear();

      // ✅ Validate year is reasonable
      if (year < 2000 || year > 2100) {
        logger.warn('[formatDate] Suspicious year:', year);
        return language === 'az' ? 'Yanlış tarix' : 'Неверная дата';
      }

      return language === 'az'
        ? `${month} ${year}`
        : `${month} ${year}`;
    } catch (error) {
      logger.error('[formatDate] Error formatting date:', error);
      return language === 'az' ? 'Tarix xətası' : 'Ошибка даты';
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authTitle}>
          {t('loginToAccessProfile')}
        </Text>
        <TouchableOpacity
          style={styles.authButton}
          onPress={handleLogin}
        >
          <Text style={styles.authButtonText}>
            {t('login')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const applyAvatar = async (uri: string) => {
    try {
      setIsUpdatingAvatar(true);
      updateUserProfile({ avatar: uri });

      // Try to persist on backend if we have auth tokens (login flow sets them)
      await updateMeMutation.mutateAsync({ avatar: uri });
    } catch (error) {
      logger.error('[applyAvatar] Failed to update avatar:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Profil şəkli yenilənmədi' : 'Не удалось обновить фото профиля'
      );
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const pickAvatarFromGallery = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            t('permissionRequired'),
            t('galleryPermissionRequired')
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await applyAvatar(result.assets[0].uri);
      }
    } catch (error) {
      logger.error('[pickAvatarFromGallery] Error:', error);
      Alert.alert(
        t('error'),
        language === 'az' ? 'Şəkil seçilə bilmədi' : 'Не удалось выбрать изображение'
      );
    }
  };

  const pickAvatarFromCamera = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert(
          t('error'),
          language === 'az' ? 'Kamera veb versiyada dəstəklənmir' : 'Камера не поддерживается в веб-версии'
        );
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('permissionRequired'),
          t('cameraPermissionRequired')
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await applyAvatar(result.assets[0].uri);
      }
    } catch (error) {
      logger.error('[pickAvatarFromCamera] Error:', error);
      Alert.alert(
        t('error'),
        language === 'az' ? 'Kamera açıla bilmədi' : 'Не удалось открыть камеру'
      );
    }
  };

  const handleAvatarPress = async () => {
    try {
      Alert.alert(
        t('profilePhoto'),
        t('howToAddPhoto'),
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('camera'),
            onPress: () => pickAvatarFromCamera(),
          },
          {
            text: t('gallery'),
            onPress: () => pickAvatarFromGallery(),
          }
        ]
      );
    } catch (error) {
      logger.error('[handleAvatarPress] Error:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Bir xəta baş verdi' : 'Произошла ошибка'
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {currentUser && (
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.7}>
            <View>
              <Image
                source={{ uri: currentUser.avatar || 'https://placehold.co/100x100?text=Avatar' }}
                style={{ width: 50, height: 50, borderRadius: 25, opacity: isUpdatingAvatar ? 0.6 : 1 }}
              />
              {isUpdatingAvatar && (
                <View style={{ position: 'absolute', left: 0, top: 0, width: 50, height: 50, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        {currentUser && (
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{currentUser.name}</Text>
            <View style={styles.ratingContainer}>
              <Star size={16} color={Colors.secondary} fill={Colors.secondary} />
              <Text style={styles.rating}>{currentUser.rating}</Text>
            </View>
            <Text style={styles.memberSince}>
              {t('memberSince')} {formatDate(currentUser.memberSince)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userListings.length}</Text>
          <Text style={styles.statLabel}>
            {t('listings')}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{favoriteListings.length}</Text>
          <Text style={styles.statLabel}>
            {t('favorites')}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{3 - freeAdsThisMonth}</Text>
          <Text style={styles.statLabel}>
            {t('freeAds')}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/profile/edit')}
        >
          <View style={styles.menuIconContainer}>
            <UserIcon size={20} color={Colors.primary} />
          </View>
          <Text style={styles.menuItemText}>
            {language === 'az' ? 'Profili redaktə et' : 'Редактировать профиль'}
          </Text>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/wallet')}
        >
          <View style={styles.menuIconContainer}>
            <Wallet size={20} color={Colors.primary} />
          </View>
          <View style={styles.walletInfo}>
            <Text style={styles.menuItemText}>
              {t('wallet')}
            </Text>
            <Text style={styles.walletBalance}>
              {(typeof walletBalance === 'number' && isFinite(walletBalance) ? walletBalance : 0).toFixed(2)} AZN + {(typeof bonusBalance === 'number' && isFinite(bonusBalance) ? bonusBalance : 0).toFixed(2)} AZN bonus
            </Text>
          </View>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/my-listings')}
        >
          <View style={styles.menuIconContainer}>
            <Package size={20} color={Colors.primary} />
          </View>
          <Text style={styles.menuItemText}>
            {t('myListings')}
          </Text>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/favorites')}
        >
          <View style={styles.menuIconContainer}>
            <Heart size={20} color={Colors.primary} />
          </View>
          <Text style={styles.menuItemText}>
            {t('favorites')}
          </Text>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/store-management')}
        >
          <View style={styles.menuIconContainer}>
            <Store size={20} color={Colors.primary} />
          </View>
          <View style={styles.storeMenuInfo}>
            <Text style={styles.menuItemText}>
              {t('createStore')}
            </Text>
            {userStore && (
              <Text style={styles.storeStatus}>
                {userStore.adsUsed}/{userStore.maxAds} {t('listings').toLowerCase()}
              </Text>
            )}
          </View>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            logger.debug('Navigating to messages from profile');
            router.push('/(tabs)/messages');
          }}
        >
          <View style={styles.menuIconContainer}>
            <MessageCircle size={20} color={Colors.primary} />
          </View>
          <Text style={styles.menuItemText}>
            {t('messages')}
          </Text>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/live-chat')}
        >
          <View style={styles.menuIconContainer}>
            <Headphones size={20} color={Colors.primary} />
          </View>
          <Text style={styles.menuItemText}>
            {t('liveSupport')}
          </Text>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconContainer}>
            <Bell size={20} color={Colors.primary} />
          </View>
          <Text style={styles.menuItemText}>
            {t('notifications')}
          </Text>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/about')}
        >
          <View style={styles.menuIconContainer}>
            <HelpCircle size={20} color={Colors.primary} />
          </View>
          <Text style={styles.menuItemText}>
            {t('about')}
          </Text>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/settings')}
        >
          <View style={styles.menuIconContainer}>
            <Settings size={20} color={Colors.primary} />
          </View>
          <Text style={styles.menuItemText}>
            {t('settings')}
          </Text>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.menuItem,
            { borderBottomWidth: 0 },
            isDeletingAccount && styles.menuItemDisabled
          ]}
          onPress={handleDeleteProfile}
          activeOpacity={0.7}
          testID="delete-profile-button"
          disabled={isDeletingAccount}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            {isDeletingAccount ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <Trash2 size={20} color={Colors.error} />
            )}
          </View>
          <Text style={[styles.menuItemText, { color: Colors.error }]}>
            {isDeletingAccount
              ? (language === 'az' ? 'Silinir...' : 'Удаление...')
              : t('deleteProfile')
            }
          </Text>
          {!isDeletingAccount && <ChevronRight size={20} color={Colors.error} />}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color={Colors.error} />
        <Text style={styles.logoutText}>
          {t('logout')}
        </Text>
      </TouchableOpacity>

      <LiveChatWidget
        visible={showLiveChat}
        onClose={() => setShowLiveChat(false)}
        chatId={hasActiveChat && userChats.length > 0 ? userChats[0].id : undefined}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 4,
  },
  memberSince: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    marginTop: 1,
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  section: {
    marginTop: 20,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  walletInfo: {
    flex: 1,
  },
  walletBalance: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  storeMenuInfo: {
    flex: 1,
  },
  storeStatus: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  liveChatInfo: {
    flex: 1,
  },
  activeChatStatus: {
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
    fontWeight: '500',
  },
  operatorStatus: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 40,
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.error,
    marginLeft: 8,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authTitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: Colors.text,
  },
  authButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

// setIsDeletingAccount is implemented via React.useState above

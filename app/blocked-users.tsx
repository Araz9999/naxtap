import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { UserCheck, ArrowLeft } from 'lucide-react-native';
import { useUserStore } from '@/store/userStore';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { getColors } from '@/constants/colors';
import { users } from '@/mocks/users';
import { logger } from '@/utils/logger';

// --- STYLES (Defined once at the top) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userLocation: {
    fontSize: 14,
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unblockText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  unblockButtonDisabled: {
    opacity: 0.5,
  },
  backToSettingsButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToSettingsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function BlockedUsersScreen() {
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { blockedUsers, unblockUser, currentUser, isAuthenticated } = useUserStore();
  const colors = getColors(themeMode, colorTheme);

  const [isUnblocking, setIsUnblocking] = useState<string | null>(null);

  // ... (useEffect and texts object remain the same) ...
  React.useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      logger.error('[BlockedUsersScreen] User not authenticated');
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Hesaba daxil olmalısınız' : 'Вы должны войти в систему',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    }
  }, [isAuthenticated, currentUser, language]);

  const texts = {
    az: {
      title: 'Blok edilmiş istifadəçilər',
      noBlockedUsers: 'Blok edilmiş istifadəçi yoxdur',
      noBlockedUsersDesc: 'Hələ heç bir istifadəçini blok etməmisiniz. Geri qayıdıb ayarlardan istifadəçiləri blok edə bilərsiniz.',
      unblock: 'Blokdan çıxar',
      unblockConfirm: 'Bu istifadəçini blokdan çıxarmaq istədiyinizə əminsinizmi?',
      unblockSuccess: 'İstifadəçi blokdan çıxarıldı',
      yes: 'Bəli',
      no: 'Xeyr',
      goBack: 'Geri qayıt',
    },
    ru: {
      title: 'Заблокированные пользователи',
      noBlockedUsers: 'Нет заблокированных пользователей',
      noBlockedUsersDesc: 'Вы еще не заблокировали ни одного пользователя. Вы можете вернуться и заблокировать пользователей в настройках.',
      unblock: 'Разблокировать',
      unblockConfirm: 'Вы уверены, что хотите разблокировать этого пользователя?',
      unblockSuccess: 'Пользователь разблокирован',
      yes: 'Да',
      no: 'Нет',
      goBack: 'Назад',
    },
  };

  const t = texts[language];

  const blockedUsersList = React.useMemo(() => {
    if (!Array.isArray(blockedUsers)) {
      logger.error('[BlockedUsersScreen] Invalid blockedUsers array');
      return [];
    }
    return users.filter(user => user && typeof user.id === 'string' && blockedUsers.includes(user.id));
  }, [blockedUsers]);

  // ... (handleUnblock function remains the same) ...
  const handleUnblock = async (userId: string, userName: string) => {
    if (!isAuthenticated || !currentUser) {
      Alert.alert(language === 'az' ? 'Xəta' : 'Ошибка', language === 'az' ? 'Hesaba daxil olmamısınız' : 'Вы не авторизованы');
      return;
    }
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      logger.error('[BlockedUsersScreen] Invalid userId for unblock');
      Alert.alert(language === 'az' ? 'Xəta' : 'Ошибка', language === 'az' ? 'Yanlış istifadəçi' : 'Неверный пользователь');
      return;
    }
    if (isUnblocking) {
      logger.warn('[BlockedUsersScreen] Unblock already in progress');
      return;
    }
    Alert.alert(
      language === 'az' ? 'Blokdan çıxar' : 'Разблокировать',
      language === 'az'
        ? `${userName} istifadəçisini blokdan çıxarmaq istədiyinizə əminsinizmi?\n\nOnunla yenidən əlaqə saxlaya biləcəksiniz.`
        : `Вы уверены, что хотите разблокировать ${userName}?\n\nВы снова сможете связаться с ним.`,
      [
        { text: t.no, style: 'cancel', onPress: () => logger.info('[BlockedUsers] Unblock cancelled:', { userId }) },
        {
          text: t.yes,
          onPress: async () => {
            setIsUnblocking(userId);
            try {
              logger.debug('[BlockedUsersScreen] Unblocking user:', userId);
              await unblockUser(userId); // Assuming unblockUser is async
              Alert.alert(
                language === 'az' ? 'Uğurlu' : 'Успешно',
                language === 'az' ? `${userName} blokdan çıxarıldı` : `${userName} разблокирован`,
                [{ text: 'OK' }],
              );
              logger.info('[BlockedUsersScreen] User unblocked successfully:', userId);
            } catch (error) {
              logger.error('[BlockedUsersScreen] Error unblocking user:', error);
              const errorMessage = language === 'az' ? 'Blokdan çıxarılarkən xəta baş verdi' : 'Произошла ошибка при разблокировке';
              if (error instanceof Error) {
                // Specific error handling...
              }
              Alert.alert(language === 'az' ? 'Xəta' : 'Ошибка', errorMessage);
            } finally {
              setIsUnblocking(null);
            }
          },
        },
      ],
    );
  };

  // --- RENDER FUNCTIONS ---
  const renderBlockedUser = ({ item }: { item: typeof users[0] }) => {
    if (!item || !item.id || !item.name) {
      logger.error('[BlockedUsersScreen] Invalid user item');
      return null;
    }

    const isCurrentlyUnblocking = isUnblocking === item.id;

    return (
      <View style={[styles.userCard, { backgroundColor: colors.card }]}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.userLocation, { color: colors.textSecondary }]}>
            {typeof item.location === 'string' ? item.location : item.location?.[language] ?? ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.unblockButton,
            { backgroundColor: colors.primary },
            isCurrentlyUnblocking && styles.unblockButtonDisabled,
          ]}
          onPress={() => handleUnblock(item.id, item.name)}
          disabled={isCurrentlyUnblocking}
        >
          {isCurrentlyUnblocking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.unblockText, { color: '#fff' }]}>{t.unblock}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <UserCheck size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.noBlockedUsers}</Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{t.noBlockedUsersDesc}</Text>
      <TouchableOpacity
        style={[styles.backToSettingsButton, { backgroundColor: colors.primary }]}
        onPress={() => router.back()}
      >
        <Text style={styles.backToSettingsText}>{t.goBack}</Text>
      </TouchableOpacity>
    </View>
  );

  // --- MAIN COMPONENT RETURN ---
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t.title,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <FlatList
        data={blockedUsersList}
        renderItem={renderBlockedUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
}

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useUserStore } from '@/store/userStore';
import { useLanguageStore } from '@/store/languageStore';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { logger } from '@/utils/logger';
import { listings } from '@/mocks/listings';

export default function NewConversationScreen() {
  const { language } = useLanguageStore();
  const { currentUser, isUserBlocked } = useUserStore();

  const allUsersQuery = trpc.user.getAllUsers.useQuery(undefined, {
    enabled: !!currentUser?.id,
  });

  const users = React.useMemo(() => {
    const data = allUsersQuery.data ?? [];
    return data.filter((u) => {
      if (u.id === currentUser?.id) return false;
      if (isUserBlocked(u.id)) return false;
      const normalizedName = (u.name || '').toLowerCase();
      const normalizedEmail = (u.email || '').toLowerCase();
      const isLikelyTestAccount =
        normalizedName.includes('test') ||
        normalizedName.includes('admin') ||
        normalizedName.includes('moderator') ||
        normalizedEmail.includes('test') ||
        normalizedEmail.includes('admin') ||
        normalizedEmail.includes('moderator');
      if (isLikelyTestAccount) return false;
      return true;
    });
  }, [allUsersQuery.data, currentUser?.id, isUserBlocked]);

  const handleSelectUser = (user: { id: string; name: string }) => {
    const listingId = listings?.[0]?.id ?? 'listing1';
    logger.info('[NewConversation] Opening conversation with:', { userId: user.id, listingId });
    try {
      router.push(`/conversation/${user.id}`);
    } catch (error) {
      logger.error('[NewConversation] Navigation error:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Söhbət açıla bilmədi' : 'Не удалось открыть беседу',
      );
    }
  };

  const renderUserItem = ({ item }: { item: { id: string; name: string; avatar?: string | null } }) => {
    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => handleSelectUser(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.avatar || 'https://i.pravatar.cc/150?img=' + (item.id.charCodeAt(0) % 70) }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userHint}>
            {language === 'az' ? 'Mesaj göndərmək üçün toxunun' : 'Нажмите, чтобы отправить сообщение'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: language === 'az' ? 'Yeni söhbət' : 'Новый чат',
          headerStyle: { backgroundColor: Colors.card },
          headerTintColor: Colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {allUsersQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {language === 'az' ? 'İstifadəçilər yüklənir...' : 'Загрузка пользователей...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {language === 'az'
                  ? 'Mesaj göndərmək üçün başqa istifadəçi tapılmadı'
                  : 'Другие пользователи для сообщений не найдены'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backButton: {
    padding: 8,
    marginLeft: 4,
  },
  list: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 14,
    backgroundColor: Colors.border,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  userHint: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

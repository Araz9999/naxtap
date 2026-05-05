import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import { useUserStore } from '@/store/userStore';
import { useLanguageStore } from '@/store/languageStore';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { logger } from '@/utils/logger';

export default function NewConversationScreen() {
  const { language } = useLanguageStore();
  const { currentUser, isUserBlocked } = useUserStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const searchOk = debouncedSearch.length >= 2;

  const allUsersQuery = trpc.user.getAllUsers.useQuery(
    { search: debouncedSearch, limit: 30 },
    {
      enabled: !!currentUser?.id && searchOk,
    },
  );

  const users = useMemo(() => {
    const data = allUsersQuery.data ?? [];
    return data.filter((u) => {
      if (u.id === currentUser?.id) return false;
      if (isUserBlocked(u.id)) return false;
      const normalizedName = (u.name || '').toLowerCase();
      const isLikelyTestAccount =
        normalizedName.includes('test') ||
        normalizedName.includes('admin') ||
        normalizedName.includes('moderator');
      if (isLikelyTestAccount) return false;
      return true;
    });
  }, [allUsersQuery.data, currentUser?.id, isUserBlocked]);

  const handleSelectUser = (user: { id: string; name: string }) => {
    logger.info('[NewConversation] Opening conversation with:', { userId: user.id });
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

  const showLoading = searchOk && allUsersQuery.isFetching;

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

      <View style={styles.searchRow}>
        <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={language === 'az' ? 'İstifadəçi adı (min. 2 simvol)' : 'Имя пользователя (мин. 2 симв.)'}
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {!searchOk ? (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            {language === 'az'
              ? 'Yeni söhbət üçün istifadəçi adının ən azı 2 hərflə axtarın.'
              : 'Введите минимум 2 буквы имени, чтобы найти пользователя.'}
          </Text>
        </View>
      ) : showLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {language === 'az' ? 'Axtarılır...' : 'Поиск...'}
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
                  ? 'Heç bir istifadəçi tapılmadı'
                  : 'Пользователи не найдены'}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  hintContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  hintText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
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

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useUserStore } from '@/store/userStore';
import Colors from '@/constants/colors';
import { listings } from '@/mocks/listings';
import { trpc } from '@/lib/trpc';

import { logger } from '@/utils/logger';
export default function MessagesScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { isAuthenticated, currentUser, isUserBlocked } = useUserStore();

  const utils = trpc.useUtils();
  const conversationsQuery = trpc.chat.getConversations.useQuery(undefined, {
    refetchInterval: 2000,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  const deleteAllFromUserMutation = trpc.chat.deleteAllMessagesFromUser.useMutation({
    onSuccess: async () => {
      await utils.chat.getConversations.invalidate();
    },
  });
  
  logger.debug('MessagesScreen - isAuthenticated:', isAuthenticated);
  logger.debug('MessagesScreen - currentUser:', currentUser?.name);
  logger.debug('MessagesScreen - conversations count:', conversationsQuery.data?.length || 0);

  if (!isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authTitle}>
          {language === 'az' ? 'Mesajlarınızı görmək üçün daxil olun' : 'Войдите, чтобы увидеть свои сообщения'}
        </Text>
        <TouchableOpacity 
          style={styles.authButton}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.authButtonText}>
            {language === 'az' ? 'Daxil ol' : 'Войти'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    
    // ✅ Validate date
    if (isNaN(date.getTime())) {
      return language === 'az' ? 'Tarix məlum deyil' : 'Дата неизвестна';
    }
    
    const now = new Date();
    
    // ✅ Check if same calendar day
    const isSameDay = 
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    
    if (isSameDay) {
      return language === 'az' ? 'Bu gün' : 'Сегодня';
    }
    
    // ✅ Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = 
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();
    
    if (isYesterday) {
      return language === 'az' ? 'Dünən' : 'Вчера';
    }
    
    // ✅ Calculate difference for other days
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0 && diffDays <= 7) {
      return diffDays + (language === 'az' ? ' gün əvvəl' : ' дней назад');
    }
    
    return date.toLocaleDateString(language === 'az' ? 'az-AZ' : 'ru-RU');
  }, [language]);

  const getListing = (listingId: string) => {
    return listings.find(listing => listing.id === listingId);
  };

  const renderItem = ({ item }: { item: any }) => {
    const otherUser = item.otherUser;
    const listing = getListing(item.listingId);
    
    if (!otherUser || !listing) return null;
    if (otherUser?.id && isUserBlocked(otherUser.id)) return null;
    
    const handlePress = () => {
      // ✅ Validate conversation ID before navigation
      if (!item.id || typeof item.id !== 'string') {
        logger.error('[Messages] Invalid conversation ID:', item.id);
        return;
      }
      
      // ✅ Validate other user exists
      if (!otherUser) {
        logger.error('[Messages] No other user found for conversation:', item.id);
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'İstifadəçi məlumatları tapılmadı' : 'Информация о пользователе не найдена'
        );
        return;
      }
      
      logger.info('[Messages] Navigating to conversation:', {
        conversationId: item.id,
        otherUserId: otherUser.id,
        otherUserName: otherUser.name,
        listingId: listing?.id
      });
      
      try {
        router.push(`/conversation/${item.id}`);
      } catch (error) {
        logger.error('[Messages] Navigation error:', error);
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Söhbət açıla bilmədi' : 'Не удалось открыть беседу'
        );
      }
    };
    
    const handleLongPress = () => {
      if (!otherUser) {
        logger.warn('[Messages] No other user for long press action');
        return;
      }
      
      logger.info('[Messages] Long press on conversation:', {
        conversationId: item.id,
        otherUserId: otherUser.id
      });
      
      const title = language === 'az' ? 'Mesaj əməliyyatları' : 'Операции с сообщениями';
      const deleteAllMessage = language === 'az' 
        ? `${otherUser.name} istifadəçisinin bütün mesajlarını silmək istəyirsinizmi?`
        : `Удалить все сообщения от пользователя ${otherUser.name}?`;
      const deleteAllButton = language === 'az' ? 'Bütün mesajları sil' : 'Удалить все сообщения';
      const cancelButton = language === 'az' ? 'Ləğv et' : 'Отмена';
      
      Alert.alert(
        title,
        deleteAllMessage,
        [
          {
            text: cancelButton,
            style: 'cancel',
            onPress: () => logger.info('[Messages] Delete cancelled')
          },
          {
            text: deleteAllButton,
            style: 'destructive',
            onPress: () => {
              logger.info('[Messages] Deleting all messages from user:', otherUser.id);
              deleteAllFromUserMutation.mutate({ userId: otherUser.id });
            },
          },
        ]
      );
    };
    
    return (
      <TouchableOpacity 
        style={styles.conversationItem}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        <Image source={{ uri: otherUser.avatar || 'https://i.pravatar.cc/150?img=1' }} style={styles.avatar} />
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.userName}>{otherUser.name}</Text>
            <Text style={styles.date}>{item.lastMessageDate ? formatDate(item.lastMessageDate) : ''}</Text>
          </View>
          
          <Text style={styles.listingTitle} numberOfLines={1}>
            {listing.title[language]}
          </Text>
          
          <View style={styles.messageRow}>
            <Text 
              style={[
                styles.lastMessage, 
                item.unreadCount > 0 && styles.unreadMessage
              ]} 
              numberOfLines={1}
            >
              {item.lastMessage || (language === 'az' ? 'Mesaj yoxdur' : 'Нет сообщений')}
            </Text>
            
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Get filtered conversations (excluding blocked users) and sort by last message date
  const sortedConversations = useMemo(() => {
    const data = conversationsQuery.data || [];
    const filtered = data.filter((c: any) => {
      const otherId = c?.otherUser?.id;
      return otherId ? !isUserBlocked(otherId) : true;
    });
    return [...filtered].sort((a: any, b: any) => {
      const dateA = new Date(a.lastMessageDate || 0).getTime();
      const dateB = new Date(b.lastMessageDate || 0).getTime();
      return dateB - dateA;
    });
  }, [conversationsQuery.data, isUserBlocked]);

  return (
    <View style={styles.container}>
      {conversationsQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={sortedConversations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={5}
          removeClippedSubviews
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {language === 'az' ? 'Hələ mesaj yoxdur' : 'Пока нет сообщений'}
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
  list: {
    padding: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 12,
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
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  date: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  listingTitle: {
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '500',
    color: Colors.text,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
  },
});
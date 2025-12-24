import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Stack } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { useSupportStore } from '@/store/supportStore';
import { useUserStore } from '@/store/userStore';
import { getColors } from '@/constants/colors';
import { prompt } from '@/utils/confirm';
import { trpc } from '@/lib/trpc';
import {
  MessageCircle,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Headphones,
  Star,
  TrendingUp,
  Activity
} from 'lucide-react-native';
import { LiveChat, Operator } from '@/types/support';

const { width } = Dimensions.get('window');

export default function OperatorDashboard() {
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { currentUser } = useUserStore();
  const { liveChats, operators, sendMessage, assignOperator, closeLiveChat } = useSupportStore();
  const colors = getColors(themeMode, colorTheme);

  // ✅ For demo purposes, we'll simulate being the first operator
  const currentOperator = operators && operators.length > 0 ? operators[0] : null;
  const [selectedChat, setSelectedChat] = useState<LiveChat | null>(null);

  // ✅ Fetch conversations from backend using tRPC
  const { data: backendConversations, isLoading: conversationsLoading, refetch } = trpc.liveChat.getConversations.useQuery(
    { userId: currentUser?.id || '' },
    {
      enabled: !!currentUser?.id,
      refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
    }
  );

  // ✅ Use backend data if available, fallback to local store
  const allChats = backendConversations || liveChats;
  
  // ✅ Get chats for current operator with null-safety
  const operatorChats = currentOperator 
    ? allChats.filter((chat: any) => 
        chat.operatorId === currentOperator.id || chat.status === 'waiting'
      )
    : allChats.filter((chat: any) => chat.status === 'waiting'); // Show waiting chats if no operator assigned

  const waitingChats = operatorChats.filter((chat: any) => chat.status === 'waiting');
  const activeChats = operatorChats.filter((chat: any) => chat.status === 'active');
  const closedChats = operatorChats.filter((chat: any) => chat.status === 'closed');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return '#FFA500';
      case 'active': return '#4CAF50';
      case 'closed': return '#9E9E9E';
      default: return '#FFA500';
    }
  };

  const handleTakeChat = (chat: LiveChat) => {
    if (!currentOperator) return;
    
    assignOperator(chat.id, currentOperator.id);
    Alert.alert(
      language === 'az' ? 'Söhbət götürüldü' : 'Чат принят',
      language === 'az' 
        ? `${chat.subject} mövzusunda söhbət sizə təyin edildi`
        : `Чат на тему "${chat.subject}" назначен вам`
    );
  };

  const handleCloseChat = (chat: LiveChat) => {
    Alert.alert(
      language === 'az' ? 'Söhbəti bağla' : 'Закрыть чат',
      language === 'az' ? 'Bu söhbəti bağlamaq istədiyinizə əminsiniz?' : 'Вы уверены, что хотите закрыть этот чат?',
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel'
        },
        {
          text: language === 'az' ? 'Bağla' : 'Закрыть',
          style: 'destructive',
          onPress: () => {
            closeLiveChat(chat.id);
            setSelectedChat(null);
          }
        }
      ]
    );
  };

  const ChatCard = ({ chat }: { chat: LiveChat }) => (
    <TouchableOpacity
      style={[styles.chatCard, { backgroundColor: colors.card }]}
      onPress={() => setSelectedChat(chat)}
    >
      <View style={styles.chatHeader}>
        <View style={styles.chatInfo}>
          <Text style={[styles.chatSubject, { color: colors.text }]} numberOfLines={1}>
            {chat.subject}
          </Text>
          <Text style={[styles.chatTime, { color: colors.textSecondary }]}>
            {chat.createdAt.toLocaleTimeString('az-AZ', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
        <View style={styles.chatStatus}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(chat.status)}20` }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(chat.status) }
            ]} />
            <Text style={[
              styles.statusText,
              { color: getStatusColor(chat.status) }
            ]}>
              {language === 'az'
                ? chat.status === 'waiting' ? 'Gözləyir'
                  : chat.status === 'active' ? 'Aktiv'
                  : 'Bağlı'
                : chat.status === 'waiting' ? 'Ожидание'
                  : chat.status === 'active' ? 'Активен'
                  : 'Закрыт'
              }
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={[styles.messageCount, { color: colors.primary }]}>
        {chat.messages.length} {language === 'az' ? 'mesaj' : 'сообщений'}
      </Text>
      
      {chat.status === 'waiting' && (
        <TouchableOpacity
          style={[styles.takeButton, { backgroundColor: colors.primary }]}
          onPress={() => handleTakeChat(chat)}
        >
          <Text style={styles.takeButtonText}>
            {language === 'az' ? 'Götür' : 'Принять'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const StatsCard = ({ icon: Icon, title, value, color }: {
    icon: any;
    title: string;
    value: string | number;
    color: string;
  }) => (
    <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
      <View style={[styles.statsIcon, { backgroundColor: `${color}15` }]}>
        <Icon size={24} color={color} />
      </View>
      <View style={styles.statsContent}>
        <Text style={[styles.statsValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statsTitle, { color: colors.textSecondary }]}>{title}</Text>
      </View>
    </View>
  );

  if (!currentOperator) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen 
          options={{ 
            title: language === 'az' ? 'Operator Paneli' : 'Панель оператора',
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
          }} 
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {language === 'az' ? 'Operator məlumatları tapılmadı' : 'Данные оператора не найдены'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: language === 'az' ? 'Operator Paneli' : 'Панель оператора',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }} 
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Operator Info */}
        <View style={[styles.operatorCard, { backgroundColor: colors.primary }]}>
          <Image 
            source={{ uri: currentOperator.avatar || 'https://via.placeholder.com/80' }}
            style={styles.operatorAvatar}
          />
          <View style={styles.operatorInfo}>
            <Text style={styles.operatorName}>{currentOperator.name}</Text>
            <View style={styles.operatorStats}>
              <View style={styles.operatorStat}>
                <Star size={16} color="#FFD700" />
                <Text style={styles.operatorStatText}>{currentOperator.rating}</Text>
              </View>
              <View style={styles.operatorStat}>
                <MessageCircle size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.operatorStatText}>{currentOperator.totalChats}</Text>
              </View>
              <View style={styles.operatorStat}>
                <Clock size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.operatorStatText}>{currentOperator.responseTime}s</Text>
              </View>
            </View>
            <View style={styles.onlineStatus}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>
                {language === 'az' ? 'Onlayn' : 'Онлайн'} • {currentOperator.activeChats}/{currentOperator.maxChats} {language === 'az' ? 'söhbət' : 'чатов'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {conversationsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {language === 'az' ? 'Yüklənir...' : 'Загрузка...'}
              </Text>
            </View>
          ) : (
            <>
              <StatsCard
                icon={Clock}
                title={language === 'az' ? 'Gözləyən' : 'Ожидающие'}
                value={waitingChats.length}
                color="#FFA500"
              />
              <StatsCard
                icon={Activity}
                title={language === 'az' ? 'Aktiv' : 'Активные'}
                value={activeChats.length}
                color="#4CAF50"
              />
              <StatsCard
                icon={CheckCircle}
                title={language === 'az' ? 'Bağlı' : 'Закрытые'}
                value={closedChats.length}
                color="#9E9E9E"
              />
            </>
          )}
        </View>

        {/* Waiting Chats */}
        {waitingChats.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {language === 'az' ? 'Gözləyən Söhbətlər' : 'Ожидающие чаты'}
            </Text>
            {waitingChats.map((chat) => (
              <ChatCard key={chat.id} chat={chat} />
            ))}
          </View>
        )}

        {/* Active Chats */}
        {activeChats.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {language === 'az' ? 'Aktiv Söhbətlər' : 'Активные чаты'}
            </Text>
            {activeChats.map((chat) => (
              <ChatCard key={chat.id} chat={chat} />
            ))}
          </View>
        )}

        {/* Recent Closed Chats */}
        {closedChats.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {language === 'az' ? 'Son Bağlanan Söhbətlər' : 'Недавно закрытые чаты'}
            </Text>
            {closedChats.slice(0, 5).map((chat) => (
              <ChatCard key={chat.id} chat={chat} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Chat Detail Modal */}
      {selectedChat && (
        <View style={styles.chatDetailOverlay}>
          <View style={[styles.chatDetailModal, { backgroundColor: colors.card }]}>
            <View style={styles.chatDetailHeader}>
              <Text style={[styles.chatDetailTitle, { color: colors.text }]}>
                {selectedChat.subject}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedChat(null)}
              >
                <Text style={[styles.closeButtonText, { color: colors.primary }]}>
                  {language === 'az' ? 'Bağla' : 'Закрыть'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.messagesContainer}>
              {selectedChat.messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageItem,
                    message.senderType === 'operator' ? styles.operatorMessage : styles.userMessage
                  ]}
                >
                  <Text style={[
                    styles.messageText,
                    { color: message.senderType === 'operator' ? '#fff' : colors.text }
                  ]}>
                    {message.message}
                  </Text>
                  <Text style={[
                    styles.messageTime,
                    { color: message.senderType === 'operator' ? 'rgba(255,255,255,0.7)' : colors.textSecondary }
                  ]}>
                    {message.timestamp.toLocaleTimeString('az-AZ', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {selectedChat.status === 'active' && (
              <View style={styles.chatActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    const text = await prompt(
                      language === 'az' ? 'Mesajınızı yazın' : 'Напишите ваше сообщение',
                      language === 'az' ? 'Mesaj göndər' : 'Отправить сообщение'
                    );
                    if (text && text.trim() && currentOperator) {
                      sendMessage(selectedChat.id, currentOperator.id, 'operator', text.trim());
                    }
                  }}
                >
                  <Text style={styles.actionButtonText}>
                    {language === 'az' ? 'Mesaj Göndər' : 'Отправить сообщение'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FF5722' }]}
                  onPress={() => handleCloseChat(selectedChat)}
                >
                  <Text style={styles.actionButtonText}>
                    {language === 'az' ? 'Söhbəti Bağla' : 'Закрыть чат'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  operatorCard: {
    flexDirection: 'row',
    padding: 20,
    margin: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  operatorAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  operatorInfo: {
    flex: 1,
  },
  operatorName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  operatorStats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  operatorStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  operatorStatText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginLeft: 4,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  onlineText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statsContent: {
    flex: 1,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statsTitle: {
    fontSize: 12,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  chatCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  chatInfo: {
    flex: 1,
  },
  chatSubject: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  chatTime: {
    fontSize: 12,
  },
  chatStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  messageCount: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  takeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  takeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  chatDetailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatDetailModal: {
    width: width * 0.9,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  chatDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chatDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  messagesContainer: {
    maxHeight: 300,
    marginBottom: 16,
  },
  messageItem: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: '80%',
  },
  operatorMessage: {
    backgroundColor: '#2196F3',
    alignSelf: 'flex-end',
  },
  userMessage: {
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
  },
  chatActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});
import React, { useMemo, useState } from 'react';
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
import { useUserStore } from '@/store/userStore';
import { getColors } from '@/constants/colors';
import { prompt } from '@/utils/confirm';
import { trpc } from '@/lib/trpc';
import {
  MessageCircle,
  Clock,
  CheckCircle,
  Headphones,
  Star,
  Activity
} from 'lucide-react-native';
import type { LiveChatConversation, LiveChatMessage, SupportAgent } from '@/backend/types/liveChat';

const { width } = Dimensions.get('window');

export default function OperatorDashboard() {
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { currentUser } = useUserStore();
  const colors = getColors(themeMode, colorTheme);

  const utils = trpc.useUtils();

  // Real presence + agent list (in-memory backend for now)
  const presenceQuery = trpc.liveChat.getPresence.useQuery(undefined, {
    refetchInterval: 5000,
  });

  // Real conversations for operator panel
  const conversationsQuery = trpc.liveChat.getAllConversations.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const agents: SupportAgent[] = presenceQuery.data?.agents || [];
  // Demo: first agent acts as “current operator”
  const currentAgent: SupportAgent | null = agents.length > 0 ? agents[0] : null;

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const allConversations: LiveChatConversation[] = conversationsQuery.data || [];
  const selectedConversation = useMemo(
    () => allConversations.find((c) => c.id === selectedConversationId) || null,
    [allConversations, selectedConversationId]
  );

  const messagesQuery = trpc.liveChat.getMessages.useQuery(
    { conversationId: selectedConversationId || '' },
    {
      enabled: !!selectedConversationId,
      refetchInterval: 2000,
    }
  );

  const assignAgentMutation = trpc.liveChat.assignAgent.useMutation();
  const updateAgentStatusMutation = trpc.liveChat.updateAgentStatus.useMutation();
  const sendMessageMutation = trpc.liveChat.sendMessage.useMutation();
  const closeConversationMutation = trpc.liveChat.closeConversation.useMutation();

  const waitingConversations = allConversations.filter((c) => c.status === 'open');
  const activeConversations = currentAgent
    ? allConversations.filter((c) => c.status === 'assigned' && c.supportAgentId === currentAgent.id)
    : [];
  const closedConversations = allConversations.filter((c) => c.status === 'closed');

  const getStatusColor = (status: LiveChatConversation['status']) => {
    switch (status) {
      case 'open':
        return '#FFA500';
      case 'assigned':
        return '#4CAF50';
      case 'closed':
        return '#9E9E9E';
      default:
        return '#FFA500';
    }
  };

  const formatClock = (iso?: string) => {
    if (!iso) return '--:--';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
  };

  const handleTakeConversation = async (conv: LiveChatConversation) => {
    if (!currentAgent) return;

    const updated = await assignAgentMutation.mutateAsync({
      conversationId: conv.id,
      agentId: currentAgent.id,
    });

    await utils.liveChat.getAllConversations.invalidate();
    await utils.liveChat.getPresence.invalidate();

    Alert.alert(
      language === 'az' ? 'Söhbət götürüldü' : 'Чат принят',
      language === 'az'
        ? `Söhbət sizə təyin edildi${updated?.userName ? `: ${updated.userName}` : ''}`
        : `Чат назначен вам${updated?.userName ? `: ${updated.userName}` : ''}`
    );
  };

  const handleCloseConversation = (conv: LiveChatConversation) => {
    Alert.alert(
      language === 'az' ? 'Söhbəti bağla' : 'Закрыть чат',
      language === 'az'
        ? 'Bu söhbəti bağlamaq istədiyinizə əminsiniz?'
        : 'Вы уверены, что хотите закрыть этот чат?',
      [
        { text: language === 'az' ? 'Ləğv et' : 'Отмена', style: 'cancel' },
        {
          text: language === 'az' ? 'Bağla' : 'Закрыть',
          style: 'destructive',
          onPress: async () => {
            await closeConversationMutation.mutateAsync({ conversationId: conv.id });
            await utils.liveChat.getAllConversations.invalidate();
            await utils.liveChat.getPresence.invalidate();
            setSelectedConversationId(null);
          },
        },
      ]
    );
  };

  const ChatCard = ({ conv }: { conv: LiveChatConversation }) => (
    <TouchableOpacity
      style={[styles.chatCard, { backgroundColor: colors.card }]}
      onPress={() => setSelectedConversationId(conv.id)}
    >
      <View style={styles.chatHeader}>
        <View style={styles.chatInfo}>
          <Text style={[styles.chatSubject, { color: colors.text }]} numberOfLines={1}>
            {conv.subject || (language === 'az' ? 'Yeni söhbət' : 'Новый чат')}
          </Text>
          <Text style={[styles.chatTime, { color: colors.textSecondary }]}>
            {formatClock(conv.createdAt)}
          </Text>
        </View>
        <View style={styles.chatStatus}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(conv.status)}20` }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(conv.status) }
            ]} />
            <Text style={[
              styles.statusText,
              { color: getStatusColor(conv.status) }
            ]}>
              {language === 'az'
                ? conv.status === 'open'
                  ? 'Gözləyir'
                  : conv.status === 'assigned'
                    ? 'Aktiv'
                    : 'Bağlı'
                : conv.status === 'open'
                  ? 'Ожидание'
                  : conv.status === 'assigned'
                    ? 'Активен'
                    : 'Закрыт'
              }
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={[styles.messageCount, { color: colors.primary }]}>
        {conv.userName || (language === 'az' ? 'İstifadəçi' : 'Пользователь')}
      </Text>
      
      {conv.status === 'open' && (
        <TouchableOpacity
          style={[styles.takeButton, { backgroundColor: colors.primary }]}
          onPress={() => handleTakeConversation(conv)}
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

  if (!currentAgent) {
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
            source={{ uri: currentAgent.avatar || 'https://via.placeholder.com/80' }}
            style={styles.operatorAvatar}
          />
          <View style={styles.operatorInfo}>
            <Text style={styles.operatorName}>{currentAgent.name}</Text>
            <View style={styles.operatorStats}>
              <View style={styles.operatorStat}>
                <Star size={16} color="#FFD700" />
                <Text style={styles.operatorStatText}>—</Text>
              </View>
              <View style={styles.operatorStat}>
                <MessageCircle size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.operatorStatText}>{currentAgent.activeChats}</Text>
              </View>
              <View style={styles.operatorStat}>
                <Clock size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.operatorStatText}>
                  {currentAgent.status === 'online' ? (language === 'az' ? 'Onlayn' : 'Онлайн') : currentAgent.status === 'busy' ? (language === 'az' ? 'Məşğul' : 'Занят') : (language === 'az' ? 'Oflayn' : 'Оффлайн')}
                </Text>
              </View>
            </View>
            <View style={styles.onlineStatus}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>
                {(currentAgent.status === 'online' || currentAgent.status === 'busy') ? (language === 'az' ? 'Onlayn' : 'Онлайн') : (language === 'az' ? 'Oflayn' : 'Оффлайн')}
                {' • '}
                {currentAgent.activeChats} {language === 'az' ? 'aktiv söhbət' : 'активных чатов'}
              </Text>
            </View>

            <View style={styles.statusButtonsRow}>
              <TouchableOpacity
                style={[styles.statusButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={async () => {
                  await updateAgentStatusMutation.mutateAsync({ agentId: currentAgent.id, status: 'online' });
                  await utils.liveChat.getPresence.invalidate();
                }}
              >
                <Text style={styles.statusButtonText}>{language === 'az' ? 'Onlayn' : 'Онлайн'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={async () => {
                  await updateAgentStatusMutation.mutateAsync({ agentId: currentAgent.id, status: 'busy' });
                  await utils.liveChat.getPresence.invalidate();
                }}
              >
                <Text style={styles.statusButtonText}>{language === 'az' ? 'Məşğul' : 'Занят'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={async () => {
                  await updateAgentStatusMutation.mutateAsync({ agentId: currentAgent.id, status: 'offline' });
                  await utils.liveChat.getPresence.invalidate();
                }}
              >
                <Text style={styles.statusButtonText}>{language === 'az' ? 'Oflayn' : 'Оффлайн'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {conversationsQuery.isLoading ? (
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
                value={waitingConversations.length}
                color="#FFA500"
              />
              <StatsCard
                icon={Activity}
                title={language === 'az' ? 'Aktiv' : 'Активные'}
                value={activeConversations.length}
                color="#4CAF50"
              />
              <StatsCard
                icon={CheckCircle}
                title={language === 'az' ? 'Bağlı' : 'Закрытые'}
                value={closedConversations.length}
                color="#9E9E9E"
              />
            </>
          )}
        </View>

        {/* Waiting Chats */}
        {waitingConversations.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {language === 'az' ? 'Gözləyən Söhbətlər' : 'Ожидающие чаты'}
            </Text>
            {waitingConversations.map((conv) => (
              <ChatCard key={conv.id} conv={conv} />
            ))}
          </View>
        )}

        {/* Active Chats */}
        {activeConversations.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {language === 'az' ? 'Aktiv Söhbətlər' : 'Активные чаты'}
            </Text>
            {activeConversations.map((conv) => (
              <ChatCard key={conv.id} conv={conv} />
            ))}
          </View>
        )}

        {/* Recent Closed Chats */}
        {closedConversations.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {language === 'az' ? 'Son Bağlanan Söhbətlər' : 'Недавно закрытые чаты'}
            </Text>
            {closedConversations.slice(0, 5).map((conv) => (
              <ChatCard key={conv.id} conv={conv} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Chat Detail Modal */}
      {selectedConversation && (
        <View style={styles.chatDetailOverlay}>
          <View style={[styles.chatDetailModal, { backgroundColor: colors.card }]}>
            <View style={styles.chatDetailHeader}>
              <Text style={[styles.chatDetailTitle, { color: colors.text }]}>
                {selectedConversation.subject || (language === 'az' ? 'Söhbət' : 'Чат')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedConversationId(null)}
              >
                <Text style={[styles.closeButtonText, { color: colors.primary }]}>
                  {language === 'az' ? 'Bağla' : 'Закрыть'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.messagesContainer}>
              {(messagesQuery.data || []).map((message: LiveChatMessage) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageItem,
                    message.isSupport ? styles.operatorMessage : styles.userMessage
                  ]}
                >
                  <Text style={[
                    styles.messageText,
                    { color: message.isSupport ? '#fff' : colors.text }
                  ]}>
                    {message.message}
                  </Text>
                  <Text style={[
                    styles.messageTime,
                    { color: message.isSupport ? 'rgba(255,255,255,0.7)' : colors.textSecondary }
                  ]}>
                    {formatClock(message.timestamp)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {selectedConversation.status === 'assigned' && (
              <View style={styles.chatActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    const text = await prompt(
                      language === 'az' ? 'Mesajınızı yazın' : 'Напишите ваше сообщение',
                      language === 'az' ? 'Mesaj göndər' : 'Отправить сообщение'
                    );
                    if (text && text.trim() && currentAgent) {
                      await sendMessageMutation.mutateAsync({
                        conversationId: selectedConversation.id,
                        senderId: currentAgent.id,
                        senderName: currentAgent.name,
                        senderAvatar: currentAgent.avatar || undefined,
                        message: text.trim(),
                        isSupport: true,
                      });
                      await utils.liveChat.getMessages.invalidate({ conversationId: selectedConversation.id });
                      await utils.liveChat.getAllConversations.invalidate();
                    }
                  }}
                >
                  <Text style={styles.actionButtonText}>
                    {language === 'az' ? 'Mesaj Göndər' : 'Отправить сообщение'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FF5722' }]}
                  onPress={() => handleCloseConversation(selectedConversation)}
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
  statusButtonsRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
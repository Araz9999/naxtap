import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useUserStore } from '@/store/userStore';
import { useSupportStore } from '@/store/supportStore';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { getColors } from '@/constants/colors';
import {
  Send,
  Paperclip,
  Clock,
  CheckCircle2,
} from 'lucide-react-native';
import FileAttachmentPicker, { FileAttachment } from '@/components/FileAttachmentPicker';
import WebTextInput, { WebTextInputRef } from '@/components/WebTextInput';
import { trpc, getBaseUrl } from '@/lib/trpc';
import { realtimeService } from '@/lib/realtime';

const { width } = Dimensions.get('window');

export default function LiveChatScreen() {
  const { currentUser } = useUserStore();
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { categories } = useSupportStore();
  const colors = getColors(themeMode, colorTheme);

  const [message, setMessage] = useState<string>('');
  const [showStartForm, setShowStartForm] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [showAttachments, setShowAttachments] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const webChatInputRef = useRef<WebTextInputRef>(null);

  const utils = trpc.useUtils();

  const presenceQuery = trpc.liveChat.getPresence.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const conversationsQuery = trpc.liveChat.getConversations.useQuery(
    { userId: currentUser?.id || '' },
    {
      enabled: !!currentUser?.id,
      refetchInterval: 5000,
    },
  );

  const activeConversation = useMemo(() => {
    const list = conversationsQuery.data || [];
    return list.find((c) => c.status !== 'closed') || null;
  }, [conversationsQuery.data]);

  const conversationId = activeConversation?.id;

  const messagesQuery = trpc.liveChat.getMessages.useQuery(
    { conversationId: conversationId || '', viewerType: 'user' },
    {
      enabled: !!conversationId,
      refetchInterval: 2000,
    },
  );

  const createConversationMutation = trpc.liveChat.createConversation.useMutation();
  const sendMessageMutation = trpc.liveChat.sendMessage.useMutation();

  // Check if user has an active chat
  useEffect(() => {
    if (activeConversation) {
      setShowStartForm(false);
    }
  }, [activeConversation]);

  // WebSocket: Join live chat room and listen for events
  useEffect(() => {
    if (!conversationId || !realtimeService.isAvailable()) return;

    realtimeService.joinRoom(conversationId);

    const handleNewMessage = (data: { conversationId: string; message: any }) => {
      if (data.conversationId === conversationId) {
        utils.liveChat.getMessages.invalidate({ conversationId });
      }
    };

    const handleAssigned = (data: { conversationId: string; agentId: string; agentName: string }) => {
      if (data.conversationId === conversationId) {
        utils.liveChat.getConversations.invalidate({ userId: currentUser?.id });
      }
    };

    const handleClosed = (data: { conversationId: string }) => {
      if (data.conversationId === conversationId) {
        utils.liveChat.getConversations.invalidate({ userId: currentUser?.id });
      }
    };

    realtimeService.on('liveChat:message', handleNewMessage);
    realtimeService.on('liveChat:assigned', handleAssigned);
    realtimeService.on('liveChat:closed', handleClosed);

    return () => {
      realtimeService.leaveRoom(conversationId);
      realtimeService.off('liveChat:message', handleNewMessage);
      realtimeService.off('liveChat:assigned', handleAssigned);
      realtimeService.off('liveChat:closed', handleClosed);
    };
  }, [conversationId, currentUser?.id, utils]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesQuery.data && messagesQuery.data.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messagesQuery.data?.length]);

  const handleStartChat = async () => {
    if (!currentUser || !selectedCategory || !subject.trim()) {
      return;
    }

    try {
      await createConversationMutation.mutateAsync({
        userId: currentUser.id,
        userName: currentUser.name || 'User',
        userAvatar: currentUser.avatar || undefined,
        subject: subject.trim(),
        category: selectedCategory,
        priority,
      });

      await utils.liveChat.getConversations.invalidate({ userId: currentUser.id });
      setShowStartForm(false);
      setSelectedCategory('');
      setSubject('');
      setPriority('medium');
    } catch (error) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Söhbət başladılmadı' : 'Не удалось начать чат'
      );
    }
  };

  const handleSendMessage = useCallback(async () => {
    if ((!message.trim() && attachments.length === 0) || !conversationId || !currentUser) {
      return;
    }

    const messageToSend = message.trim();
    let attachmentUrls: string[] = [];

    // Upload attachments first if any
    if (attachments.length > 0) {
      try {
        const formData = new FormData();
        
        if (Platform.OS === 'web') {
          for (const att of attachments) {
            const response = await fetch(att.uri);
            const blob = await response.blob();
            formData.append('files', blob, att.name);
          }
        } else {
          attachments.forEach((att) => {
            // @ts-ignore
            formData.append('files', {
              uri: att.uri,
              name: att.name,
              type: att.mimeType || 'application/octet-stream',
            });
          });
        }

        const baseUrl = getBaseUrl();
        const uploadRes = await fetch(`${baseUrl}/api/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'omit',
          headers: {
            ...(Platform.OS === 'web' ? {} : { 'Content-Type': 'multipart/form-data' }),
          },
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload failed: ${uploadRes.status}`);
        }

        const data = await uploadRes.json();
        if (data.urls) {
          attachmentUrls = data.urls;
        }
      } catch (uploadError) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Fayl yüklənməsi xətası' : 'Ошибка загрузки файла'
        );
        return;
      }
    }

    // Prepare message text
    const messageText = messageToSend || (attachments.length > 0 ? `📎 ${attachments.length} fayl göndərildi` : '');

    try {
      // Send message
      await sendMessageMutation.mutateAsync({
        conversationId,
        senderId: currentUser.id,
        senderName: currentUser.name || 'User',
        senderAvatar: currentUser.avatar || undefined,
        message: messageText,
        attachments: attachmentUrls.length > 0 ? attachmentUrls : undefined,
        isSupport: false,
      });

      // Refresh messages
      await utils.liveChat.getMessages.invalidate({ conversationId });
      await utils.liveChat.getConversations.invalidate({ userId: currentUser.id });

      // Emit via WebSocket if available
      if (realtimeService.isAvailable()) {
        realtimeService.send('liveChat:message', {
          conversationId,
          message: { conversationId, message: messageText },
        });
      }

      // Clear input and attachments
      setMessage('');
      if (Platform.OS === 'web' && webChatInputRef.current) {
        webChatInputRef.current.clear();
      }
      setAttachments([]);
      setShowAttachments(false);

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Mesaj göndərilmədi' : 'Сообщение не отправлено'
      );
    }
  }, [message, attachments, conversationId, currentUser, sendMessageMutation, utils, language]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return '--:--';
    }
    return date.toLocaleTimeString('az-AZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const MessageBubble = ({ msg }: { msg: any }) => {
    const isSupport = !!msg.isSupport;
    const isUser = !isSupport;

    return (
      <View style={[
        styles.messageBubble,
        isUser ? styles.userMessage : styles.operatorMessage,
      ]}>
        {isSupport && (
          <View style={styles.operatorInfo}>
            <Image
              source={{ uri: msg.senderAvatar || 'https://via.placeholder.com/30' }}
              style={styles.operatorAvatar}
            />
            <Text style={[styles.operatorName, { color: colors.textSecondary }]}>
              {msg.senderName || (language === 'az' ? 'Operator' : 'Оператор')}
            </Text>
          </View>
        )}

        <View style={[
          styles.messageContent,
          {
            backgroundColor: isUser ? colors.primary : colors.card,
            alignSelf: isUser ? 'flex-end' : 'flex-start',
          },
        ]}>
          <Text style={[
            styles.messageText,
            { color: isUser ? '#fff' : colors.text },
          ]}>
            {msg.message}
          </Text>

          {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {msg.attachments.map((attachment: string, index: number) => {
                const isImage = attachment.toLowerCase().includes('.jpg') ||
                               attachment.toLowerCase().includes('.jpeg') ||
                               attachment.toLowerCase().includes('.png') ||
                               attachment.toLowerCase().includes('.gif') ||
                               attachment.startsWith('file://') ||
                               attachment.startsWith('content://') ||
                               attachment.startsWith('ph://');

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.attachmentPreview,
                      { backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : colors.border },
                    ]}
                  >
                    {isImage ? (
                      <Image
                        source={{ uri: attachment }}
                        style={styles.attachmentImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.documentPreview}>
                        <Text style={[styles.documentText, { color: isUser ? '#fff' : colors.text }]}>📄</Text>
                        <Text style={[styles.documentName, { color: isUser ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]} numberOfLines={1}>
                          {attachment.split('/').pop() || 'Sənəd'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              { color: isUser ? 'rgba(255,255,255,0.7)' : colors.textSecondary },
            ]}>
              {formatTime(msg.timestamp)}
            </Text>
            {isUser && (
              <View style={styles.messageStatus}>
                {msg.status === 'seen' ? (
                  <CheckCircle2 size={12} color="rgba(255,255,255,0.7)" />
                ) : (
                  <Clock size={12} color="rgba(255,255,255,0.7)" />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const StartChatForm = () => (
    <KeyboardAvoidingView
      style={styles.startForm}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.startFormScrollContent}
      >
        <View style={styles.startFormInner}>
          <View>
            <Text style={[styles.startTitle, { color: colors.text }]}>
              {language === 'az' ? 'Canlı Dəstək' : 'Живая поддержка'}
            </Text>
            <Text style={[styles.startSubtitle, { color: colors.textSecondary }]}>
              {language === 'az'
                ? 'Operatorumuzla birbaşa əlaqə saxlayın'
                : 'Свяжитесь напрямую с нашим оператором'}
            </Text>

            {(presenceQuery.data?.availableCount ?? 0) > 0 ? (
              <View style={[styles.operatorStatusBanner, { backgroundColor: `${colors.primary}15` }]}>
                <View style={styles.onlineDot} />
                <Text style={[styles.operatorStatusText, { color: colors.primary }]}>
                  {presenceQuery.data?.availableCount}{' '}
                  {language === 'az' ? 'operator onlayn' : 'операторов онлайн'}
                </Text>
              </View>
            ) : (
              <View style={[styles.operatorStatusBanner, { backgroundColor: '#FFF3E0' }]}>
                <View style={[styles.onlineDot, { backgroundColor: '#FF9500' }]} />
                <Text style={[styles.operatorStatusText, { color: '#FF9500' }]}>
                  {language === 'az'
                    ? 'Operatorlar oflayn - mesaj buraxın'
                    : 'Операторы оффлайн - оставьте сообщение'}
                </Text>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                {language === 'az' ? 'Kateqoriya' : 'Категория'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryRow}>
                  {categories.slice(0, 3).map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: selectedCategory === category.id ? colors.primary : colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => setSelectedCategory(category.id)}
                    >
                      <Text style={[styles.categoryChipText, { color: selectedCategory === category.id ? '#fff' : colors.text }]}>
                        {language === 'az' ? category.name : category.nameRu}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                {language === 'az' ? 'Mövzu' : 'Тема'}
              </Text>
              <TextInput
                style={[
                  styles.subjectInput,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder={language === 'az' ? 'Probleminizi qısaca yazın' : 'Кратко опишите проблему'}
                placeholderTextColor={colors.textSecondary}
                value={subject}
                onChangeText={setSubject}
                multiline={false}
                maxLength={100}
                autoCorrect={false}
                autoCapitalize="sentences"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.startButton,
              {
                backgroundColor: colors.primary,
                opacity: !selectedCategory || !subject.trim() || createConversationMutation.isPending ? 0.5 : 1,
              },
            ]}
            onPress={handleStartChat}
            disabled={!selectedCategory || !subject.trim() || createConversationMutation.isPending}
          >
            <Text style={styles.startButtonText}>
              {createConversationMutation.isPending
                ? language === 'az'
                  ? 'Açılır...'
                  : 'Открывается...'
                : language === 'az'
                  ? 'Söhbət Başlat'
                  : 'Начать чат'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: language === 'az' ? 'Canlı Dəstək' : 'Живая поддержка',
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {language === 'az' ? 'Daxil olun' : 'Войдите в систему'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          title: language === 'az' ? 'Canlı Dəstək' : 'Живая поддержка',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />
      {showStartForm ? (
        <StartChatForm />
      ) : conversationId ? (
        <KeyboardAvoidingView
          style={styles.chatContent}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 10 }}
          >
            {(messagesQuery.data || []).map((msg: any) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </ScrollView>
          <View style={styles.inputSection}>
            {showAttachments && (
              <View style={[styles.attachmentsSection, { backgroundColor: colors.card }]}>
                <FileAttachmentPicker
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                  maxFiles={3}
                />
              </View>
            )}

            <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={[
                  styles.attachButton,
                  {
                    backgroundColor: showAttachments ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowAttachments(!showAttachments)}
              >
                <Paperclip size={18} color={showAttachments ? '#fff' : colors.textSecondary} />
              </TouchableOpacity>

              {Platform.OS === 'web' ? (
                <>
                  <WebTextInput
                    ref={webChatInputRef}
                    placeholder={language === 'az' ? 'Mesajınızı yazın...' : 'Напишите сообщение...'}
                    placeholderTextColor={colors.textSecondary}
                    value={message}
                    onChangeText={setMessage}
                    onSubmitEditing={() => {
                      if (message.trim() || attachments.length > 0) {
                        handleSendMessage();
                      }
                    }}
                    style={[
                      styles.messageInput,
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    maxLength={1000}
                  />

                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      {
                        backgroundColor: message.trim() || attachments.length > 0 ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={handleSendMessage}
                    disabled={!message.trim() && attachments.length === 0}
                  >
                    <Send size={18} color={message.trim() || attachments.length > 0 ? '#fff' : colors.textSecondary} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TextInput
                    style={[
                      styles.messageInput,
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder={language === 'az' ? 'Mesajınızı yazın...' : 'Напишите сообщение...'}
                    placeholderTextColor={colors.textSecondary}
                    value={message}
                    onChangeText={setMessage}
                    multiline={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSendMessage}
                    blurOnSubmit={false}
                    maxLength={1000}
                  />

                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      {
                        backgroundColor: message.trim() || attachments.length > 0 ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={handleSendMessage}
                    disabled={!message.trim() && attachments.length === 0}
                  >
                    <Send size={18} color={message.trim() || attachments.length > 0 ? '#fff' : colors.textSecondary} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {language === 'az' ? 'Söhbət tapılmadı' : 'Чат не найден'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  chatContent: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageBubble: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  operatorMessage: {
    alignItems: 'flex-start',
  },
  operatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  operatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  operatorName: {
    fontSize: 12,
    fontWeight: '500',
  },
  messageContent: {
    maxWidth: width * 0.75,
    borderRadius: 16,
    padding: 12,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageTime: {
    fontSize: 11,
  },
  messageStatus: {
    marginLeft: 4,
  },
  inputSection: {
    backgroundColor: 'transparent',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 12,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  attachmentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  attachmentPreview: {
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    marginBottom: 8,
  },
  attachmentImage: {
    width: 60,
    height: 60,
  },
  documentPreview: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  documentText: {
    fontSize: 20,
    marginBottom: 2,
  },
  documentName: {
    fontSize: 8,
    textAlign: 'center',
  },
  startForm: {
    flex: 1,
  },
  startFormScrollContent: {
    flexGrow: 1,
  },
  startFormInner: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  startTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  startSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  subjectInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    height: 50,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  operatorStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  operatorStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

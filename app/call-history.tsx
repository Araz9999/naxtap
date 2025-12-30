import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useCallStore } from '@/store/callStore';
import { useLanguageStore } from '@/store/languageStore';
import { useUserStore } from '@/store/userStore';
import { users } from '@/mocks/users';
import { listings } from '@/mocks/listings';
import Colors from '@/constants/colors';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  Video,
  VideoOff,
  Trash2,
  MoreVertical,
} from 'lucide-react-native';
import { Call } from '@/types/call';

import { logger } from '@/utils/logger';
export default function CallHistoryScreen() {
  const { calls, markCallAsRead, initiateCall, deleteCall, clearAllCallHistory } = useCallStore();
  const { language } = useLanguageStore();
  const { currentUser } = useUserStore();
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);

  logger.info('[CallHistory] Screen opened:', {
    userId: currentUser?.id,
    totalCalls: calls.length,
  });

  const userCalls = calls.filter(call =>
    call.callerId === currentUser?.id || call.receiverId === currentUser?.id,
  );

  logger.info('[CallHistory] User calls filtered:', {
    totalCalls: calls.length,
    userCalls: userCalls.length,
  });

  const formatDuration = (seconds?: number) => {
    // ✅ Validate input
    if (seconds === undefined || seconds === null || isNaN(seconds) || !isFinite(seconds)) {
      return '00:00';
    }

    // ✅ Handle negative values
    const validSeconds = Math.max(0, Math.floor(seconds));

    const mins = Math.floor(validSeconds / 60);
    const secs = validSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);

      // ✅ Validate date
      if (isNaN(date.getTime())) {
        return language === 'az' ? 'Naməlum' : 'Неизвестно';
      }

      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // ✅ Use floor, not ceil

      if (diffDays === 0) {
        return language === 'az' ? 'Bu gün' : 'Сегодня';
      } else if (diffDays === 1) {
        return language === 'az' ? 'Dünən' : 'Вчера';
      } else if (diffDays <= 7) {
        return `${diffDays} ${language === 'az' ? 'gün əvvəl' : 'дней назад'}`;
      } else {
        return date.toLocaleDateString(language === 'az' ? 'az-AZ' : 'ru-RU');
      }
    } catch (error) {
      return language === 'az' ? 'Naməlum' : 'Неизвестно';
    }
  };

  const now = new Date();

  const getCallIcon = (call: Call) => {
    const isIncoming = call.receiverId === currentUser?.id;
    const iconColor = call.status === 'missed' ? '#F44336' : Colors.textSecondary;
    const iconSize = 20;

    if (call.type === 'video') {
      switch (call.status) {
        case 'missed':
        case 'declined':
          return <VideoOff size={iconSize} color={iconColor} />;
        default:
          return <Video size={iconSize} color={iconColor} />;
      }
    }

    switch (call.status) {
      case 'missed':
        return <PhoneMissed size={iconSize} color={iconColor} />;
      case 'declined':
        return <PhoneOff size={iconSize} color={iconColor} />;
      default:
        return isIncoming
          ? <PhoneIncoming size={iconSize} color={iconColor} />
          : <PhoneOutgoing size={iconSize} color={iconColor} />;
    }
  };

  const getCallStatusText = (call: Call) => {
    const isIncoming = call.receiverId === currentUser?.id;
    const callTypeText = call.type === 'video'
      ? (language === 'az' ? 'Video' : 'Видео')
      : (language === 'az' ? 'Səsli' : 'Голосовой');

    switch (call.status) {
      case 'missed':
        return `${language === 'az' ? 'Buraxılmış' : 'Пропущенный'} ${callTypeText.toLowerCase()}`;
      case 'declined':
        return `${language === 'az' ? 'Rədd edilmiş' : 'Отклонен'} ${callTypeText.toLowerCase()}`;
      case 'ended':
        return formatDuration(call.duration);
      default:
        const directionText = isIncoming
          ? (language === 'az' ? 'Gələn' : 'Входящий')
          : (language === 'az' ? 'Gedən' : 'Исходящий');
        return `${directionText} ${callTypeText.toLowerCase()}`;
    }
  };

  const handleCallPress = async (call: Call) => {
    try {
      if (!call || !call.id) {
        logger.error('Invalid call object');
        return;
      }

      if (!call.isRead) {
        markCallAsRead(call.id);
      }

      const otherUserId = call.callerId === currentUser?.id ? call.receiverId : call.callerId;

      // ✅ Validate otherUserId
      if (!otherUserId || typeof otherUserId !== 'string') {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'İstifadəçi məlumatı tapılmadı' : 'Информация о пользователе не найдена',
        );
        return;
      }

      const otherUser = users.find(u => u.id === otherUserId);

      if (otherUser?.privacySettings?.hidePhoneNumber) {
        // Initiate app call with same type as previous call
        try {
          // Ensure current user exists before initiating the call
          if (!currentUser?.id) {
            logger.error('No current user for initiating call');
            Alert.alert(
              language === 'az' ? 'Xəta' : 'Ошибка',
              language === 'az' ? 'Zəng başlatmaq üçün daxil olun' : 'Войдите, чтобы начать звонок',
            );
            return;
          }

          const callId = await initiateCall(currentUser.id, otherUserId, call.listingId, call.type);
          router.push(`/call/${callId}`);
        } catch (error) {
          logger.error('Failed to initiate call:', error);
          Alert.alert(
            language === 'az' ? 'Xəta' : 'Ошибка',
            language === 'az'
              ? 'Zəng başlatıla bilmədi. Xahiş edirik yenidən cəhd edin.'
              : 'Не удалось начать звонок. Пожалуйста, попробуйте снова.',
          );
        }
      }
    } catch (error) {
      logger.error('Error in handleCallPress:', error);
    }
  };

  const handleDeleteCall = (callId: string) => {
    logger.info('[CallHistory] Delete call requested:', { callId });

    const callToDelete = calls.find(call => call.id === callId);
    if (!callToDelete) {
      logger.error('[CallHistory] Call not found for deletion:', { callId });
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Zəng tapılmadı' : 'Звонок не найден',
      );
      return;
    }

    const otherUserId = callToDelete?.callerId === currentUser?.id ? callToDelete?.receiverId : callToDelete?.callerId;
    const otherUser = users.find(u => u.id === otherUserId);

    logger.info('[CallHistory] Showing delete confirmation:', {
      callId,
      otherUserId,
      otherUserName: otherUser?.name,
    });

    Alert.alert(
      language === 'az' ? 'Zəngi sil' : 'Удалить звонок',
      language === 'az'
        ? `${otherUser?.name || 'Bu istifadəçi'} ilə olan zəngi silmək istədiyinizə əminsiniz?`
        : `Вы уверены, что хотите удалить звонок с ${otherUser?.name || 'этим пользователем'}?`,
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
          onPress: () => {
            logger.info('[CallHistory] Delete call cancelled:', { callId });
          },
        },
        {
          text: language === 'az' ? 'Sil' : 'Удалить',
          style: 'destructive',
          onPress: () => {
            logger.info('[CallHistory] Deleting call:', { callId });
            deleteCall(callId);
            setSwipedItemId(null);
            logger.info('[CallHistory] Call deleted successfully:', { callId });
          },
        },
      ],
    );
  };

  const handleClearAllHistory = () => {
    logger.info('[CallHistory] Clear all history requested:', { totalCalls: userCalls.length });

    Alert.alert(
      language === 'az' ? 'Bütün tarixçəni sil' : 'Очистить всю историю',
      language === 'az'
        ? 'Bütün zəng tarixçəsini silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.'
        : 'Вы уверены, что хотите очистить всю историю звонков? Это действие нельзя отменить.',
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
          onPress: () => {
            logger.info('[CallHistory] Clear all history cancelled');
          },
        },
        {
          text: language === 'az' ? 'Sil' : 'Удалить',
          style: 'destructive',
          onPress: () => {
            logger.info('[CallHistory] Clearing all history:', { count: userCalls.length });
            clearAllCallHistory();
            logger.info('[CallHistory] All history cleared successfully');
          },
        },
      ],
    );
  };

  const renderCallItem = ({ item }: { item: Call }) => {
    const otherUserId = item.callerId === currentUser?.id ? item.receiverId : item.callerId;
    const otherUser = users.find(user => user.id === otherUserId);
    const listing = listings.find(l => l.id === item.listingId);
    const isUnread = !item.isRead && item.receiverId === currentUser?.id;
    const isSwipedOpen = swipedItemId === item.id;

    return (
      <View style={styles.callItemContainer}>
        <View style={styles.deleteBackground}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteCall(item.id)}
          >
            <Trash2 size={24} color="#fff" />
            <Text style={styles.deleteText}>
              {language === 'az' ? 'Sil' : 'Удалить'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.callItem,
            isUnread && styles.unreadCall,
            isSwipedOpen && styles.swipedItem,
          ]}
          onPress={() => {
            if (isSwipedOpen) {
              setSwipedItemId(null);
            } else {
              handleCallPress(item);
            }
          }}
          onLongPress={() => {
            setSwipedItemId(isSwipedOpen ? null : item.id);
          }}
          testID={`call-item-${item.id}`}
        >
          <Image
            source={{ uri: otherUser?.avatar || 'https://via.placeholder.com/50' }}
            style={styles.avatar}
            // defaultSource={require('@/assets/images/default-avatar.png')}
            onError={() => {
              // ✅ Fallback if image fails to load
              logger.debug('Avatar image failed to load for user:', otherUserId);
            }}
          />

          <View style={styles.callInfo}>
            <View style={styles.callHeader}>
              <Text style={[styles.userName, isUnread && styles.unreadText]}>
                {otherUser?.name}
              </Text>
              <Text style={styles.callTime}>
                {formatDate(item.startTime)}
              </Text>
            </View>

            <View style={styles.callDetails}>
              <View style={styles.callStatus}>
                {getCallIcon(item)}
                <Text style={[styles.statusText, item.status === 'missed' && styles.missedText]}>
                  {getCallStatusText(item)}
                </Text>
              </View>
              <Text style={styles.listingTitle} numberOfLines={1}>
                {listing?.title ? (typeof listing.title === 'string' ? listing.title : listing.title[language]) : ''}
              </Text>
            </View>
          </View>

          <View style={styles.callActions}>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCallPress(item)}
            >
              <Phone size={20} color={Colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.callButton, styles.videoButton]}
              onPress={async () => {
                const otherUserId = item.callerId === currentUser?.id ? item.receiverId : item.callerId;
                try {
                  if (!currentUser?.id) {
                    logger.error('No current user for video call initiation');
                    Alert.alert(
                      language === 'az' ? 'Xəta' : 'Ошибка',
                      language === 'az' ? 'Video zəng başlatmaq üçün giriş edin' : 'Войдите для видеозвонка',
                    );
                    return;
                  }
                  const callId = await initiateCall(currentUser.id, otherUserId, item.listingId, 'video');
                  router.push(`/call/${callId}`);
                } catch (error) {
                  logger.error('Failed to initiate video call:', error);
                  Alert.alert(
                    language === 'az' ? 'Video Zəng Xətası' : 'Ошибка видеозвонка',
                    language === 'az' ? 'Video zəng başlatmaq mümkün olmadı' : 'Не удалось начать видеозвонок',
                  );
                }
              }}
            >
              <Video size={20} color={Colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.callButton, styles.deleteCallButton]}
              onPress={() => handleDeleteCall(item.id)}
            >
              <Trash2 size={18} color="#F44336" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: language === 'az' ? 'Zəng tarixçəsi' : 'История звонков',
          headerStyle: { backgroundColor: Colors.card },
          headerTintColor: Colors.text,
          headerRight: () => userCalls.length > 0 ? (
            <TouchableOpacity
              onPress={handleClearAllHistory}
              style={styles.headerButton}
            >
              <MoreVertical size={24} color={Colors.text} />
            </TouchableOpacity>
          ) : null,
        }}
      />

      {userCalls.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Phone size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>
            {language === 'az' ? 'Zəng tarixçəsi boşdur' : 'История звонков пуста'}
          </Text>
          <Text style={styles.emptyText}>
            {language === 'az'
              ? 'Hələ heç bir zəng etməmisiniz və ya qəbul etməmisiniz'
              : 'Вы еще не совершали и не принимали звонков'
            }
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.listHeader}>
            {userCalls.length > 0 && (
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={handleClearAllHistory}
              >
                <Trash2 size={16} color={Colors.textSecondary} />
                <Text style={styles.clearAllText}>
                  {language === 'az' ? 'Hamısını sil' : 'Очистить все'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={userCalls}
            renderItem={renderCallItem}
            keyExtractor={item => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            onScrollBeginDrag={() => setSwipedItemId(null)}
          />
        </>
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
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  callItemContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
  },
  swipedItem: {
    transform: [{ translateX: -100 }],
  },
  unreadCall: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  callInfo: {
    flex: 1,
  },
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
  },
  callTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  callDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  callStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  missedText: {
    color: '#F44336',
    fontWeight: '500',
  },
  listingTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  callActions: {
    flexDirection: 'row',
    gap: 8,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  videoButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
  },
  deleteCallButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderColor: '#F44336',
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.card,
    borderRadius: 20,
    gap: 6,
  },
  clearAllText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useCallStore } from '@/store/callStore';
import { useLanguageStore } from '@/store/languageStore';
import { users } from '@/mocks/users';
import { listings } from '@/mocks/listings';
import Colors from '@/constants/colors';
import { Phone, PhoneOff, Video } from 'lucide-react-native';
import { router } from 'expo-router';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const IncomingCallModal = React.memo(function IncomingCallModal() {
  const { incomingCall, answerCall, declineCall } = useCallStore();
  const { language } = useLanguageStore();

  const caller = React.useMemo(
    () => incomingCall ? users.find(user => user.id === incomingCall.callerId) : undefined,
    [incomingCall],
  );

  const listing = React.useMemo(
    () => incomingCall ? listings.find(l => l.id === incomingCall.listingId) : undefined,
    [incomingCall],
  );

  const handleAnswer = React.useCallback(() => {
    if (!incomingCall) return;
    answerCall(incomingCall.id);
    router.push(`/call/${incomingCall.id}`);
  }, [incomingCall, answerCall]);

  const handleDecline = React.useCallback(() => {
    if (!incomingCall) return;
    declineCall(incomingCall.id);
  }, [incomingCall, declineCall]);

  if (!incomingCall) return null;

  return (
    <Modal
      visible={true}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <View style={styles.backgroundOverlay} />

        <View style={styles.content}>
          <Text style={styles.incomingText}>
            {language === 'az' ? 'Gələn zəng' : 'Входящий звонок'}
          </Text>

          <View style={styles.callerInfo}>
            <Image
              source={{ uri: caller?.avatar }}
              style={styles.callerAvatar}
            />
            <Text style={styles.callerName}>{caller?.name}</Text>
            <Text style={styles.listingTitle}>
              {listing?.title ? (typeof listing.title === 'string' ? listing.title : listing.title[language]) : ''}
            </Text>
            <Text style={styles.callTypeText}>
              {incomingCall.type === 'video'
                ? (language === 'az' ? 'Video zəng' : 'Видео звонок')
                : (language === 'az' ? 'Səsli zəng' : 'Голосовой звонок')
              }
            </Text>
          </View>

          <View style={styles.callActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={handleDecline}
              testID="decline-call-button"
            >
              <PhoneOff size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.answerButton]}
              onPress={handleAnswer}
              testID="answer-call-button"
            >
              {incomingCall.type === 'video' ? (
                <Video size={28} color="#fff" />
              ) : (
                <Phone size={28} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.privacyNote}>
            {language === 'az'
              ? 'Bu istifadəçi telefon nömrəsini gizlədib. Zəng tətbiq üzərindən həyata keçirilir.'
              : 'Этот пользователь скрыл номер телефона. Звонок осуществляется через приложение.'
            }
          </Text>
        </View>
      </View>
    </Modal>
  );
});

export default IncomingCallModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 20,
  },
  incomingText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
    opacity: 0.9,
  },
  callerInfo: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  callerAvatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  callerName: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  listingTitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  callTypeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontWeight: '500',
  },
  callActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    marginBottom: 40,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  answerButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  privacyNote: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginHorizontal: 20,
  },
});

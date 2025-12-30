import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useCallStore } from '@/store/callStore';
import { useLanguageStore } from '@/store/languageStore';
import { useUserStore } from '@/store/userStore';
import { users } from '@/mocks/users';
import { listings } from '@/mocks/listings';
import Colors from '@/constants/colors';
import { logger } from '@/utils/logger'; // ✅ Import logger
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  Circle,
  Square,
} from 'lucide-react-native';

import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  isTrackReference,
  registerGlobals,
  useConnectionState,
  useRoomContext,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';
import { ConnectionState, Track } from 'livekit-client';
import { trpc } from '@/lib/trpc';

if (Platform.OS !== 'web') {
  // Must be called before using LiveKit (safe to call multiple times).
  registerGlobals();
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function CallRoomView({
  callId,
  roomName,
  type,
  isMuted,
  isSpeakerOn,
  isVideoEnabled,
  onToggleMute,
  onToggleSpeaker,
  onToggleVideo,
  otherUserAvatar,
  otherUserName,
  listingTitle,
}: {
  callId: string;
  roomName: string;
  type: 'voice' | 'video';
  isMuted: boolean;
  isSpeakerOn: boolean;
  isVideoEnabled: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleVideo: () => void;
  otherUserAvatar?: string;
  otherUserName?: string;
  listingTitle?: string;
}) {
  const { language } = useLanguageStore();
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const isConnected = connectionState === ConnectionState.Connected;

  const [callDuration, setCallDuration] = useState<number>(0);

  const startRecordingMutation = trpc.call.startRecording.useMutation();
  const stopRecordingMutation = trpc.call.stopRecording.useMutation();
  const [egressId, setEgressId] = useState<string | null>(null);
  const isRecording = !!egressId && startRecordingMutation.status === 'success';

  useEffect(() => {
    if (!isConnected) return;
    setCallDuration(0);
    const interval = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  // Sync UI toggles -> LiveKit media state
  useEffect(() => {
    if (!room) return;
    room.localParticipant.setMicrophoneEnabled(!isMuted).catch(() => undefined);
  }, [room, isMuted]);

  useEffect(() => {
    if (!room) return;
    if (type !== 'video') return;
    room.localParticipant.setCameraEnabled(!!isVideoEnabled).catch(() => undefined);
  }, [room, type, isVideoEnabled]);

  // Start/stop audio session for best call behavior
  useEffect(() => {
    if (Platform.OS === 'web') return;
    AudioSession.startAudioSession().catch(() => undefined);
    return () => {
      AudioSession.stopAudioSession().catch(() => undefined);
    };
  }, []);

  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const { remoteCamera, localCamera } = useMemo(() => {
    let local: TrackReferenceOrPlaceholder | undefined;
    let remote: TrackReferenceOrPlaceholder | undefined;
    for (const t of tracks) {
      if (!isTrackReference(t)) continue;
      if (t.participant.isLocal && !local) local = t;
      if (!t.participant.isLocal && !remote) remote = t;
    }
    return { localCamera: local, remoteCamera: remote };
  }, [tracks]);

  const toggleServerRecording = async () => {
    if (!roomName) return;
    if (!isConnected) {
      Alert.alert(
        language === 'az' ? 'Xəbərdarlıq' : 'Предупреждение',
        language === 'az' ? 'Əvvəlcə zəngə qoşulun' : 'Сначала подключитесь к звонку',
      );
      return;
    }

    try {
      if (!egressId) {
        const res = await startRecordingMutation.mutateAsync({ roomName, callId });
        setEgressId(res.egressId);
      } else {
        await stopRecordingMutation.mutateAsync({ egressId });
        setEgressId(null);
      }
    } catch (e) {
      logger.error('[Call] Recording toggle failed:', e);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az'
          ? 'Zəng yazısı başlatmaq/dayandırmaq mümkün olmadı (server recording konfiqurasiya olunmayıb ola bilər)'
          : 'Не удалось запустить/остановить запись (возможно, не настроена серверная запись)',
      );
    }
  };

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.statusText}>
          {isConnected ? formatDuration(callDuration) : (language === 'az' ? 'Qoşulur...' : 'Соединение...')}
        </Text>
        <Text style={styles.listingTitle}>{listingTitle || ''}</Text>
      </View>

      {type === 'video' ? (
        <View style={styles.videoContainer}>
          <View style={styles.remoteVideo}>
            {isTrackReference(remoteCamera) ? (
              <VideoTrack trackRef={remoteCamera} style={styles.remoteVideoTrack} />
            ) : (
              <View style={styles.remoteVideoFallback}>
                <Image source={{ uri: otherUserAvatar }} style={styles.remoteVideoPlaceholder} />
                <Text style={styles.remoteVideoText}>{otherUserName}</Text>
              </View>
            )}
          </View>

          {isVideoEnabled && isTrackReference(localCamera) && (
            <View style={styles.localVideo}>
              <VideoTrack
                trackRef={localCamera}
                mirror
                style={styles.localVideoTrack}
              />
            </View>
          )}

          {!isVideoEnabled && (
            <View style={styles.localVideoOff}>
              <VideoOff size={24} color="#fff" />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.userInfo}>
          <Image source={{ uri: otherUserAvatar }} style={styles.userAvatar} />
          <Text style={styles.userName}>{otherUserName}</Text>
          <Text style={styles.callType}>
            {language === 'az' ? 'Səsli zəng' : 'Голосовой звонок'}
          </Text>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.activeControl]}
          onPress={onToggleMute}
          testID="mute-button"
        >
          {isMuted ? <MicOff size={24} color="#fff" /> : <Mic size={24} color="#fff" />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isSpeakerOn && styles.activeControl]}
          onPress={onToggleSpeaker}
          testID="speaker-button"
        >
          {isSpeakerOn ? <Volume2 size={24} color="#fff" /> : <VolumeX size={24} color="#fff" />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isRecording && styles.recordingControl]}
          onPress={toggleServerRecording}
          testID="record-button"
        >
          {isRecording ? <Square size={22} color="#fff" /> : <Circle size={22} color="#fff" />}
        </TouchableOpacity>

        {type === 'video' && (
          <TouchableOpacity
            style={[styles.controlButton, !isVideoEnabled && styles.activeControl]}
            onPress={onToggleVideo}
            testID="video-button"
          >
            {isVideoEnabled ? <Video size={24} color="#fff" /> : <VideoOff size={24} color="#fff" />}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.endCallContainer}>
        <TouchableOpacity
          style={styles.endCallButton}
          onPress={() => {
            // ensure recording stops if user hangs up
            if (egressId) {
              stopRecordingMutation.mutate({ egressId });
              setEgressId(null);
            }
            room?.disconnect();
            router.back();
          }}
          testID="end-call-button"
        >
          <PhoneOff size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {isRecording && (
        <Text style={styles.recordingText}>
          {language === 'az' ? 'Server yazısı aktivdir' : 'Серверная запись активна'}
        </Text>
      )}

      <Text style={styles.privacyNote}>
        {language === 'az'
          ? 'Bu zəng LiveKit vasitəsilə real vaxtda həyata keçirilir'
          : 'Этот звонок выполняется в реальном времени через LiveKit'}
      </Text>
    </View>
  );
}

export default function CallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const callId = Array.isArray(id) ? id[0] : id;

  const { activeCall, endCall, toggleMute, toggleSpeaker, toggleVideo } = useCallStore();
  const { language } = useLanguageStore();
  const { currentUser } = useUserStore();

  const tokenMutation = trpc.call.getToken.useMutation();
  const [lkToken, setLkToken] = useState<string | undefined>(undefined);
  const [lkServerUrl, setLkServerUrl] = useState<string | undefined>(undefined);
  const [lkRoomName, setLkRoomName] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!activeCall || activeCall.id !== callId) {
      router.back();
    }
  }, [activeCall, callId]);

  // ✅ Navigate back if other user can't be resolved (avoid conditional hooks)
  useEffect(() => {
    if (!activeCall || !callId) return;
    const otherUserId =
      activeCall.callerId === currentUser?.id ? activeCall.receiverId : activeCall.callerId;
    const otherUser = users.find((u) => u.id === otherUserId);
    if (!otherUser) {
      router.back();
    }
  }, [activeCall, callId, currentUser?.id]);

  // Fetch LiveKit token once per call (requires backend env LIVEKIT_*)
  useEffect(() => {
    if (!callId || !activeCall || !currentUser?.id) return;
    if (lkToken && lkServerUrl && lkRoomName) return;

    tokenMutation.mutate(
      {
        callId,
        userId: currentUser.id,
        name: currentUser.name,
        type: activeCall.type,
      },
      {
        onSuccess: (res) => {
          setLkServerUrl(res.serverUrl);
          setLkToken(res.token);
          setLkRoomName(res.roomName);
        },
        onError: (err) => {
          logger.error('[Call] Failed to get LiveKit token:', err);
          Alert.alert(
            language === 'az' ? 'Xəta' : 'Ошибка',
            language === 'az'
              ? 'Zəng serverinə qoşulmaq mümkün olmadı. LIVEKIT_URL/API_KEY/API_SECRET konfiqurasiyasını yoxlayın.'
              : 'Не удалось подключиться к серверу звонков. Проверьте LIVEKIT_URL/API_KEY/API_SECRET.',
          );
        },
      },
    );
  }, [callId, activeCall, currentUser?.id, currentUser?.name, lkToken, lkServerUrl, lkRoomName, tokenMutation, language]);

  if (!activeCall || !callId) {
    return null;
  }

  // ✅ Use actual current user ID, not hardcoded
  const otherUserId = activeCall.callerId === currentUser?.id ? activeCall.receiverId : activeCall.callerId;
  const otherUser = users.find(user => user.id === otherUserId);
  const listing = listings.find(l => l.id === activeCall.listingId);

  // ✅ Validate other user exists
  if (!otherUser) {
    logger.error('Other user not found:', otherUserId);
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.permissionText}>
            {language === 'az' ? 'İstifadəçi tapılmadı' : 'Пользователь не найден'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.backgroundOverlay} />

      <LiveKitRoom
        serverUrl={lkServerUrl}
        token={lkToken}
        connect={true}
        audio={true}
        video={activeCall.type === 'video'}
        options={{
          adaptiveStream: { pixelDensity: 'screen' },
        }}
        onDisconnected={() => {
          // Persist call end in store when LiveKit disconnects
          endCall(callId);
        }}
      >
        <CallRoomView
          callId={callId}
          roomName={lkRoomName || `call_${callId}`}
          type={activeCall.type}
          isMuted={activeCall.isMuted}
          isSpeakerOn={activeCall.isSpeakerOn}
          isVideoEnabled={activeCall.type === 'video' ? activeCall.isVideoEnabled : false}
          onToggleMute={toggleMute}
          onToggleSpeaker={toggleSpeaker}
          onToggleVideo={toggleVideo}
          otherUserAvatar={otherUser.avatar}
          otherUserName={otherUser.name}
          listingTitle={listing?.title ? (typeof listing.title === 'string' ? listing.title : listing.title[language]) : ''}
        />
      </LiveKitRoom>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  listingTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  userInfo: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  userAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  userName: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  callType: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  activeControl: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  recordingControl: {
    backgroundColor: 'rgba(244,67,54,0.35)',
    borderColor: 'rgba(244,67,54,0.6)',
  },
  endCallContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  privacyNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  recordingText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 6,
    marginTop: -8,
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideo: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  remoteVideoTrack: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  remoteVideoFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
  },
  remoteVideoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  localVideo: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  localVideoTrack: {
    width: '100%',
    height: '100%',
  },
  localVideoOff: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  permissionText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
});

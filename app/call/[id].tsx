import React, { useEffect, useMemo, Suspense } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import Constants from 'expo-constants';
import { useCallStore } from '@/store/callStore';
import { useUserStore } from '@/store/userStore';
import { useLanguageStore } from '@/store/languageStore';
import Colors from '@/constants/colors';
import { PhoneOff } from 'lucide-react-native';

// LiveKit is only loaded when NOT in Expo Go (avoids "package doesn't seem to be linked").
const CallRoomLiveKit = React.lazy(() => import('./_CallRoomLiveKit'));

class CallScreenErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError = () => ({ hasError: true });
  componentDidCatch() {
    // LiveKit "not linked" or other native module errors — show fallback
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function CallUnsupportedInExpoGo() {
  const { language } = useLanguageStore();
  return (
    <View style={styles.unsupportedContainer}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={styles.unsupportedTitle}>
        {language === 'az' ? 'Zənglər Expo Go-da mövcud deyil' : 'Звонки недоступны в Expo Go'}
      </Text>
      <Text style={styles.unsupportedText}>
        {language === 'az'
          ? 'Səsli və video zənglər development build tələb edir. Terminalda: npx expo run:android və ya npx expo run:ios'
          : 'Голосовые и видео звонки требуют development build. В терминале: npx expo run:android или npx expo run:ios'}
      </Text>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <PhoneOff size={24} color="#fff" />
        <Text style={styles.backButtonText}>{language === 'az' ? 'Geri' : 'Назад'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const callId = Array.isArray(id) ? id[0] : id;

  const { activeCall, endCall } = useCallStore();
  const { currentUser } = useUserStore();

  const otherUserId = useMemo(() => {
    if (!activeCall || !currentUser?.id) return undefined;
    return activeCall.callerId === currentUser.id ? activeCall.receiverId : activeCall.callerId;
  }, [activeCall, currentUser?.id]);

  useEffect(() => {
    if (!activeCall || activeCall.id !== callId) {
      router.back();
    }
  }, [activeCall, callId]);

  // Expo Go: appOwnership is 'expo'. In some builds it's undefined in dev — treat as Expo Go so we don't load LiveKit.
  const isExpoGo = Constants.appOwnership === 'expo' || (__DEV__ && Constants.appOwnership === undefined);

  if (!activeCall || !callId) {
    return null;
  }

  if (isExpoGo) {
    return <CallUnsupportedInExpoGo />;
  }

  const fallback = <CallUnsupportedInExpoGo />;
  return (
    <CallScreenErrorBoundary fallback={fallback}>
      <Suspense
        fallback={
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Qoşulur...</Text>
          </View>
        }
      >
        <CallRoomLiveKit callId={callId} />
      </Suspense>
    </CallScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  unsupportedContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  unsupportedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  unsupportedText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

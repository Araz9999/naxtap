import { create } from 'zustand';
import { Call, ActiveCall, CallRecording, CallStatus, CallType } from '@/types/call';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';
import { Audio } from 'expo-av';
import { trpcClient } from '@/lib/trpc';
import { realtimeService } from '@/lib/realtime';

interface CallStore {
  calls: Call[];
  activeCall: ActiveCall | null;
  incomingCall: Call | null;
  selfUserId: string | null;
  ringtoneSound: Audio.Sound | null;
  dialToneSound: Audio.Sound | null;
  ringtoneInterval: NodeJS.Timeout | null;
  dialToneInterval: NodeJS.Timeout | null;
  incomingCallTimeouts: Map<string, NodeJS.Timeout>; // ✅ Track timeouts for cleanup
  outgoingCallTimeouts: Map<string, NodeJS.Timeout>; // ✅ Track outgoing call timeouts

  // Identity (for correct caller/receiver resolution)
  setSelfUserId: (userId: string | null) => void;

  // Call actions
  initiateCall: (currentUserId: string, receiverId: string, listingId: string, type: CallType) => Promise<string>;
  answerCall: (callId: string) => void;
  declineCall: (callId: string) => void;
  endCall: (callId: string) => void;
  setCallRecording: (callId: string, recording: Partial<CallRecording>) => void;

  // Active call controls
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleVideo: () => void;

  // Call history
  getCallHistory: (userId: string) => Call[];
  markCallAsRead: (callId: string) => void;
  getMissedCallsCount: (currentUserId: string) => number;
  deleteCall: (callId: string) => void;
  clearAllCallHistory: () => void;

  // Sound management
  initializeSounds: () => Promise<void>;
  playRingtone: () => Promise<void>;
  playDialTone: () => Promise<void>;
  stopAllSounds: () => Promise<void>;
  cleanupSounds: () => Promise<void>;

  // Notifications
  simulateIncomingCall: () => void;
  pollIncomingCalls: (currentUserId: string) => Promise<void>;
  
  // WebSocket integration
  initializeRealtimeListeners: () => void;
  cleanupRealtimeListeners: () => void;
}

// ✅ FIXED: Load call history from backend instead of mock data
// Initial calls will be loaded dynamically from API
const initialCalls: Call[] = [];

async function getInCallManager(): Promise<any | null> {
  if (Platform.OS === 'web') return null;
  try {
    const mod: any = await import('react-native-incall-manager');
    return mod?.default ?? mod ?? null;
  } catch (error) {
    logger.debug?.('[CallStore] InCallManager not available', error);
    return null;
  }
}

function webBeep(frequency = 440, durationMs = 250, gain = 0.2) {
  try {
    const w = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    const audioContext = new Ctx();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(gain, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + durationMs / 1000);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + durationMs / 1000);
  } catch {
    // ignore
  }
}

export const useCallStore = create<CallStore>((set, get) => ({
  calls: initialCalls,
  activeCall: null,
  incomingCall: null,
  selfUserId: null,
  ringtoneSound: null,
  dialToneSound: null,
  ringtoneInterval: null,
  dialToneInterval: null,
  incomingCallTimeouts: new Map(), // ✅ Initialize timeout map
  outgoingCallTimeouts: new Map(), // ✅ Initialize outgoing call timeout map

  setSelfUserId: (userId: string | null) => {
    set({ selfUserId: userId });
  },

  initiateCall: async (currentUserId: string, receiverId: string, listingId: string, type: CallType) => {
    logger.info('CallStore - initiating call to:', receiverId);

    // Create a server-side call invite so the receiver can join the same LiveKit room.
    let callId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    try {
      const res = await trpcClient.call.create.mutate({
        callerId: currentUserId,
        receiverId,
        listingId,
        type,
      });
      if (res?.callId) callId = res.callId;
    } catch (e) {
      logger.warn('[CallStore] Failed to create server call invite, using local callId fallback', e);
    }

    const newCall: Call = {
      id: callId,
      callerId: currentUserId, // ✅ Use actual current user ID
      receiverId,
      listingId,
      type,
      status: 'outgoing',
      startTime: new Date().toISOString(),
      isRead: true,
    };

    // Add to call history
    set((state) => ({
      calls: [newCall, ...state.calls],
    }));

    // Create active call
    const activeCall: ActiveCall = {
      id: callId,
      callerId: currentUserId, // ✅ Use actual current user ID
      receiverId,
      listingId,
      type,
      startTime: new Date().toISOString(),
      isMuted: false,
      isSpeakerOn: false,
      isVideoEnabled: type === 'video',
    };

    set({ activeCall });
    set({ selfUserId: currentUserId });

    // Play dial tone for outgoing call
    await get().playDialTone();

    // Emit via WebSocket if available
    if (realtimeService.isAvailable()) {
      realtimeService.send('call:initiate', {
        callId,
        receiverId,
        type,
        listingId,
      });
      logger.info('[CallStore] Call initiate emitted via WebSocket');
    }

    // If nobody answers within a reasonable time, mark as missed (realistic behavior).
    const ringTimeout = setTimeout(() => {
      const state = get();
      const call = state.calls.find((c) => c.id === callId);
      if (!call) return;
      if (call.status !== 'outgoing') return;

      state.stopAllSounds().catch(() => undefined);

      set((s) => ({
        calls: s.calls.map((c) =>
          c.id === callId
            ? { ...c, status: 'missed' as CallStatus, endTime: new Date().toISOString() }
            : c,
        ),
        activeCall: s.activeCall?.id === callId ? null : s.activeCall,
      }));

      // Best-effort: clear pending invite so receiver doesn't get stale ring
      trpcClient.call.decline.mutate({ callId }).catch(() => undefined);

      const newTimeouts = new Map(get().outgoingCallTimeouts);
      newTimeouts.delete(callId);
      set({ outgoingCallTimeouts: newTimeouts });
    }, 45_000);

    set((state) => ({
      outgoingCallTimeouts: new Map(state.outgoingCallTimeouts).set(callId, ringTimeout as unknown as NodeJS.Timeout),
    }));

    return callId;
  },

  answerCall: (callId: string) => {
    logger.info('CallStore - answering call:', callId);

    const call = get().calls.find(c => c.id === callId);
    if (!call) return;

    // ✅ Clear incoming call timeout if exists
    const timeout = get().incomingCallTimeouts.get(callId);
    if (timeout) {
      clearTimeout(timeout);
      const newTimeouts = new Map(get().incomingCallTimeouts);
      newTimeouts.delete(callId);
      set({ incomingCallTimeouts: newTimeouts });
    }

    // Stop ringtone
    get().stopAllSounds();

    // Inform server that call invite was accepted (clears pending invite)
    trpcClient.call.answer.mutate({ callId }).catch(() => undefined);

    // Notify caller in realtime (removes "fake auto-answer" behavior)
    if (realtimeService.isAvailable()) {
      realtimeService.send('call:answer', { callId, callerId: call.callerId });
    }

    // Ensure native call audio session is active (ringtone stops, call audio starts)
    (async () => {
      const InCallManager = await getInCallManager();
      if (InCallManager?.start) {
        try {
          InCallManager.start({ media: 'audio' });
        } catch (e) {
          logger.debug?.('[CallStore] InCallManager.start failed', e);
        }
      }
    })();

    // Update call status
    set((state) => ({
      calls: state.calls.map(c =>
        c.id === callId
          ? { ...c, status: 'active' as CallStatus }
          : c,
      ),
      incomingCall: null,
    }));

    // Create active call
    const activeCall: ActiveCall = {
      id: callId,
      callerId: call.callerId,
      receiverId: call.receiverId,
      listingId: call.listingId,
      type: call.type,
      startTime: new Date().toISOString(),
      isMuted: false,
      isSpeakerOn: false,
      isVideoEnabled: call.type === 'video',
    };

    set({ activeCall, selfUserId: call.receiverId });
  },

  declineCall: (callId: string) => {
    logger.info('CallStore - declining call:', callId);

    // ✅ Clear incoming call timeout if exists
    const timeout = get().incomingCallTimeouts.get(callId);
    if (timeout) {
      clearTimeout(timeout);
      const newTimeouts = new Map(get().incomingCallTimeouts);
      newTimeouts.delete(callId);
      set({ incomingCallTimeouts: newTimeouts });
    }

    // Stop ringtone
    get().stopAllSounds();

    // Inform server that call invite was declined (clears pending invite)
    trpcClient.call.decline.mutate({ callId }).catch(() => undefined);

    // Notify caller in realtime
    const call = get().calls.find((c) => c.id === callId);
    if (call && realtimeService.isAvailable()) {
      realtimeService.send('call:decline', { callId, callerId: call.callerId });
    }

    // Stop native call audio session if it was started
    (async () => {
      const InCallManager = await getInCallManager();
      if (InCallManager?.stop) {
        try {
          InCallManager.stop();
        } catch (e) {
          logger.debug?.('[CallStore] InCallManager.stop failed', e);
        }
      }
    })();

    set((state) => ({
      calls: state.calls.map(call =>
        call.id === callId
          ? { ...call, status: 'declined' as CallStatus, endTime: new Date().toISOString() }
          : call,
      ),
      incomingCall: null,
    }));

    if (call?.receiverId) {
      set({ selfUserId: call.receiverId });
    }
  },

  endCall: (callId: string) => {
    logger.info('CallStore - ending call:', callId);

    const activeCall = get().activeCall;
    if (!activeCall) return;

    // Stop all sounds
    get().stopAllSounds();

    // Stop native call audio session
    (async () => {
      const InCallManager = await getInCallManager();
      if (InCallManager?.stop) {
        try {
          InCallManager.stop();
        } catch (e) {
          logger.debug?.('[CallStore] InCallManager.stop failed', e);
        }
      }
    })();

    const endTime = new Date().toISOString();
    const startTime = new Date(activeCall.startTime).getTime();

    // ✅ Validate startTime and ensure positive duration
    if (isNaN(startTime)) {
      logger.error('Invalid call startTime, cannot calculate duration');
      set({ activeCall: null });
      return;
    }

    const duration = Math.max(0, Math.floor((new Date(endTime).getTime() - startTime) / 1000));

    set((state) => ({
      calls: state.calls.map(call =>
        call.id === callId
          ? {
            ...call,
            status: 'ended' as CallStatus,
            endTime,
            duration,
          }
          : call,
      ),
      activeCall: null,
    }));

    // Best-effort: clear pending invite if call ended before answer
    trpcClient.call.decline.mutate({ callId }).catch(() => undefined);

    // Notify other participant (so their UI can end the call)
    if (realtimeService.isAvailable()) {
      const selfId = get().selfUserId;
      const otherUserId =
        selfId && activeCall.callerId === selfId ? activeCall.receiverId
          : selfId && activeCall.receiverId === selfId ? activeCall.callerId
            : activeCall.receiverId; // fallback
      if (otherUserId) {
        realtimeService.send('call:end', { callId, otherUserId });
      }
    }
  },

  setCallRecording: (callId: string, recording: Partial<CallRecording>) => {
    if (!callId) return;
    set((state) => ({
      calls: state.calls.map((call) =>
        call.id === callId
          ? {
            ...call,
            recording: {
              ...(call.recording || {}),
              ...recording,
            },
          }
          : call,
      ),
    }));
  },

  toggleMute: () => {
    const nextMuted = !get().activeCall?.isMuted;
    set((state) => ({
      activeCall: state.activeCall
        ? { ...state.activeCall, isMuted: !state.activeCall.isMuted }
        : null,
    }));
    (async () => {
      const InCallManager = await getInCallManager();
      if (InCallManager?.setMicrophoneMute) {
        try {
          InCallManager.setMicrophoneMute(!!nextMuted);
        } catch (e) {
          logger.debug?.('[CallStore] setMicrophoneMute failed', e);
        }
      }
    })();
  },

  toggleSpeaker: () => {
    const nextSpeakerOn = !get().activeCall?.isSpeakerOn;
    set((state) => ({
      activeCall: state.activeCall
        ? { ...state.activeCall, isSpeakerOn: !state.activeCall.isSpeakerOn }
        : null,
    }));
    (async () => {
      const InCallManager = await getInCallManager();
      if (InCallManager?.setSpeakerphoneOn) {
        try {
          InCallManager.setSpeakerphoneOn(!!nextSpeakerOn);
        } catch (e) {
          logger.debug?.('[CallStore] setSpeakerphoneOn failed', e);
        }
      }
    })();
  },

  toggleVideo: () => {
    set((state) => ({
      activeCall: state.activeCall
        ? { ...state.activeCall, isVideoEnabled: !state.activeCall.isVideoEnabled }
        : null,
    }));
  },

  getCallHistory: (userId: string) => {
    return get().calls.filter(call =>
      call.callerId === userId || call.receiverId === userId,
    );
  },

  markCallAsRead: (callId: string) => {
    set((state) => ({
      calls: state.calls.map(call =>
        call.id === callId
          ? { ...call, isRead: true }
          : call,
      ),
    }));
  },

  getMissedCallsCount: (currentUserId: string) => {
    return get().calls.filter(call =>
      call.receiverId === currentUserId &&  // ✅ Use actual current user ID
      call.status === 'missed' &&
      !call.isRead,
    ).length;
  },

  deleteCall: (callId: string) => {
    logger.info('CallStore - deleting call:', callId);
    set((state) => ({
      calls: state.calls.filter(call => call.id !== callId),
    }));
  },

  clearAllCallHistory: () => {
    logger.info('CallStore - clearing all call history');
    set({ calls: [] });
  },

  initializeSounds: async () => {
    if (Platform.OS === 'web') {
      logger.info('Sound initialization skipped for web platform');
      return;
    }

    try {
      logger.info('Initializing sounds (no audio engine required in Expo Go v53)...');
      set({ ringtoneSound: null, dialToneSound: null });
    } catch (error) {
      logger.warn('Sound init fallback used:', error);
      set({ ringtoneSound: null, dialToneSound: null });
    }
  },

  playRingtone: async () => {
    try {
      logger.info('Playing ringtone...');

      if (Platform.OS === 'web') {
        // Web fallback (best-effort). Autoplay might be blocked if not user-initiated.
        webBeep(880, 180, 0.15);
        const ringtoneInterval = setInterval(() => webBeep(880, 180, 0.15), 1000);
        set({ ringtoneInterval: ringtoneInterval as unknown as NodeJS.Timeout });
        return;
      }

      const InCallManager = await getInCallManager();
      if (InCallManager?.startRingtone) {
        InCallManager.startRingtone();
      }

      // Keep haptics as secondary feedback
      const Haptics = await import('expo-haptics');
      if (Haptics?.notificationAsync) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      logger.error('Failed to play ringtone, using fallback:', error);
    }
  },

  playDialTone: async () => {
    try {
      logger.info('Playing dial tone (ringback)...');

      if (Platform.OS === 'web') {
        webBeep(440, 220, 0.12);
        const dialToneInterval = setInterval(() => webBeep(440, 220, 0.12), 2000);
        set({ dialToneInterval: dialToneInterval as unknown as NodeJS.Timeout });
        return;
      }

      const InCallManager = await getInCallManager();
      if (InCallManager?.startRingback) {
        InCallManager.startRingback();
      }

      // Secondary haptic feedback
      const Haptics = await import('expo-haptics');
      if (Haptics?.impactAsync) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      logger.error('Failed to play dial tone, using fallback:', error);
    }
  },

  stopAllSounds: async () => {
    const state = get();

    try {
      logger.info('[CallStore] Stopping all sounds and haptic patterns...');

      if (Platform.OS !== 'web') {
        const InCallManager = await getInCallManager();
        if (InCallManager?.stopRingtone) {
          try {
            InCallManager.stopRingtone();
          } catch (e) {
            logger.debug?.('[CallStore] stopRingtone failed', e);
          }
        }
        if (InCallManager?.stopRingback) {
          try {
            InCallManager.stopRingback();
          } catch (e) {
            logger.debug?.('[CallStore] stopRingback failed', e);
          }
        }
      }

      // Clear haptic intervals
      if (state.ringtoneInterval) {
        clearInterval(state.ringtoneInterval);
        set({ ringtoneInterval: null });
        logger.info('[CallStore] Ringtone interval cleared');
      }
      if (state.dialToneInterval) {
        clearInterval(state.dialToneInterval);
        set({ dialToneInterval: null });
        logger.info('[CallStore] Dial tone interval cleared');
      }

      // Stop and unload any actual sounds if they exist
      if (state.ringtoneSound) {
        try {
          if (state.ringtoneSound.stopAsync) {
            await state.ringtoneSound.stopAsync();
            logger.debug('[CallStore] Ringtone sound stopped');
          }
          // ✅ Unload sound to free memory
          if (state.ringtoneSound.unloadAsync) {
            await state.ringtoneSound.unloadAsync();
            logger.debug('[CallStore] Ringtone sound unloaded');
          }
        } catch (soundError) {
          logger.warn('[CallStore] Error stopping ringtone sound:', soundError);
        }
      }

      if (state.dialToneSound) {
        try {
          if (state.dialToneSound.stopAsync) {
            await state.dialToneSound.stopAsync();
            logger.debug('[CallStore] Dial tone sound stopped');
          }
          // ✅ Unload sound to free memory
          if (state.dialToneSound.unloadAsync) {
            await state.dialToneSound.unloadAsync();
            logger.debug('[CallStore] Dial tone sound unloaded');
          }
        } catch (soundError) {
          logger.warn('[CallStore] Error stopping dial tone sound:', soundError);
        }
      }

      logger.info('[CallStore] All sounds and haptic patterns stopped successfully');
    } catch (error) {
      logger.error('[CallStore] Failed to stop sounds, continuing anyway:', error);
    }
  },

  cleanupSounds: async () => {
    await get().stopAllSounds();

    // ✅ Clear all incoming call timeouts
    const incomingTimeouts = get().incomingCallTimeouts;
    incomingTimeouts.forEach((timeout) => clearTimeout(timeout as NodeJS.Timeout));

    // ✅ Clear all outgoing call timeouts
    const outgoingTimeouts = get().outgoingCallTimeouts;
    outgoingTimeouts.forEach((timeout) => clearTimeout(timeout as NodeJS.Timeout));

    set({
      ringtoneSound: null,
      dialToneSound: null,
      ringtoneInterval: null,
      dialToneInterval: null,
      incomingCallTimeouts: new Map(),
      outgoingCallTimeouts: new Map(),
    });
  },

  simulateIncomingCall: async () => {
    // ✅ REMOVED SIMULATION: This function should not be used in production
    // Use real incoming calls via WebSocket or polling instead
    logger.warn('[CallStore] simulateIncomingCall called - this should not be used in production');
    logger.warn('[CallStore] Use initializeRealtimeListeners() or pollIncomingCalls() instead');
  },

  pollIncomingCalls: async (currentUserId: string) => {
    if (!currentUserId || typeof currentUserId !== 'string') return;
    try {
      const res = await trpcClient.call.getIncoming.query({ userId: currentUserId });
      const next = res?.calls?.[0];
      if (!next) return;

      // If we already show this call, do nothing
      const state = get();
      if (state.incomingCall?.id === next.callId) return;

      const incomingCall: Call = {
        id: next.callId,
        callerId: next.callerId,
        receiverId: next.receiverId,
        listingId: next.listingId,
        type: next.type,
        status: 'incoming',
        startTime: next.createdAt,
        isRead: false,
      };

      set((s) => ({
        calls: [incomingCall, ...s.calls],
        incomingCall,
      }));

      // Play ringtone for incoming call
      get().playRingtone().catch(() => undefined);
    } catch (e) {
      logger.debug?.('[CallStore] pollIncomingCalls failed', e);
    }
  },

  // Initialize WebSocket realtime listeners for calls
  initializeRealtimeListeners: () => {
    logger.info('[CallStore] Initializing realtime listeners');

    if (!realtimeService.isAvailable()) {
      logger.info('[CallStore] Realtime service not available, using polling mode');
      return;
    }

    // Listen for incoming calls
    realtimeService.on('call:incoming', (data) => {
      logger.info('[CallStore] Incoming call via WebSocket:', data.callId);

      const receiverId = get().selfUserId ?? '';
      const incomingCall: Call = {
        id: data.callId,
        callerId: data.callerId,
        receiverId,
        listingId: (data as any).listingId || '',
        type: data.type,
        status: 'incoming',
        startTime: new Date().toISOString(),
        isRead: false,
      };

      set((s) => ({
        calls: [incomingCall, ...s.calls],
        incomingCall,
      }));

      // Play ringtone
      get().playRingtone().catch(() => undefined);

      // Send notification
      if (Platform.OS !== 'web') {
        (async () => {
          try {
            const { notificationService } = await import('@/services/notificationService');
            await notificationService.sendLocalNotification({
              title: data.type === 'video' ? 'Gələn video zəng' : 'Gələn zəng',
              body: `Sizə ${data.type === 'video' ? 'video ' : ''}zəng gəlir`,
              sound: true,
              data: {
                callId: data.callId,
                type: 'incoming_call',
                callerId: data.callerId,
              },
            });
          } catch (error) {
            logger.warn('[CallStore] Notifications not available:', error);
          }
        })();
      }
    });

    // Listen for answered calls
    realtimeService.on('call:answered', (data) => {
      logger.info('[CallStore] Call answered via WebSocket:', data.callId);

      set((state) => ({
        calls: state.calls.map(call =>
          call.id === data.callId
            ? { ...call, status: 'active' as CallStatus }
            : call
        ),
      }));

      get().stopAllSounds();

      // Clear ring timeout if it exists
      const t = get().outgoingCallTimeouts.get(data.callId);
      if (t) {
        clearTimeout(t);
        const newTimeouts = new Map(get().outgoingCallTimeouts);
        newTimeouts.delete(data.callId);
        set({ outgoingCallTimeouts: newTimeouts });
      }
    });

    // Listen for declined calls
    realtimeService.on('call:declined', (data) => {
      logger.info('[CallStore] Call declined via WebSocket:', data.callId);

      set((state) => ({
        calls: state.calls.map(call =>
          call.id === data.callId
            ? { ...call, status: 'declined' as CallStatus, endTime: new Date().toISOString() }
            : call
        ),
        activeCall: state.activeCall?.id === data.callId ? null : state.activeCall,
      }));

      get().stopAllSounds();

      // Clear ring timeout if it exists
      const t = get().outgoingCallTimeouts.get(data.callId);
      if (t) {
        clearTimeout(t);
        const newTimeouts = new Map(get().outgoingCallTimeouts);
        newTimeouts.delete(data.callId);
        set({ outgoingCallTimeouts: newTimeouts });
      }
    });

    // Listen for ended calls
    realtimeService.on('call:ended', (data) => {
      logger.info('[CallStore] Call ended via WebSocket:', data.callId);

      get().endCall(data.callId);
    });

    logger.info('[CallStore] Realtime listeners initialized');
  },

  // Cleanup WebSocket listeners
  cleanupRealtimeListeners: () => {
    logger.info('[CallStore] Cleaning up realtime listeners');
    // Cleanup is handled by realtimeService internally
  },
}));

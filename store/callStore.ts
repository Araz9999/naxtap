import { create } from 'zustand';
import { Call, ActiveCall, CallStatus, CallType } from '@/types/call';
import { users } from '@/mocks/users';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';
import { Audio } from 'expo-av';

interface CallStore {
  calls: Call[];
  activeCall: ActiveCall | null;
  incomingCall: Call | null;
  ringtoneSound: Audio.Sound | null;
  dialToneSound: Audio.Sound | null;
  ringtoneInterval: NodeJS.Timeout | null;
  dialToneInterval: NodeJS.Timeout | null;
  incomingCallTimeouts: Map<string, NodeJS.Timeout>; // ✅ Track timeouts for cleanup
  outgoingCallTimeouts: Map<string, NodeJS.Timeout>; // ✅ Track outgoing call timeouts

  // Call actions
  initiateCall: (currentUserId: string, receiverId: string, listingId: string, type: CallType) => Promise<string>;
  answerCall: (callId: string) => void;
  declineCall: (callId: string) => void;
  endCall: (callId: string) => void;

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
}

// Mock initial calls
const initialCalls: Call[] = [
  {
    id: '1',
    callerId: 'user2',
    receiverId: 'user1',
    listingId: '2',
    type: 'voice',
    status: 'ended',
    startTime: '2023-06-20T15:30:00.000Z',
    endTime: '2023-06-20T15:35:00.000Z',
    duration: 300,
    isRead: true,
  },
  {
    id: '2',
    callerId: 'user1',
    receiverId: 'user3',
    listingId: '3',
    type: 'voice',
    status: 'missed',
    startTime: '2023-06-19T11:15:00.000Z',
    duration: 0,
    isRead: false,
  },
  {
    id: '3',
    callerId: 'user4',
    receiverId: 'user1',
    listingId: '1',
    type: 'voice',
    status: 'ended',
    startTime: '2023-06-18T19:20:00.000Z',
    endTime: '2023-06-18T19:22:00.000Z',
    duration: 120,
    isRead: true,
  },
];

export const useCallStore = create<CallStore>((set, get) => ({
  calls: initialCalls,
  activeCall: null,
  incomingCall: null,
  ringtoneSound: null,
  dialToneSound: null,
  ringtoneInterval: null,
  dialToneInterval: null,
  incomingCallTimeouts: new Map(), // ✅ Initialize timeout map
  outgoingCallTimeouts: new Map(), // ✅ Initialize outgoing call timeout map

  initiateCall: async (currentUserId: string, receiverId: string, listingId: string, type: CallType) => {
    logger.info('CallStore - initiating call to:', receiverId);

    // ✅ Generate unique ID with random component
    const callId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newCall: Call = {
      id: callId,
      callerId: 'user1', // Current user
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

    // Play dial tone for outgoing call
    await get().playDialTone();

    // Simulate call being answered after 3 seconds
    const answerTimeout = setTimeout(() => {
      const currentState = get();
      if (currentState.activeCall?.id === callId) {
        get().stopAllSounds();
        set((state) => ({
          calls: state.calls.map(call =>
            call.id === callId
              ? { ...call, status: 'active' as CallStatus }

              : call,
          ),
        }));
      }

      // ✅ Remove from timeout map after execution
      const newTimeouts = new Map(get().outgoingCallTimeouts);
      newTimeouts.delete(callId);
      set({ outgoingCallTimeouts: newTimeouts });
    }, 3000);

    // ✅ Store timeout for potential cleanup
    set((state) => ({
      outgoingCallTimeouts: new Map(state.outgoingCallTimeouts).set(callId, answerTimeout as unknown as NodeJS.Timeout),
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

    set({ activeCall });
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

    set((state) => ({
      calls: state.calls.map(call =>
        call.id === callId
          ? { ...call, status: 'declined' as CallStatus, endTime: new Date().toISOString() }
          : call,
      ),
      incomingCall: null,
    }));
  },

  endCall: (callId: string) => {
    logger.info('CallStore - ending call:', callId);

    const activeCall = get().activeCall;
    if (!activeCall) return;

    // Stop all sounds
    get().stopAllSounds();

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
  },

  toggleMute: () => {
    set((state) => ({
      activeCall: state.activeCall
        ? { ...state.activeCall, isMuted: !state.activeCall.isMuted }
        : null,
    }));
  },

  toggleSpeaker: () => {
    set((state) => ({
      activeCall: state.activeCall
        ? { ...state.activeCall, isSpeakerOn: !state.activeCall.isSpeakerOn }
        : null,
    }));
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
    if (Platform.OS === 'web') {
      logger.info('Ringtone playback skipped for web platform');
      return;
    }

    try {
      logger.info('Playing ringtone with haptic feedback...');
      const Haptics = await import('expo-haptics');

      if (Haptics && Haptics.notificationAsync) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        logger.info('Initial ringtone haptic feedback played');

        // Create a repeating pattern for incoming call
        const ringtoneInterval = setInterval(async () => {
          try {
            if (Haptics && Haptics.impactAsync) {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
          } catch (error) {
            logger.warn('Haptic feedback interval error:', error);
          }
        }, 1000);

        // Store interval for cleanup
        set({ ringtoneInterval: ringtoneInterval as unknown as NodeJS.Timeout });
      } else {
        logger.warn('Haptics not available, using console notification');
      }
    } catch (error) {
      logger.error('Failed to play ringtone, using fallback:', error);
    }
  },

  playDialTone: async () => {
    if (Platform.OS === 'web') {
      logger.info('Dial tone playback skipped for web platform');
      return;
    }

    try {
      logger.info('Playing dial tone with haptic feedback...');
      const Haptics = await import('expo-haptics');

      if (Haptics && Haptics.impactAsync) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        logger.info('Initial dial tone haptic feedback played');

        // Create a repeating pattern for outgoing call
        const dialToneInterval = setInterval(async () => {
          try {
            if (Haptics && Haptics.impactAsync) {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          } catch (error) {
            logger.warn('Haptic feedback interval error:', error);
          }
        }, 2000);

        // Store interval for cleanup
        set({ dialToneInterval: dialToneInterval as unknown as NodeJS.Timeout });
      } else {
        logger.warn('Haptics not available, using console notification');
      }
    } catch (error) {
      logger.error('Failed to play dial tone, using fallback:', error);
    }
  },

  stopAllSounds: async () => {
    if (Platform.OS === 'web') {
      logger.info('[CallStore] Sound stopping skipped for web platform');
      return;
    }

    const state = get();

    try {
      logger.info('[CallStore] Stopping all sounds and haptic patterns...');

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
    const callers = ['user2', 'user3', 'user4'];
    const listings = ['1', '2', '3'];
    const callTypes: CallType[] = ['voice', 'video'];
    const randomCaller = callers[Math.floor(Math.random() * callers.length)];
    const randomListing = listings[Math.floor(Math.random() * listings.length)];
    const randomCallType = callTypes[Math.floor(Math.random() * callTypes.length)];

    // ✅ Generate unique ID with random component
    const callId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const incomingCall: Call = {
      id: callId,
      callerId: randomCaller,
      receiverId: 'user1',
      listingId: randomListing,
      type: randomCallType,
      status: 'incoming',
      startTime: new Date().toISOString(),
      isRead: false,
    };

    // Add to call history
    set((state) => ({
      calls: [incomingCall, ...state.calls],
      incomingCall,
    }));

    // Play ringtone for incoming call
    if (Platform.OS !== 'web') {
      get().playRingtone();
    }

    // Send notification if supported
    if (Platform.OS !== 'web') {
      (async () => {
        try {
          const { notificationService } = await import('@/services/notificationService');
          const caller = users.find(u => u.id === randomCaller);

          await notificationService.sendLocalNotification({
            title: incomingCall.type === 'video' ? 'Gələn video zəng' : 'Gələn zəng',
            body: `${caller?.name || 'Naməlum istifadəçi'} sizə ${incomingCall.type === 'video' ? 'video ' : ''}zəng edir`,
            sound: true,
            data: {
              callId,
              type: 'incoming_call',
              callerId: randomCaller,
            },
          });
        } catch (error) {
          logger.warn('Notifications not available:', error);
        }
      })();
    }

    // ✅ Auto-decline after 30 seconds if not answered
    const timeout = setTimeout(() => {
      const currentState = get();
      if (currentState.incomingCall?.id === callId) {
        get().declineCall(callId);

        // Mark as missed
        set((state) => ({
          calls: state.calls.map(call =>
            call.id === callId
              ? { ...call, status: 'missed' as CallStatus }
              : call,
          ),
        }));
      }

      // ✅ Remove from timeout map
      const newTimeouts = new Map(get().incomingCallTimeouts);
      newTimeouts.delete(callId);
      set({ incomingCallTimeouts: newTimeouts });
    }, 30000);

    // ✅ Store timeout for potential cleanup
    set((state) => ({
      incomingCallTimeouts: new Map(state.incomingCallTimeouts).set(callId, timeout as unknown as NodeJS.Timeout),
    }));
  },
}));

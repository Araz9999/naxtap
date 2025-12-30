import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ModerationRefreshInterval = 15 | 30 | 60;

export type ModerationSettings = {
  autoRefresh: boolean;
  autoRefreshIntervalSec: ModerationRefreshInterval;
  showResolvedReports: boolean;
  showDismissedReports: boolean;
  notifyOnNewReport: boolean;
};

const DEFAULTS: ModerationSettings = {
  autoRefresh: true,
  autoRefreshIntervalSec: 30,
  showResolvedReports: true,
  showDismissedReports: false,
  notifyOnNewReport: true,
};

type ModerationSettingsState = {
  settings: ModerationSettings;
  setSettings: (patch: Partial<ModerationSettings>) => void;
  reset: () => void;
};

export const useModerationSettingsStore = create<ModerationSettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULTS,
      setSettings: (patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...patch,
          },
        })),
      reset: () => set({ settings: DEFAULTS }),
    }),
    {
      name: 'moderation-settings-v2',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);


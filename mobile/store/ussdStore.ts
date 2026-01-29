import { create } from 'zustand';
import { USSDSession, USSDMessage } from '@/types/ussd';

interface USSDStore {
  currentSession: USSDSession | null;
  sessions: USSDSession[];
  startSession: (code: string, sessionId?: string) => void;
  endSession: () => void;
  addMessage: (message: Omit<USSDMessage, 'id' | 'timestamp'>) => void;
  updateMenuPath: (path: string[]) => void;
  clearHistory: () => void;
  getSessionById: (id: string) => USSDSession | undefined;
  updateLastActivity: () => void;
}

export const useUSSDStore = create<USSDStore>((set, get) => ({
  currentSession: null,
  sessions: [],

  startSession: (code: string, sessionId?: string) => {
    const newSession: USSDSession = {
      id: sessionId || Date.now().toString(),
      code,
      startedAt: new Date().toISOString(),
      isActive: true,
      history: [],
      currentMenuPath: [],
      lastActivity: new Date().toISOString(),
    };

    set((state) => ({
      currentSession: newSession,
      sessions: [...state.sessions, newSession],
    }));
  },

  endSession: () => {
    const { currentSession, sessions } = get();
    if (currentSession) {
      const updatedSessions = sessions.map((session) =>
        session.id === currentSession.id
          ? { ...session, isActive: false }
          : session,
      );

      set({
        currentSession: null,
        sessions: updatedSessions,
      });
    }
  },

  addMessage: (message) => {
    const { currentSession, sessions } = get();
    if (!currentSession) return;

    const newMessage: USSDMessage = {
      ...message,
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toISOString(),
    };

    const updatedSession = {
      ...currentSession,
      history: [...currentSession.history, newMessage],
    };

    const updatedSessions = sessions.map((session) =>
      session.id === currentSession.id ? updatedSession : session,
    );

    set({
      currentSession: updatedSession,
      sessions: updatedSessions,
    });
  },

  updateMenuPath: (path) => {
    const { currentSession, sessions } = get();
    if (!currentSession) return;

    const updatedSession = {
      ...currentSession,
      currentMenuPath: path,
    };

    const updatedSessions = sessions.map((session) =>
      session.id === currentSession.id ? updatedSession : session,
    );

    set({
      currentSession: updatedSession,
      sessions: updatedSessions,
    });
  },

  clearHistory: () => {
    set({ sessions: [] });
  },

  getSessionById: (id: string) => {
    return get().sessions.find((session) => session.id === id);
  },

  updateLastActivity: () => {
    const { currentSession, sessions } = get();
    if (!currentSession) return;

    const updatedSession = {
      ...currentSession,
      lastActivity: new Date().toISOString(),
    };

    const updatedSessions = sessions.map((session) =>
      session.id === currentSession.id ? updatedSession : session,
    );

    set({
      currentSession: updatedSession,
      sessions: updatedSessions,
    });
  },
}));

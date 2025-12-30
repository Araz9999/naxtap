import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';

import { logger } from '@/utils/logger';
export type Language = 'az' | 'ru';

export const [LanguageProvider, useLanguageStore] = createContextHook(() => {
  const [language, setLanguageState] = useState<Language>('az');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const stored = await AsyncStorage.getItem('language-storage');
        if (stored) {
          setLanguageState(stored as Language);
        }
      } catch (error) {
        logger.error('Failed to load language:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = async (newLanguage: Language) => {
    try {
      setLanguageState(newLanguage);
      await AsyncStorage.setItem('language-storage', newLanguage);
    } catch (error) {
      logger.error('Failed to save language:', error);
    }
  };

  return {
    language,
    setLanguage,
    isLoaded,
  };
});

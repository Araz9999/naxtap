import { Alert, Platform } from 'react-native';

import { logger } from '@/utils/logger';
export async function confirm(message: string, title?: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    try {
      const composed = title ? `${title}\n\n${message}` : message;
      // eslint-disable-next-line no-alert
      const ok = window.confirm(composed);
      return ok;
    } catch (e) {
      logger.debug('confirm fallback error', e);
      return true;
    }
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title ?? '',
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'OK', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export async function prompt(message: string, title?: string, defaultValue?: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      const composed = title ? `${title}\n\n${message}` : message;
      // eslint-disable-next-line no-alert
      const result = window.prompt(composed, defaultValue || '');
      return result;
    } catch (e) {
      logger.debug('prompt fallback error', e);
      return null;
    }
  }

  return new Promise<string | null>((resolve) => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        title ?? '',
        message,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          { text: 'OK', onPress: (text) => resolve(text || null) },
        ],
        'plain-text',
        defaultValue,
      );
    } else {
      Alert.alert(
        title ?? '',
        message + '\n\nNote: Text input not available on Android. Please use iOS or web.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          { text: 'OK', onPress: () => resolve(defaultValue || '') },
        ],
        { cancelable: true, onDismiss: () => resolve(null) },
      );
    }
  });
}

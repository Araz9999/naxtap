import { ColorTheme, ThemeMode } from '@/store/themeStore';
import { Platform, Appearance } from 'react-native';

const lightTheme = {
  background: '#F9FAFB',
  backgroundSecondary: '#F3F4F6',
  card: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  placeholder: '#9CA3AF',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
};

const darkTheme = {
  background: '#111827',
  backgroundSecondary: '#1F2937',
  card: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  border: '#374151',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  placeholder: '#6B7280',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#9CA3AF',
  lightGray: '#374151',
};

const colorThemes = {
  default: {
    primary: '#0E7490',
    secondary: '#F59E0B',
  },
  blue: {
    primary: '#3B82F6',
    secondary: '#06B6D4',
  },
  green: {
    primary: '#10B981',
    secondary: '#84CC16',
  },
  purple: {
    primary: '#8B5CF6',
    secondary: '#EC4899',
  },
  orange: {
    primary: '#F97316',
    secondary: '#EAB308',
  },
  red: {
    primary: '#EF4444',
    secondary: '#F59E0B',
  },
};

export const getColors = (themeMode: ThemeMode, colorTheme: ColorTheme) => {
  let isDark = false;

  if (themeMode === 'dark') {
    isDark = true;
  } else if (themeMode === 'auto') {
    if (Platform.OS !== 'web') {
      isDark = Appearance.getColorScheme() === 'dark';
    } else {
      const w = globalThis as any;
      isDark = !!(w && w.matchMedia && w.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }

  const baseTheme = isDark ? darkTheme : lightTheme;
  const colors = colorThemes[colorTheme];

  return {
    ...baseTheme,
    ...colors,
    primaryLight: colors.primary + '20',
  };
};

const Colors = {
  ...lightTheme,
  ...colorThemes.default,
  primaryLight: colorThemes.default.primary + '20',
};

export default Colors;

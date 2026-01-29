import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguageStore, Language } from '@/store/languageStore';
import Colors from '@/constants/colors';
import { Languages } from 'lucide-react-native';

export default function LanguageSwitcher() {
  const languageStore = useLanguageStore();
  const language = languageStore?.language || 'az';
  const setLanguage = languageStore?.setLanguage;
  const isLoaded = languageStore?.isLoaded;

  if (!isLoaded || !setLanguage) {
    return null;
  }

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
  };

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'az', label: 'AZ', flag: '🇦🇿' },
    { code: 'ru', label: 'RU', flag: '🇷🇺' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Languages size={16} color={Colors.primary} />
      </View>
      {languages.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          style={[
            styles.languageButton,
            language === lang.code && styles.activeLanguage,
          ]}
          onPress={() => handleLanguageChange(lang.code)}
        >
          <Text style={styles.flagText}>{lang.flag}</Text>
          <Text
            style={[
              styles.languageText,
              language === lang.code && styles.activeLanguageText,
            ]}
          >
            {lang.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: Colors.card,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    paddingHorizontal: 6,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 2,
  },
  activeLanguage: {
    backgroundColor: Colors.primary,
  },
  flagText: {
    fontSize: 14,
    marginRight: 4,
  },
  languageText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeLanguageText: {
    color: 'white',
  },
});

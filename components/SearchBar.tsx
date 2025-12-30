import React, { useState, memo } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useListingStore } from '@/store/listingStore';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { getColors } from '@/constants/colors';

function SearchBar() {
  const { searchQuery, setSearchQuery, applyFilters } = useListingStore();
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const colors = getColors(themeMode, colorTheme);
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSearch = () => {
    // ✅ Trim and validate search query
    const trimmedQuery = localQuery.trim();

    // ✅ Prevent searching with only whitespace
    if (trimmedQuery.length === 0 && searchQuery.length > 0) {
      handleClear();
      return;
    }

    // ✅ Validate max length (200 characters)
    if (trimmedQuery.length > 200) {
      setLocalQuery(trimmedQuery.substring(0, 200));
      return;
    }

    // ✅ Basic sanitization - remove potentially dangerous characters
    const sanitized = trimmedQuery
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/[<>"']/g, ''); // Remove dangerous chars

    setSearchQuery(sanitized);
    applyFilters();
  };

  const handleClear = () => {
    setLocalQuery('');
    setSearchQuery('');
    applyFilters();
  };

  const placeholder = language === 'az'
    ? 'Nə axtarırsınız?'
    : 'Что вы ищете?';

  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={localQuery}
          onChangeText={(text) => {
            // ✅ Enforce max length on input
            if (text.length <= 200) {
              setLocalQuery(text);
            }
          }}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          maxLength={200}
        />
        {localQuery.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default memo(SearchBar);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
});

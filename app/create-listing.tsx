import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import CreateListingScreen from '@/app/(tabs)/create';
import Colors from '@/constants/colors';

export default function CreateListingModal() {
  const { language } = useLanguageStore();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: language === 'az' ? 'Yeni elan yerləşdir' : 'Разместить новое объявление',
          headerStyle: {
            backgroundColor: Colors.card,
          },
          headerTintColor: Colors.primary,
        }}
      />
      <CreateListingScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUserStore } from '@/store/userStore';
import Colors from '@/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '@/utils/logger';
export default function AuthSuccessScreen() {
  const router = useRouter();
  const { token, user } = useLocalSearchParams();
  const { login } = useUserStore();

  useEffect(() => {
    handleAuthSuccess();
  }, []);

  const handleAuthSuccess = async () => {
    try {
      if (!token || !user) {
        logger.error('[AuthSuccess] Missing token or user data');
        router.replace('/auth/login');
        return;
      }

      let userData;
      try {
        userData = JSON.parse(user as string);
      } catch (error) {
        logger.error('[AuthSuccess] Failed to parse user data:', error);
        router.replace('/auth/login');
        return;
      }
      
      // Store only via unified auth_tokens object
      await AsyncStorage.setItem('auth_tokens', JSON.stringify({
        accessToken: token,
        refreshToken: token,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      }));
      await AsyncStorage.setItem('auth_user', JSON.stringify(userData));

      logger.debug('[AuthSuccess] Login successful, user:', userData.email);

      // ✅ Normalize role to lowercase (backend returns uppercase: ADMIN, MODERATOR, USER)
      const normalizedRole = (userData.role || 'USER').toLowerCase() as 'user' | 'moderator' | 'admin';

      login({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        avatar: userData.avatar || '',
        rating: 0,
        totalRatings: 0,
        memberSince: new Date().toISOString(),
        location: { en: '', ru: '', az: '' },
        balance: 0,
        role: normalizedRole,
        privacySettings: {
          hidePhoneNumber: false,
          allowDirectContact: true,
          onlyAppMessaging: false,
        },
        analytics: {
          lastOnline: new Date().toISOString(),
          messageResponseRate: 0,
          averageResponseTime: 0,
          totalMessages: 0,
          totalResponses: 0,
          isOnline: true,
        },
      });

      setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);
    } catch (error) {
      logger.error('[AuthSuccess] Error processing auth success:', error);
      router.replace('/auth/login');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.text}>Completing login...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: Colors.text,
  },
});

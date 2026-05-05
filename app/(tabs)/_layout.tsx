import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { useUserStore } from '@/store/userStore';
import { getColors } from '@/constants/colors';
import { Search, Plus, MessageCircle, User, Star, Store } from 'lucide-react-native';
import ErrorBoundary from '@/components/ErrorBoundary';
import { trpc } from '@/lib/trpc';


function MessagesTabIcon({ color, size }: { color: string; size: number }) {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const { data } = trpc.chat.getConversations.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });
  const unread = useMemo(
    () => (data ?? []).reduce((acc, c: { unreadCount?: number }) => acc + (c.unreadCount || 0), 0),
    [data],
  );
  return (
    <View style={styles.iconWrap}>
      <MessageCircle size={size} color={color} />
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : String(unread)}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabLayout() {
  const languageStore = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const colors = getColors(themeMode, colorTheme);

  const language = languageStore?.language || 'az';

  return (
    <ErrorBoundary>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Naxtap',
            tabBarIcon: ({ color, size }) => <Star size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: language === 'az' ? 'Axtarış' : 'Поиск',
            tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: language === 'az' ? 'Elan yerləşdir' : 'Разместить',
            tabBarIcon: ({ color, size }) => <Plus size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: language === 'az' ? 'Mesajlar' : 'Сообщения',
            tabBarIcon: ({ color, size }) => <MessagesTabIcon color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="stores"
          options={{
            title: language === 'az' ? 'Mağazalar' : 'Магазины',
            tabBarIcon: ({ color, size }) => <Store size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: language === 'az' ? 'Profil' : 'Профиль',
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
        {/** Hide USSD tab from the bottom navigation - commented out since file doesn't exist */}
        {/* <Tabs.Screen
        name="ussd"
        options={{
          href: null,
        }}
      /> */}
      </Tabs>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  iconWrap: { position: 'relative' },
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});

import React from 'react';
import { Tabs } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { getColors } from '@/constants/colors';
import { Search, Plus, MessageCircle, User, Star, Store } from 'lucide-react-native';


export default function TabLayout() {
  const languageStore = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const colors = getColors(themeMode, colorTheme);

  const language = languageStore?.language || 'az';

  return (
    <>
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
            title: language === 'az' ? 'Axtarış' : language === 'ru' ? 'Поиск' : 'Search',
            tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: language === 'az' ? 'Elan yerləşdir' : language === 'ru' ? 'Разместить' : 'Post Ad',
            tabBarIcon: ({ color, size }) => <Plus size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: language === 'az' ? 'Mesajlar' : language === 'ru' ? 'Сообщения' : 'Messages',
            tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="stores"
          options={{
            title: language === 'az' ? 'Mağazalar' : language === 'ru' ? 'Магазины' : 'Stores',
            tabBarIcon: ({ color, size }) => <Store size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: language === 'az' ? 'Profil' : language === 'ru' ? 'Профиль' : 'Profile',
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
    </>
  );
}

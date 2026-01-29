import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useLanguageStore } from '../../store/languageStore';
import { useThemeStore } from '../../store/themeStore';
import { getColors } from '../../constants/colors';
import { Search, Plus, MessageCircle, User, Star, Store } from 'lucide-react-native';
import ErrorBoundary from '../../components/ErrorBoundary';

// Import screens - these will be created from app/(tabs)/ files
import HomeScreen from '../../screens/(tabs)/HomeScreen';
import SearchScreen from '../../screens/(tabs)/SearchScreen';
import CreateScreen from '../../screens/(tabs)/CreateScreen';
import MessagesScreen from '../../screens/(tabs)/MessagesScreen';
import StoresScreen from '../../screens/(tabs)/StoresScreen';
import ProfileScreen from '../../screens/(tabs)/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const languageStore = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const colors = getColors(themeMode, colorTheme);

  const language = languageStore?.language || 'az';

  return (
    <ErrorBoundary>
      <Tab.Navigator
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
        <Tab.Screen
          name="index"
          component={HomeScreen}
          options={{
            title: 'Naxtap',
            tabBarIcon: ({ color, size }) => <Star size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="search"
          component={SearchScreen}
          options={{
            title: language === 'az' ? 'Axtarış' : language === 'ru' ? 'Поиск' : 'Search',
            tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="create"
          component={CreateScreen}
          options={{
            title: language === 'az' ? 'Elan yerləşdir' : language === 'ru' ? 'Разместить' : 'Post Ad',
            tabBarIcon: ({ color, size }) => <Plus size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="messages"
          component={MessagesScreen}
          options={{
            title: language === 'az' ? 'Mesajlar' : language === 'ru' ? 'Сообщения' : 'Messages',
            tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="stores"
          component={StoresScreen}
          options={{
            title: language === 'az' ? 'Mağazalar' : language === 'ru' ? 'Магазины' : 'Stores',
            tabBarIcon: ({ color, size }) => <Store size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="profile"
          component={ProfileScreen}
          options={{
            title: language === 'az' ? 'Profil' : language === 'ru' ? 'Профиль' : 'Profile',
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
      </Tab.Navigator>
    </ErrorBoundary>
  );
}

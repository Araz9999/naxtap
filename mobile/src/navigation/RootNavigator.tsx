import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useThemeStore } from '../../store/themeStore';
import { getColors } from '../../constants/colors';
import TabNavigator from './TabNavigator';
import ErrorBoundary from '../../components/ErrorBoundary';
import { RootStackParamList } from './types';

// Import all screens - these will be created from app/ files
// For now, we'll create placeholder imports that will be replaced
import ListingDetailScreen from '../../screens/listing/[id]';
import CategoryScreen from '../../screens/category';
import ProfileDetailScreen from '../../screens/profile/[id]';
import ProfileEditScreen from '../../screens/profile/edit';
import LoginScreen from '../../screens/auth/login';
import RegisterScreen from '../../screens/auth/register';
import ForgotPasswordScreen from '../../screens/auth/forgot-password';
import ResetPasswordScreen from '../../screens/auth/reset-password';
import VerifyEmailScreen from '../../screens/auth/verify-email';
import AuthSuccessScreen from '../../screens/auth/success';
import CreateListingScreen from '../../screens/create-listing';
import AboutScreen from '../../screens/about';
import WalletScreen from '../../screens/wallet';
import FavoritesScreen from '../../screens/favorites';
import StoresListScreen from '../../screens/stores';
import MyStoreScreen from '../../screens/my-store';
import StoreCreateScreen from '../../screens/store/create';
import StoreDetailScreen from '../../screens/store/[id]';
import StoreAddListingScreen from '../../screens/store/add-listing/[storeId]';
import StorePromoteScreen from '../../screens/store/promote/[id]';
import ConversationScreen from '../../screens/conversation/[id]';
import SettingsScreen from '../../screens/settings';
import MyListingsScreen from '../../screens/my-listings';
import StoreManagementScreen from '../../screens/store-management';
import StoreEditScreen from '../../screens/store/edit/[id]';
import StoreDiscountsScreen from '../../screens/store/discounts/[id]';
import ListingPromoteScreen from '../../screens/listing/promote/[id]';
import ListingEditScreen from '../../screens/listing/edit/[id]';
import CallScreen from '../../screens/call/[id]';
import CallHistoryScreen from '../../screens/call-history';
import BlockedUsersScreen from '../../screens/blocked-users';
import NotificationsScreen from '../../screens/notifications';
import StoreSettingsScreen from '../../screens/store-settings';
import StoreAnalyticsScreen from '../../screens/store-analytics';
import StoreThemeScreen from '../../screens/store-theme';
import PaymentHistoryScreen from '../../screens/payment-history';
import StoreReviewsScreen from '../../screens/store-reviews';
import ListingAutoRenewalScreen from '../../screens/listing/auto-renewal/[id]';
import SupportScreen from '../../screens/support';
import ModerationScreen from '../../screens/moderation';
import AdminReportsScreen from '../../screens/admin-reports';
import AdminTicketsScreen from '../../screens/admin-tickets';
import AdminUsersScreen from '../../screens/admin-users';
import AdminModeratorsScreen from '../../screens/admin-moderators';
import AdminAnalyticsScreen from '../../screens/admin-analytics';
import AdminModerationSettingsScreen from '../../screens/admin-moderation-settings';
import OperatorDashboardScreen from '../../screens/operator-dashboard';
import LiveChatScreen from '../../screens/live-chat';
import TermsScreen from '../../screens/terms';
import PrivacyScreen from '../../screens/privacy';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { themeMode, colorTheme } = useThemeStore();
  const colors = getColors(themeMode, colorTheme);

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: colors.card,
            },
            headerShadowVisible: false,
            headerTintColor: colors.primary,
            contentStyle: {
              backgroundColor: colors.background,
            },
          }}
        >
          <Stack.Screen name="(tabs)" component={TabNavigator} options={{ headerShown: false }} />
          
          {/* Listing screens */}
          <Stack.Screen
            name="listing/[id]"
            component={ListingDetailScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="listing/promote/[id]"
            component={ListingPromoteScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="listing/edit/[id]"
            component={ListingEditScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="listing/auto-renewal/[id]"
            component={ListingAutoRenewalScreen}
            options={{ title: '', presentation: 'card' }}
          />

          {/* Category */}
          <Stack.Screen
            name="category"
            component={CategoryScreen}
            options={{ title: '', presentation: 'card' }}
          />

          {/* Profile screens */}
          <Stack.Screen
            name="profile/[id]"
            component={ProfileDetailScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="profile/edit"
            component={ProfileEditScreen}
            options={{ title: '', presentation: 'card' }}
          />

          {/* Auth screens */}
          <Stack.Screen
            name="auth/login"
            component={LoginScreen}
            options={{ title: '', presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="auth/register"
            component={RegisterScreen}
            options={{ title: '', presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="auth/forgot-password"
            component={ForgotPasswordScreen}
            options={{ title: '', presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="auth/reset-password"
            component={ResetPasswordScreen}
            options={{ title: '', presentation: 'modal' }}
          />
          <Stack.Screen
            name="auth/verify-email"
            component={VerifyEmailScreen}
            options={{ title: '', presentation: 'modal' }}
          />
          <Stack.Screen
            name="auth/success"
            component={AuthSuccessScreen}
            options={{ title: '', presentation: 'modal', headerShown: false }}
          />

          {/* Main screens */}
          <Stack.Screen
            name="create-listing"
            component={CreateListingScreen}
            options={{ title: '', presentation: 'modal' }}
          />
          <Stack.Screen
            name="about"
            component={AboutScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="wallet"
            component={WalletScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="favorites"
            component={FavoritesScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="stores"
            component={StoresListScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="my-store"
            component={MyStoreScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="store/create"
            component={StoreCreateScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="store/[id]"
            component={StoreDetailScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="store/add-listing/[storeId]"
            component={StoreAddListingScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="store/promote/[id]"
            component={StorePromoteScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="conversation/[id]"
            component={ConversationScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="settings"
            component={SettingsScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="my-listings"
            component={MyListingsScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="store-management"
            component={StoreManagementScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="store/edit/[id]"
            component={StoreEditScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="store/discounts/[id]"
            component={StoreDiscountsScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="call/[id]"
            component={CallScreen}
            options={{ title: '', presentation: 'fullScreenModal', headerShown: false }}
          />
          <Stack.Screen
            name="call-history"
            component={CallHistoryScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="blocked-users"
            component={BlockedUsersScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="notifications"
            component={NotificationsScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="store-settings"
            component={StoreSettingsScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="store-analytics"
            component={StoreAnalyticsScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="store-theme"
            component={StoreThemeScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="payment-history"
            component={PaymentHistoryScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="store-reviews"
            component={StoreReviewsScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="support"
            component={SupportScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="moderation"
            component={ModerationScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="admin-reports"
            component={AdminReportsScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="admin-tickets"
            component={AdminTicketsScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="admin-users"
            component={AdminUsersScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="admin-moderators"
            component={AdminModeratorsScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="admin-analytics"
            component={AdminAnalyticsScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="admin-moderation-settings"
            component={AdminModerationSettingsScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="operator-dashboard"
            component={OperatorDashboardScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="live-chat"
            component={LiveChatScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="terms"
            component={TermsScreen}
            options={{ title: '', presentation: 'card' }}
          />
          <Stack.Screen
            name="privacy"
            component={PrivacyScreen}
            options={{ title: '', presentation: 'card' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}

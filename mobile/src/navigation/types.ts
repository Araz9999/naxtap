import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  '(tabs)': NavigatorScreenParams<TabParamList>;
  'listing/[id]': { id: string };
  category: { categoryId?: string };
  'profile/[id]': { id: string };
  'profile/edit': undefined;
  'auth/login': undefined;
  'auth/register': undefined;
  'auth/forgot-password': undefined;
  'auth/reset-password': { token?: string };
  'auth/verify-email': { token?: string };
  'auth/success': undefined;
  'create-listing': undefined;
  about: undefined;
  wallet: undefined;
  favorites: undefined;
  stores: undefined;
  'my-store': undefined;
  'store/create': undefined;
  'store/[id]': { id: string };
  'store/add-listing/[storeId]': { storeId: string };
  'store/promote/[id]': { id: string };
  'conversation/[id]': { id: string };
  settings: undefined;
  'my-listings': undefined;
  'store-management': undefined;
  'store/edit/[id]': { id: string };
  'store/discounts/[id]': { id: string };
  'listing/promote/[id]': { id: string };
  'listing/edit/[id]': { id: string };
  'call/[id]': { id: string };
  'call-history': undefined;
  'blocked-users': undefined;
  notifications: undefined;
  'store-settings': undefined;
  'store-analytics': undefined;
  'store-theme': undefined;
  'payment-history': undefined;
  'store-reviews': undefined;
  'listing/auto-renewal/[id]': { id: string };
  support: undefined;
  moderation: undefined;
  'admin-reports': undefined;
  'admin-tickets': undefined;
  'admin-users': undefined;
  'admin-moderators': undefined;
  'admin-analytics': undefined;
  'admin-moderation-settings': undefined;
  'operator-dashboard': undefined;
  'live-chat': undefined;
  terms: undefined;
  privacy: undefined;
  'store/promote/[id]': { id: string };
  'store/discounts/[id]': { id: string };
  'store/campaign/create': undefined;
  'store/discount/create': undefined;
  'payment/success': undefined;
  'payment/error': undefined;
  'payment/cancel': undefined;
  'payment/payriff': undefined;
  'payment/card-save': undefined;
  'payriff-test': undefined;
  'payriff-integration-test': undefined;
  'renewal-offers': undefined;
  'saved-cards': undefined;
  topup: undefined;
  transfer: undefined;
  'archived-listings': undefined;
  'create-order': undefined;
  'create-invoice': undefined;
  'discount-help': undefined;
  modal: undefined;
  '+not-found': undefined;
};

export type TabParamList = {
  index: undefined;
  search: undefined;
  create: undefined;
  messages: undefined;
  stores: undefined;
  profile: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

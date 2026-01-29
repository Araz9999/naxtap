import { LocalizedText } from './category';

export type StoreStatus = 'active' | 'grace_period' | 'deactivated' | 'archived';

export interface StoreTheme {
  colorScheme: string;
  layout: string;
}

export interface Store {
  id: string;
  userId: string;
  name: string;
  categoryName: string;
  address: string;
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
    whatsapp?: string;
  };
  description?: string;
  logo?: string;
  coverImage?: string;
  plan: StorePlan;
  adsUsed: number;
  maxAds: number;
  deletedListings: string[]; // IDs of listings deleted before expiration
  isActive: boolean;
  status: StoreStatus;
  createdAt: string;
  expiresAt: string;
  gracePeriodEndsAt?: string; // 7 days after expiration
  deactivatedAt?: string; // When store was deactivated
  archivedAt?: string; // When store was archived
  lastPaymentReminder?: string; // Last payment reminder sent
  followers: string[]; // user IDs who follow this store
  rating: number;
  totalRatings: number;
  theme?: StoreTheme;
  ratingStats?: {
    averageRating: number;
    totalRatings: number;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
}

export interface StoreFollower {
  id: string;
  userId: string;
  storeId: string;
  followedAt: string;
}

export interface StoreNotification {
  id: string;
  storeId: string;
  userId: string; // follower who will receive notification
  listingId: string;
  message: LocalizedText;
  createdAt: string;
  isRead: boolean;
}

export interface StorePlan {
  id: string;
  name: LocalizedText;
  price: number;
  maxAds: number;
  duration: number; // in days
  features: LocalizedText[];
}

export const storePlans: StorePlan[] = [
  {
    id: 'basic',
    name: {
      az: 'Əsas Paket',
      ru: 'Базовый пакет',
    },
    price: 100,
    maxAds: 200,
    duration: 30,
    features: [
      {
        az: '200-ə qədər elan',
        ru: 'До 200 объявлений',
      },
      {
        az: 'Mağaza profili',
        ru: 'Профиль магазина',
      },
      {
        az: 'Əlaqə məlumatları',
        ru: 'Контактная информация',
      },
    ],
  },
  {
    id: 'premium',
    name: {
      az: 'Premium Paket',
      ru: 'Премиум пакет',
    },
    price: 150,
    maxAds: 350,
    duration: 30,
    features: [
      {
        az: '350-ə qədər elan',
        ru: 'До 350 объявлений',
      },
      {
        az: 'Mağaza profili',
        ru: 'Профиль магазина',
      },
      {
        az: 'Əlaqə məlumatları',
        ru: 'Контактная информация',
      },
      {
        az: 'Prioritet dəstək',
        ru: 'Приоритетная поддержка',
      },
    ],
  },
  {
    id: 'business',
    name: {
      az: 'Biznes Paket',
      ru: 'Бизнес пакет',
    },
    price: 200,
    maxAds: 500,
    duration: 30,
    features: [
      {
        az: '500-ə qədər elan',
        ru: 'До 500 объявлений',
      },
      {
        az: 'Mağaza profili',
        ru: 'Профиль магазина',
      },
      {
        az: 'Əlaqə məlumatları',
        ru: 'Контактная информация',
      },
      {
        az: 'Prioritet dəstək',
        ru: 'Приоритетная поддержка',
      },
      {
        az: 'Analitika',
        ru: 'Аналитика',
      },
    ],
  },
];

import { User } from '@/types/user';

export const users: User[] = [
  {
    id: 'user1',
    name: 'Elşən Məmmədov',
    phone: '+994 50 123 45 67',
    email: 'elsen@example.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200',
    rating: 24, // Total rating points
    totalRatings: 5, // Number of ratings (average: 4.8)
    memberSince: new Date('2022-01-15').toISOString(),
    location: {
      az: 'Naxçıvan şəhəri',
      ru: 'город Нахчыван',
    },
    balance: 150,
    role: 'user',
    privacySettings: {
      hidePhoneNumber: false,
      allowDirectContact: true,
      onlyAppMessaging: false,
    },
    analytics: {
      lastOnline: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      messageResponseRate: 95,
      averageResponseTime: 1.5, // 1.5 hours
      totalMessages: 120,
      totalResponses: 114,
      isOnline: false,
    },
  },
  {
    id: 'user2',
    name: 'Aygün Əliyeva',
    phone: '+994 55 234 56 78',
    email: 'aygun@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200',
    rating: 49, // Total rating points
    totalRatings: 10, // Number of ratings (average: 4.9)
    memberSince: new Date('2021-11-20').toISOString(),
    location: {
      az: 'Babək',
      ru: 'Бабек',
    },
    balance: 200,
    role: 'user',
    privacySettings: {
      hidePhoneNumber: true,
      allowDirectContact: false,
      onlyAppMessaging: true,
    },
    analytics: {
      lastOnline: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      messageResponseRate: 90,
      averageResponseTime: 3, // 3 hours
      totalMessages: 85,
      totalResponses: 77,
      isOnline: false,
    },
  },
  {
    id: 'user3',
    name: 'Rəşad Hüseynov',
    phone: '+994 70 345 67 89',
    email: 'rashad@example.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200',
    rating: 23, // Total rating points
    totalRatings: 5, // Number of ratings (average: 4.6)
    memberSince: new Date('2022-03-05').toISOString(),
    location: {
      az: 'Şərur',
      ru: 'Шарур',
    },
    balance: 75,
    role: 'user',
    privacySettings: {
      hidePhoneNumber: false,
      allowDirectContact: true,
      onlyAppMessaging: false,
    },
    analytics: {
      lastOnline: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      messageResponseRate: 88,
      averageResponseTime: 2, // 2 hours
      totalMessages: 65,
      totalResponses: 57,
      isOnline: true,
    },
  },
  {
    id: 'user4',
    name: 'Nigar Məlikova',
    phone: '+994 77 456 78 90',
    email: 'nigar@example.com',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200',
    rating: 28, // Total rating points
    totalRatings: 6, // Number of ratings (average: 4.7)
    memberSince: new Date('2022-02-10').toISOString(),
    location: {
      az: 'Ordubad',
      ru: 'Ордубад',
    },
    balance: 300,
    role: 'user',
    privacySettings: {
      hidePhoneNumber: true,
      allowDirectContact: false,
      onlyAppMessaging: true,
    },
    analytics: {
      lastOnline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      messageResponseRate: 75,
      averageResponseTime: 8, // 8 hours
      totalMessages: 45,
      totalResponses: 34,
      isOnline: false,
    },
  },
  {
    id: 'user5',
    name: 'Tural Qasımov',
    phone: '+994 51 567 89 01',
    email: 'tural@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200',
    rating: 18, // Total rating points
    totalRatings: 4, // Number of ratings (average: 4.5)
    memberSince: new Date('2022-04-15').toISOString(),
    location: {
      az: 'Culfa',
      ru: 'Джульфа',
    },
    balance: 50,
    role: 'user',
    privacySettings: {
      hidePhoneNumber: false,
      allowDirectContact: true,
      onlyAppMessaging: false,
    },
    analytics: {
      lastOnline: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      messageResponseRate: 92,
      averageResponseTime: 1, // 1 hour
      totalMessages: 35,
      totalResponses: 32,
      isOnline: true,
    },
  },
  {
    id: 'user6',
    name: 'Leyla Həsənova',
    phone: '+994 50 678 90 12',
    email: 'leyla@example.com',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200',
    rating: 39, // Total rating points
    totalRatings: 8, // Number of ratings (average: 4.9)
    memberSince: new Date('2021-12-25').toISOString(),
    location: {
      az: 'Şahbuz',
      ru: 'Шахбуз',
    },
    balance: 120,
    role: 'user',
    privacySettings: {
      hidePhoneNumber: false,
      allowDirectContact: true,
      onlyAppMessaging: false,
    },
    analytics: {
      lastOnline: new Date().toISOString(), // Online now
      messageResponseRate: 98,
      averageResponseTime: 0.5, // 30 minutes
      totalMessages: 150,
      totalResponses: 147,
      isOnline: true,
    },
  },
  {
    id: 'user7',
    name: 'Kamran Əhmədov',
    phone: '+994 55 789 01 23',
    email: 'kamran@example.com',
    avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?q=80&w=200',
    rating: 22, // Total rating points
    totalRatings: 5, // Number of ratings (average: 4.4)
    memberSince: new Date('2022-05-20').toISOString(),
    location: {
      az: 'Kəngərli',
      ru: 'Кенгерли',
    },
    balance: 80,
    role: 'user',
    privacySettings: {
      hidePhoneNumber: true,
      allowDirectContact: false,
      onlyAppMessaging: true,
    },
    analytics: {
      lastOnline: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      messageResponseRate: 82,
      averageResponseTime: 4, // 4 hours
      totalMessages: 55,
      totalResponses: 45,
      isOnline: false,
    },
  },
  {
    id: 'user8',
    name: 'Səbinə Rəhimova',
    phone: '+994 70 890 12 34',
    email: 'sabina@example.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200',
    rating: 29, // Total rating points
    totalRatings: 6, // Number of ratings (average: 4.8)
    memberSince: new Date('2022-01-30').toISOString(),
    location: {
      az: 'Sədərək',
      ru: 'Садарак',
    },
    balance: 180,
    role: 'user',
    privacySettings: {
      hidePhoneNumber: false,
      allowDirectContact: true,
      onlyAppMessaging: false,
    },
    analytics: {
      lastOnline: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      messageResponseRate: 94,
      averageResponseTime: 2.5, // 2.5 hours
      totalMessages: 95,
      totalResponses: 89,
      isOnline: false,
    },
  },
];

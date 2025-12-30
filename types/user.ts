import { LocalizedText } from './category';

export type UserRole = 'user' | 'moderator' | 'admin';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  rating: number; // Total rating points
  totalRatings: number; // Number of ratings
  memberSince: string;
  location: LocalizedText;
  balance: number;
  role: UserRole;
  privacySettings: {
    hidePhoneNumber: boolean;
    allowDirectContact: boolean;
    onlyAppMessaging: boolean;
  };
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
  // User analytics
  analytics: {
    lastOnline: string; // ISO date string
    messageResponseRate: number; // Percentage (0-100)
    averageResponseTime: number; // In hours
    totalMessages: number;
    totalResponses: number;
    isOnline: boolean;
  };
  // Moderator specific fields
  moderatorInfo?: {
    assignedDate: string;
    permissions: ModeratorPermission[];
    handledReports: number;
    averageResponseTime: number; // In hours
    isActive: boolean;
  };
}

export type ModeratorPermission =
  | 'manage_reports'
  | 'manage_users'
  | 'manage_listings'
  | 'manage_stores'
  | 'manage_tickets'
  | 'view_analytics'
  | 'manage_moderators';

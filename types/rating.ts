export interface Rating {
  id: string;
  userId: string;
  targetId: string; // store or user ID
  targetType: 'store' | 'user';
  rating: number; // 1-5
  comment?: string;
  createdAt: string;
  updatedAt: string;
  // Anti-fraud fields
  deviceId?: string;
  ipAddress?: string;
  isVerified: boolean;
  transactionId?: string; // Only verified purchases can rate
}

export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  verifiedRatings: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedRatingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface RatingWithUser extends Rating {
  user: {
    id: string;
    name: string;
    avatar: string;
  };
}

export interface RatingValidation {
  canRate: boolean;
  reason?: string;
  cooldownEndsAt?: string;
}

export interface UserRatingHistory {
  userId: string;
  targetId: string;
  targetType: 'store' | 'user';
  lastRatingAt: string;
  ratingCount: number;
}

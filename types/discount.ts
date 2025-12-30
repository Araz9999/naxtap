export interface Discount {
  id: string;
  storeId: string;
  title: string;
  description: string;
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y';
  value: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  applicableListings: string[]; // listing IDs
  startDate: Date;
  endDate: Date;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  hasCountdown?: boolean;
  countdownEndDate?: Date;
  countdownTitle?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  storeId: string;
  title: string;
  description: string;
  type: 'flash_sale' | 'seasonal' | 'clearance' | 'bundle' | 'loyalty';
  discountId?: string;
  featuredListings: string[];
  bannerImage?: string;
  startDate: Date;
  endDate: Date;
  targetAudience: 'all' | 'new_customers' | 'returning_customers';
  isActive: boolean;
  priority: number;
  analytics: {
    views: number;
    clicks: number;
    conversions: number;
    revenue: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DiscountCode {
  id: string;
  discountId: string;
  code: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: Date;
}

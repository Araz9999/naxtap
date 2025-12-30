import { LocalizedText } from './category';

export interface Listing {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  price: number;
  currency: string;
  priceByAgreement?: boolean;
  location: LocalizedText;
  categoryId: number;
  subcategoryId: number;
  subSubcategoryId?: number; // Added sub-subcategory ID (3rd level)
  images: string[];
  userId: string;
  createdAt: string;
  expiresAt: string; // Added expiration date
  deletedAt?: string; // Added early deletion date
  archivedAt?: string; // When listing was auto-archived
  isArchived?: boolean; // Whether listing is archived
  storeId?: string; // Added store association
  storeAddress?: string; // Store address for store listings
  storeContact?: {
    phone?: string;
    email?: string;
    website?: string;
    whatsapp?: string;
  }; // Store contact info for store listings
  views: number;
  favorites: number; // Number of users who favorited this listing
  isFeatured: boolean;
  isPremium: boolean; // Added premium flag
  isVip?: boolean; // Added VIP flag
  adType: 'free' | 'standard' | 'colored' | 'auto-renewal' | 'premium' | 'vip' | 'featured'; // Added ad type
  contactPreference: 'phone' | 'message' | 'both'; // Added contact preference
  condition?: string; // Optional condition field
  deliveryAvailable?: boolean; // Optional delivery availability
  // Discount fields
  originalPrice?: number; // Original price before discount
  discountPercentage?: number; // Discount percentage applied
  hasDiscount?: boolean; // Whether the listing has a discount
  discountEndDate?: string; // When the discount expires
  // Timer bar fields for discounts
  timerBarEnabled?: boolean; // Whether timer bar is enabled
  timerBarTitle?: string; // Title for the timer bar
  timerBarColor?: string; // Color for the timer bar
  timerBarEndDate?: string; // End date for the timer bar
  // Promotion fields
  promotionEndDate?: string; // When the promotion expires
  gracePeriodEndDate?: string; // Grace period end date for non-store paid listings
  purchasedViews?: number; // Number of purchased views
  targetViewsForFeatured?: number; // Target view count to remove from featured
  // Auto-renewal fields
  autoRenewalEnabled?: boolean; // Whether auto-renewal is enabled
  autoRenewalPackageId?: string; // Which package to use for auto-renewal
  autoRenewalPrice?: number; // Price for auto-renewal
  nextRenewalDate?: string; // When the next auto-renewal will happen
  gracePeriodEnd?: string; // 7-day grace period end date for auto-renewal
  autoRenewalPaid?: boolean; // Whether the auto-renewal payment has been made
  autoRenewalUsed?: boolean; // Whether the auto-renewal has been used (activated)
  autoRenewalPaymentDate?: string; // When the auto-renewal payment was made
  // Creative effects
  creativeEffects?: {
    id: string;
    name: { az: string; ru: string };
    type: 'glow' | 'sparkle' | 'pulse' | 'rainbow' | 'fire' | 'star' | 'frame';
    frameType?: 'frame-green-bold' | 'frame-black-bold' | 'frame-az-flag' | 'frame-blue-bold' | 'frame-red-bold';
    color: string;
    endDate: string;
    isActive: boolean;
  }[]; // Creative effects applied to the listing
}

export interface AdPackage {
  id: string;
  name: LocalizedText;
  price: number;
  currency: string;
  duration: number; // in days
  features: {
    featured: boolean;
    premium: boolean;
    autoRenew: boolean;
    priorityPlacement: boolean;
    photosCount: number;
  };
}

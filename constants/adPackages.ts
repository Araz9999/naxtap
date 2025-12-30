import { LocalizedText } from '@/types/category';

export interface AdPackage {
  id: string;
  name: LocalizedText;
  price: number;
  currency: string;
  duration: number; // days
  features: {
    photosCount: number;
    priorityPlacement: boolean;
    featured: boolean;
    autoRenewal: boolean;
    coloredFrame: boolean;
  };
}

export const adPackages: AdPackage[] = [
  {
    id: 'free',
    name: {
      az: 'Pulsuz',
      ru: 'Бесплатно',
      en: 'Free',
    },
    price: 0,
    currency: 'AZN',
    duration: 3,
    features: {
      photosCount: 3,
      priorityPlacement: false,
      featured: false,
      autoRenewal: false,
      coloredFrame: false,
    },
  },
  // Standart 14 gün
  {
    id: 'standard',
    name: {
      az: 'Standart',
      ru: 'Стандарт',
      en: 'Standard',
    },
    price: 3,
    currency: 'AZN',
    duration: 14,
    features: {
      photosCount: 5,
      priorityPlacement: false,
      featured: false,
      autoRenewal: false,
      coloredFrame: false,
    },
  },
  // Standart 30 gün (placed right under Standart 14 gün)
  {
    id: 'standard-30',
    name: {
      az: 'Standart (30 gün)',
      ru: 'Стандарт (30 дней)',
      en: 'Standard (30 days)',
    },
    price: 5,
    currency: 'AZN',
    duration: 30,
    features: {
      photosCount: 8,
      priorityPlacement: false,
      featured: false,
      autoRenewal: false,
      coloredFrame: false,
    },
  },
  // Premium 14 gün
  {
    id: 'premium',
    name: {
      az: 'Premium',
      ru: 'Премиум',
      en: 'Premium',
    },
    price: 8,
    currency: 'AZN',
    duration: 14,
    features: {
      photosCount: 10,
      priorityPlacement: true,
      featured: false,
      autoRenewal: false,
      coloredFrame: true,
    },
  },
  // Premium 30 gün (right under Premium 14 gün)
  {
    id: 'premium-30',
    name: {
      az: 'Premium (30 gün)',
      ru: 'Премиум (30 дней)',
      en: 'Premium (30 days)',
    },
    price: 14,
    currency: 'AZN',
    duration: 30,
    features: {
      photosCount: 18,
      priorityPlacement: true,
      featured: false,
      autoRenewal: false,
      coloredFrame: true,
    },
  },
  // VIP 14 gün
  {
    id: 'vip',
    name: {
      az: 'VIP',
      ru: 'VIP',
      en: 'VIP',
    },
    price: 12,
    currency: 'AZN',
    duration: 14,
    features: {
      photosCount: 15,
      priorityPlacement: true,
      featured: true,
      autoRenewal: true,
      coloredFrame: true,
    },
  },
  // VIP 30 gün (right under VIP 14 gün)
  {
    id: 'vip-30',
    name: {
      az: 'VIP (30 gün)',
      ru: 'VIP (30 дней)',
      en: 'VIP (30 days)',
    },
    price: 18,
    currency: 'AZN',
    duration: 30,
    features: {
      photosCount: 25,
      priorityPlacement: true,
      featured: true,
      autoRenewal: true,
      coloredFrame: true,
    },
  },
];

// Promotion packages for existing store listings
export interface PromotionPackage {
  id: string;
  name: {
    az: string;
    ru: string;
    en?: string;
  };
  price: number;
  currency: string;
  duration: number; // days
  type: 'vip' | 'premium' | 'featured';
  description: {
    az: string;
    ru: string;
    en?: string;
  };
}

export const promotionPackages: PromotionPackage[] = [
  {
    id: 'featured-7',
    name: {
      az: 'Önə Çəkmə (7 gün)',
      ru: 'Выделить (7 дней)',
      en: 'Featured (7 days)',
    },
    price: 2,
    currency: 'AZN',
    duration: 7,
    type: 'featured',
    description: {
      az: 'Elanınız axtarış nəticələrində önə çəkiləcək',
      ru: 'Ваше объявление будет выделено в результатах поиска',
      en: 'Your listing will be featured in search results',
    },
  },
  {
    id: 'featured-14',
    name: {
      az: 'Önə Çəkmə (14 gün)',
      ru: 'Выделить (14 дней)',
      en: 'Featured (14 days)',
    },
    price: 3,
    currency: 'AZN',
    duration: 14,
    type: 'featured',
    description: {
      az: 'Elanınız axtarış nəticələrində önə çəkiləcək',
      ru: 'Ваше объявление будет выделено в результатах поиска',
      en: 'Your listing will be featured in search results',
    },
  },
  {
    id: 'premium-7',
    name: {
      az: 'Premium (7 gün)',
      ru: 'Премиум (7 дней)',
      en: 'Premium (7 days)',
    },
    price: 5,
    currency: 'AZN',
    duration: 7,
    type: 'premium',
    description: {
      az: 'Elanınız premium bölmədə göstəriləcək və daha çox görünəcək',
      ru: 'Ваше объявление будет показано в премиум разделе и получит больше просмотров',
      en: 'Your listing will be shown in premium section and get more views',
    },
  },
  {
    id: 'premium-14',
    name: {
      az: 'Premium (14 gün)',
      ru: 'Премиум (14 дней)',
      en: 'Premium (14 days)',
    },
    price: 8,
    currency: 'AZN',
    duration: 14,
    type: 'premium',
    description: {
      az: 'Elanınız premium bölmədə göstəriləcək və daha çox görünəcək',
      ru: 'Ваше объявление будет показано в премиум разделе и получит больше просмотров',
      en: 'Your listing will be shown in premium section and get more views',
    },
  },
  {
    id: 'vip-7',
    name: {
      az: 'VIP (7 gün)',
      ru: 'VIP (7 дней)',
      en: 'VIP (7 days)',
    },
    price: 8,
    currency: 'AZN',
    duration: 7,
    type: 'vip',
    description: {
      az: 'Elanınız ən yuxarıda göstəriləcək və maksimum görünürlük əldə edəcək',
      ru: 'Ваше объявление будет показано в самом верху и получит максимальную видимость',
      en: 'Your listing will be shown at the top with maximum visibility',
    },
  },
  {
    id: 'vip-14',
    name: {
      az: 'VIP (14 gün)',
      ru: 'VIP (14 дней)',
      en: 'VIP (14 days)',
    },
    price: 12,
    currency: 'AZN',
    duration: 14,
    type: 'vip',
    description: {
      az: 'Elanınız ən yuxarıda göstəriləcək və maksimum görünürlük əldə edəcək',
      ru: 'Ваше объявление будет показано в самом верху и получит максимальную видимость',
      en: 'Your listing will be shown at the top with maximum visibility',
    },
  },
  {
    id: 'vip-30',
    name: {
      az: 'VIP (30 gün)',
      ru: 'VIP (30 дней)',
      en: 'VIP (30 days)',
    },
    price: 18,
    currency: 'AZN',
    duration: 30,
    type: 'vip',
    description: {
      az: 'Elanınız ən yuxarıda göstəriləcək və maksimum görünürlük əldə edəcək',
      ru: 'Ваше объявление будет показано в самом верху и получит максимальную видimость',
      en: 'Your listing will be shown at the top with maximum visibility',
    },
  },
];

// View purchase packages
export interface ViewPackage {
  id: string;
  name: {
    az: string;
    ru: string;
    en?: string;
  };
  views: number;
  price: number;
  currency: string;
  pricePerView: number;
  description: {
    az: string;
    ru: string;
    en?: string;
  };
}

export const viewPackages: ViewPackage[] = [
  {
    id: 'views-100',
    name: {
      az: '100 Baxış',
      ru: '100 Просмотров',
      en: '100 Views',
    },
    views: 100,
    price: 1,
    currency: 'AZN',
    pricePerView: 0.01,
    description: {
      az: '🚀 Elanınızı 100 nəfər əlavə görəcək! Sanki elanınız şəhərin ən məşhur yerində asılıb - daha çox göz, daha çox maraq!',
      ru: '🚀 Ваше объявление увидят 100 дополнительных человек! Как будто ваше объявление висит в самом популярном месте города - больше глаз, больше интереса!',
      en: '🚀 100 additional people will see your listing! As if your ad is placed in the most popular location in the city - more eyes, more interest!',
    },
  },
  {
    id: 'views-500',
    name: {
      az: '500 Baxış',
      ru: '500 Просмотров',
      en: '500 Views',
    },
    views: 500,
    price: 4,
    currency: 'AZN',
    pricePerView: 0.008,
    description: {
      az: '⭐ 500 potensial alıcı elanınızı görəcək! Bu, mərkəzi meydanda reklam lövhəsi qədər güclüdür - maksimum diqqət!',
      ru: '⭐ 500 потенциальных покупателей увидят ваше объявление! Это как рекламный щит на центральной площади - максимум внимания!',
      en: '⭐ 500 potential buyers will see your listing! This is as powerful as a billboard in the central square - maximum attention!',
    },
  },
  {
    id: 'views-1000',
    name: {
      az: '1000 Baxış',
      ru: '1000 Просмотров',
      en: '1000 Views',
    },
    views: 1000,
    price: 7,
    currency: 'AZN',
    pricePerView: 0.007,
    description: {
      az: '🔥 1000 insan elanınızı görəcək! Bu, televiziya reklamı qədər təsirlidir - elanınız hər yerdə danışılacaq!',
      ru: '🔥 1000 человек увидят ваше объявление! Это как телевизионная реклама - о вашем объявлении будут говорить везде!',
      en: '🔥 1000 people will see your listing! This is as effective as TV advertising - everyone will talk about your ad!',
    },
  },
  {
    id: 'views-2500',
    name: {
      az: '2500 Baxış',
      ru: '2500 Просмотров',
      en: '2500 Views',
    },
    views: 2500,
    price: 15,
    currency: 'AZN',
    pricePerView: 0.006,
    description: {
      az: '💎 2500 nəfər elanınızı görəcək! Bu, şəhərin ən böyük reklam kampaniyası kimidir - elanınız viral olacaq!',
      ru: '💎 2500 человек увидят ваше объявление! Это как самая большая рекламная кампания в городе - ваше объявление станет вирусным!',
      en: '💎 2500 people will see your listing! This is like the biggest ad campaign in the city - your ad will go viral!',
    },
  },
  {
    id: 'views-5000',
    name: {
      az: '5000 Baxış',
      ru: '5000 Просмотров',
      en: '5000 Views',
    },
    views: 5000,
    price: 25,
    currency: 'AZN',
    pricePerView: 0.005,
    description: {
      az: '👑 5000 potensial müştəri! Bu, Super Bowl reklamı qədər güclüdür - elanınız əfsanəvi olacaq və hamı onu xatırlayacaq!',
      ru: '👑 5000 потенциальных клиентов! Это как реклама в Супербоуле - ваше объявление станет легендарным и все его запомнят!',
      en: '👑 5000 potential customers! This is as powerful as a Super Bowl ad - your listing will be legendary and everyone will remember it!',
    },
  },
];

// Store renewal packages for expired stores
export interface StoreRenewalPackage {
  id: string;
  name: {
    az: string;
    ru: string;
    en?: string;
  };
  originalPrice: number;
  renewalPrice: number;
  quickRenewalPrice: number; // 7 gün güzəşt müddəti ərzində 20% endirim
  currency: string;
  duration: number; // days
  maxAds: number;
  discount: number; // endirim faizi
  isPopular?: boolean;
  description: {
    az: string;
    ru: string;
    en?: string;
  };
  features: {
    az: string;
    ru: string;
    en?: string;
  }[];
}

export const storeRenewalPackages: StoreRenewalPackage[] = [
  {
    id: 'early-renewal',
    name: {
      az: 'Erkən Yeniləmə',
      ru: 'Раннее Обновление',
      en: 'Early Renewal',
    },
    originalPrice: 100,
    renewalPrice: 80,
    quickRenewalPrice: 80, // 20% endirim
    currency: 'AZN',
    duration: 30,
    maxAds: 200,
    discount: 20,
    isPopular: true,
    description: {
      az: 'Müddət bitməzdən əvvəl yeniləyin və endirim qazanın',
      ru: 'Обновите до истечения срока и получите скидку',
      en: 'Renew before expiration and get a discount',
    },
    features: [
      {
        az: '20% endirim',
        ru: '20% скидка',
        en: '20% discount',
      },
      {
        az: 'Bonus 5 gün',
        ru: 'Бонус 5 дней',
        en: 'Bonus 5 days',
      },
      {
        az: 'Prioritet dəstək',
        ru: 'Приоритетная поддержка',
        en: 'Priority support',
      },
      {
        az: 'Reklam krediti',
        ru: 'Рекламный кредит',
        en: 'Ad credit',
      },
    ],
  },
  {
    id: 'last-minute-offer',
    name: {
      az: 'Son Dəqiqə Təklifi',
      ru: 'Предложение Последней Минуты',
      en: 'Last Minute Offer',
    },
    originalPrice: 100,
    renewalPrice: 90,
    quickRenewalPrice: 90, // 10% endirim
    currency: 'AZN',
    duration: 30,
    maxAds: 200,
    discount: 10,
    description: {
      az: 'Müddət bitməzdən 3 gün əvvəl',
      ru: 'За 3 дня до истечения срока',
      en: '3 days before expiration',
    },
    features: [
      {
        az: '10% endirim',
        ru: '10% скидка',
        en: '10% discount',
      },
      {
        az: 'Dərhal aktivləşmə',
        ru: 'Немедленная активация',
        en: 'Instant activation',
      },
      {
        az: 'Məlumat itikisi yoxdur',
        ru: 'Нет потери данных',
        en: 'No data loss',
      },
    ],
  },
  {
    id: 'grace-period-package',
    name: {
      az: 'Güzəşt Müddəti Paketi',
      ru: 'Пакет Льготного Периода',
      en: 'Grace Period Package',
    },
    originalPrice: 100,
    renewalPrice: 93,
    quickRenewalPrice: 93, // 7% endirim
    currency: 'AZN',
    duration: 30,
    maxAds: 200,
    discount: 7,
    description: {
      az: 'Güzəşt müddətində yeniləyin (30 gün ərzində)',
      ru: 'Обновите в льготный период (в течение 30 дней)',
      en: 'Renew during grace period (within 30 days)',
    },
    features: [
      {
        az: '7% endirim',
        ru: '7% скидка',
        en: '7% discount',
      },
      {
        az: 'Məlumatlar qorunur',
        ru: 'Данные сохраняются',
        en: 'Data preserved',
      },
      {
        az: 'Reytinq saxlanılır',
        ru: 'Рейтинг сохраняется',
        en: 'Rating retained',
      },
      {
        az: 'İzləyicilər qalır',
        ru: 'Подписчики остаются',
        en: 'Followers remain',
      },
    ],
  },
];

// Listing renewal packages for expired listings
export interface RenewalPackage {
  id: string;
  name: {
    az: string;
    ru: string;
    en?: string;
  };
  originalPrice: number;
  renewalPrice: number;
  quickRenewalPrice: number; // 10% discount
  currency: string;
  duration: number; // days
  features: {
    photosCount: number;
    priorityPlacement: boolean;
    featured: boolean;
    autoRenewal: boolean;
    coloredFrame: boolean;
  };
  description: {
    az: string;
    ru: string;
    en?: string;
  };
}

export const renewalPackages: RenewalPackage[] = [
  {
    id: 'free-renewal',
    name: {
      az: 'Pulsuz Yeniləmə',
      ru: 'Бесплатное Обновление',
      en: 'Free Renewal',
    },
    originalPrice: 0,
    renewalPrice: 0,
    quickRenewalPrice: 0,
    currency: 'AZN',
    duration: 3,
    features: {
      photosCount: 3,
      priorityPlacement: false,
      featured: false,
      autoRenewal: false,
      coloredFrame: false,
    },
    description: {
      az: 'Elanınızı pulsuz olaraq 3 gün ərzində yeniləyin',
      ru: 'Обновите ваше объявление бесплатно на 3 дня',
      en: 'Renew your listing for free for 3 days',
    },
  },
  {
    id: 'colored-renewal',
    name: {
      az: 'Rəngli Çərçivə Yeniləmə',
      ru: 'Обновление с Цветной Рамкой',
      en: 'Colored Frame Renewal',
    },
    originalPrice: 3,
    renewalPrice: 3,
    quickRenewalPrice: 2.7, // 10% discount
    currency: 'AZN',
    duration: 7,
    features: {
      photosCount: 5,
      priorityPlacement: false,
      featured: false,
      autoRenewal: false,
      coloredFrame: true,
    },
    description: {
      az: 'Elanınızı rəngli çərçivə ilə 7 gün ərzində yeniləyin',
      ru: 'Обновите ваше объявление с цветной рамкой на 7 дней',
      en: 'Renew your listing with colored frame for 7 days',
    },
  },
  {
    id: 'auto-renewal-renewal',
    name: {
      az: 'Avtomatik Yeniləmə',
      ru: 'Автообновление',
      en: 'Auto Renewal',
    },
    originalPrice: 5,
    renewalPrice: 5,
    quickRenewalPrice: 4.5, // 10% discount
    currency: 'AZN',
    duration: 14,
    features: {
      photosCount: 7,
      priorityPlacement: false,
      featured: false,
      autoRenewal: true,
      coloredFrame: false,
    },
    description: {
      az: 'Elanınızı avtomatik yeniləmə ilə 14 gün ərzində yeniləyin',
      ru: 'Обновите ваше объявление с автообновлением на 14 дней',
      en: 'Renew your listing with auto-renewal for 14 days',
    },
  },
  {
    id: 'premium-renewal',
    name: {
      az: 'Premium Yeniləmə',
      ru: 'Премиум Обновление',
      en: 'Premium Renewal',
    },
    originalPrice: 5,
    renewalPrice: 5,
    quickRenewalPrice: 4.5, // 10% discount
    currency: 'AZN',
    duration: 14,
    features: {
      photosCount: 10,
      priorityPlacement: true,
      featured: false,
      autoRenewal: false,
      coloredFrame: true,
    },
    description: {
      az: 'Elanınızı premium xüsusiyyətlərlə 14 gün ərzində yeniləyin',
      ru: 'Обновите ваше объявление с премиум функциями на 14 дней',
      en: 'Renew your listing with premium features for 14 days',
    },
  },
  {
    id: 'vip-renewal',
    name: {
      az: 'VIP Yeniləmə',
      ru: 'VIP Обновление',
      en: 'VIP Renewal',
    },
    originalPrice: 8,
    renewalPrice: 8,
    quickRenewalPrice: 7.2, // 10% discount
    currency: 'AZN',
    duration: 30,
    features: {
      photosCount: 15,
      priorityPlacement: true,
      featured: true,
      autoRenewal: true,
      coloredFrame: true,
    },
    description: {
      az: 'Elanınızı VIP xüsusiyyətlərlə 30 gün ərzində yeniləyin',
      ru: 'Обновите ваше объявление с VIP функциями на 30 дней',
      en: 'Renew your listing with VIP features for 30 days',
    },
  },
];

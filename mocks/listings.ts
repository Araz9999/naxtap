import { Listing } from '@/types/listing';

// Helper function to calculate expiration date
const getExpirationDate = (createdAt: string, days: number) => {
  const date = new Date(createdAt);
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export const listings: Listing[] = [
  {
    id: 'test-frame-effects',
    title: {
      az: 'Test Çərçivə Effektləri - BMW X5',
      ru: 'Тест Рамочных Эффектов - BMW X5',
    },
    description: {
      az: 'Bu elan çərçivə effektlərini test etmək üçündür. BMW X5 2020-ci il.',
      ru: 'Это объявление для тестирования рамочных эффектов. BMW X5 2020 года.',
    },
    price: 85000,
    currency: 'AZN',
    location: {
      az: 'Naxçıvan şəhəri',
      ru: 'город Нахчыван',
    },
    categoryId: 3,
    subcategoryId: 301,
    images: [
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1000',
    ],
    userId: 'user1',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    expiresAt: getExpirationDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), 30),
    views: 156,
    isFeatured: false,
    isPremium: false,
    adType: 'free',
    contactPreference: 'both',
    favorites: 0,
    // Creative effects with frame effects
    creativeEffects: [
      {
        id: 'frame-glowing',
        name: { az: 'Işıqlı Çərçivə', ru: 'Светящаяся Рамка' },
        type: 'frame',
        color: '#00BFFF',
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
        isActive: true,
      },
      {
        id: 'frame-blinking',
        name: { az: 'Yanıb Sönən Çərçivə', ru: 'Мигающая Рамка' },
        type: 'frame',
        color: '#FFD700',
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days from now
        isActive: true,
      },
    ],
  },
  {
    id: '1',
    title: {
      az: 'iPhone 13 Pro, 256GB, Mavi',
      ru: 'iPhone 13 Pro, 256GB, Синий',
    },
    description: {
      az: 'Əla vəziyyətdə iPhone 13 Pro. Heç bir cızığı yoxdur, tam işlək vəziyyətdədir. Orijinal qutusu və aksesuarları var.',
      ru: 'iPhone 13 Pro в отличном состоянии. Без царапин, полностью рабочий. Оригинальная коробка и аксессуары в комплекте.',
    },
    price: 1800,
    currency: 'AZN',
    location: {
      az: 'Naxçıvan şəhəri',
      ru: 'город Нахчыван',
    },
    categoryId: 1,
    subcategoryId: 101,
    images: [
      'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?q=80&w=1000',
      'https://images.unsplash.com/photo-1611472173362-3f53dbd65d80?q=80&w=1000',
    ],
    userId: 'user1',
    storeId: '1', // TechMart Bakı
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    expiresAt: getExpirationDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), 30),
    views: 245,
    isFeatured: true,
    isPremium: true,
    adType: 'vip',
    contactPreference: 'both',
    favorites: 0,
    // Discount fields
    originalPrice: 2200,
    discountPercentage: 18,
    hasDiscount: true,
    discountEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
  },
  {
    id: '2',
    title: {
      az: '3 otaqlı mənzil, Babək rayonu',
      ru: '3-комнатная квартира, Бабекский район',
    },
    description: {
      az: 'Təmirli, işıqlı 3 otaqlı mənzil. Mərkəzi istilik sistemi, 24 saat su və qaz təchizatı. Mərkəzə 5 dəqiqəlik məsafədə.',
      ru: 'Светлая 3-комнатная квартира с ремонтом. Центральное отопление, круглосуточное водо- и газоснабжение. В 5 минутах от центра.',
    },
    price: 210000,
    currency: 'AZN',
    location: {
      az: 'Babək',
      ru: 'Бабек',
    },
    categoryId: 2,
    subcategoryId: 201,
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1000',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1000',
    ],
    userId: 'user2',
    storeId: '2', // Fashion House
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    expiresAt: getExpirationDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), 30),
    views: 187,
    isFeatured: true,
    isPremium: true,
    adType: 'vip',
    contactPreference: 'phone',
    favorites: 0,
    // Discount fields
    originalPrice: 250000,
    discountPercentage: 16,
    hasDiscount: true,
    discountEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
  },
  {
    id: '3',
    title: {
      az: 'Mercedes-Benz E200, 2019',
      ru: 'Mercedes-Benz E200, 2019',
    },
    description: {
      az: 'Ideal vəziyyətdə Mercedes-Benz E200. Tam servis tarixi, bir sahibi olub. Qəzasız.',
      ru: 'Mercedes-Benz E200 в идеальном состоянии. Полная история обслуживания, один владелец. Без аварий.',
    },
    price: 65000,
    currency: 'AZN',
    location: {
      az: 'Şərur',
      ru: 'Шарур',
    },
    categoryId: 3,
    subcategoryId: 301,
    images: [
      'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=1000',
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=1000',
    ],
    userId: 'user3',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    expiresAt: getExpirationDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), 3),
    views: 320,
    isFeatured: false,
    isPremium: false,
    adType: 'free',
    contactPreference: 'both',
    favorites: 0,
  },
  {
    id: '4',
    title: {
      az: 'Web Developer vakansiyası',
      ru: 'Вакансия Web Developer',
    },
    description: {
      az: 'IT şirkəti React və Node.js təcrübəsi olan Web Developer axtarır. Tam iş günü, rəqabətli maaş.',
      ru: 'IT-компания ищет Web Developer с опытом работы с React и Node.js. Полный рабочий день, конкурентная зарплата.',
    },
    price: 2500,
    currency: 'AZN',
    location: {
      az: 'Naxçıvan şəhəri',
      ru: 'город Нахчыван',
    },
    categoryId: 4,
    subcategoryId: 401,
    images: [
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1000',
    ],
    userId: 'user4',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    expiresAt: getExpirationDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), 7),
    views: 98,
    isFeatured: false,
    isPremium: true,
    adType: 'standard',
    contactPreference: 'message',
    favorites: 0,
  },
  {
    id: '5',
    title: {
      az: 'Dəri kurtka, L ölçü',
      ru: 'Кожаная куртка, размер L',
    },
    description: {
      az: 'Orijinal dəri kurtka, az istifadə olunub. L ölçü, qara rəng.',
      ru: 'Оригинальная кожаная куртка, мало использовалась. Размер L, черный цвет.',
    },
    price: 220,
    currency: 'AZN',
    location: {
      az: 'Culfa',
      ru: 'Джульфа',
    },
    categoryId: 5,
    subcategoryId: 501,
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1000',
    ],
    userId: 'user5',
    storeId: '2', // Fashion House
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    expiresAt: getExpirationDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), 3),
    views: 76,
    isFeatured: false,
    isPremium: false,
    adType: 'free',
    contactPreference: 'phone',
    favorites: 0,
    // Discount fields
    originalPrice: 280,
    discountPercentage: 21,
    hasDiscount: true,
  },
  {
    id: '6',
    title: {
      az: 'Künc divan, yeni',
      ru: 'Угловой диван, новый',
    },
    description: {
      az: 'Yeni künc divan, yüksək keyfiyyətli parça, rahat və davamlı. Çatdırılma mümkündür.',
      ru: 'Новый угловой диван, высококачественная ткань, удобный и прочный. Возможна доставка.',
    },
    price: 1200,
    currency: 'AZN',
    location: {
      az: 'Ordubad',
      ru: 'Ордубад',
    },
    categoryId: 6,
    subcategoryId: 601,
    images: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1000',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1000',
    ],
    userId: 'user6',
    storeId: '3', // Home & Garden Store
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
    expiresAt: getExpirationDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), 14),
    views: 134,
    isFeatured: true,
    isPremium: true,
    adType: 'premium',
    contactPreference: 'both',
    favorites: 0,
  },
  {
    id: '7',
    title: {
      az: 'Uşaq velosipedi, 5-8 yaş',
      ru: 'Детский велосипед, 5-8 лет',
    },
    description: {
      az: 'Yaxşı vəziyyətdə uşaq velosipedi. Təhlükəsizlik təchizatı ilə birlikdə.',
      ru: 'Детский велосипед в хорошем состоянии. В комплекте с защитным снаряжением.',
    },
    price: 120,
    currency: 'AZN',
    location: {
      az: 'Şahbuz',
      ru: 'Шахбуз',
    },
    categoryId: 7,
    subcategoryId: 704,
    images: [
      'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?q=80&w=1000',
    ],
    userId: 'user2',
    storeId: '2', // Fashion House
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    expiresAt: getExpirationDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), 3),
    views: 45,
    isFeatured: false,
    isPremium: false,
    adType: 'free',
    contactPreference: 'both',
    favorites: 0,
  },
  {
    id: '8',
    title: {
      az: 'Alman çoban iti balaları',
      ru: 'Щенки немецкой овчарки',
    },
    description: {
      az: 'Sağlam və gözəl alman çoban iti balaları. Peyvənd olunub və pasportları var.',
      ru: 'Здоровые и красивые щенки немецкой овчарки. Вакцинированы и имеют паспорта.',
    },
    price: 350,
    currency: 'AZN',
    location: {
      az: 'Kəngərli',
      ru: 'Кенгерли',
    },
    categoryId: 8,
    subcategoryId: 801,
    images: [
      'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?q=80&w=1000',
    ],
    userId: 'user3',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
    expiresAt: getExpirationDate(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), 7),
    views: 89,
    isFeatured: false,
    isPremium: true,
    adType: 'standard',
    contactPreference: 'phone',
    favorites: 0,
  },
  {
    id: '9',
    title: {
      az: 'MacBook Air M2, 256GB',
      ru: 'MacBook Air M2, 256GB',
    },
    description: {
      az: 'Yeni MacBook Air M2 çip ilə. 256GB yaddaş, 8GB RAM. Təzə, qutusunda.',
      ru: 'Новый MacBook Air с чипом M2. 256GB памяти, 8GB RAM. Новый, в коробке.',
    },
    price: 2800,
    currency: 'AZN',
    location: {
      az: 'Naxçıvan şəhəri',
      ru: 'город Нахчыван',
    },
    categoryId: 1,
    subcategoryId: 101,
    images: [
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=1000',
    ],
    userId: 'user1',
    storeId: '1', // TechMart Bakı
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: getExpirationDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), 30),
    views: 156,
    isFeatured: true,
    isPremium: true,
    adType: 'premium',
    contactPreference: 'both',
    favorites: 0,
  },
  {
    id: '10',
    title: {
      az: 'Samsung Galaxy S23, 128GB',
      ru: 'Samsung Galaxy S23, 128GB',
    },
    description: {
      az: 'Samsung Galaxy S23 əla vəziyyətdə. 128GB yaddaş, bütün aksesuarlar var.',
      ru: 'Samsung Galaxy S23 в отличном состоянии. 128GB памяти, все аксессуары в комплекте.',
    },
    price: 1650,
    currency: 'AZN',
    location: {
      az: 'Naxçıvan şəhəri',
      ru: 'город Нахчыван',
    },
    categoryId: 1,
    subcategoryId: 101,
    images: [
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=1000',
    ],
    userId: 'user1',
    storeId: '1', // TechMart Bakı
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: getExpirationDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), 30),
    views: 89,
    isFeatured: false,
    isPremium: true,
    adType: 'standard',
    contactPreference: 'both',
    favorites: 0,
    originalPrice: 1850,
    discountPercentage: 11,
    hasDiscount: true,
  },
  {
    id: '11',
    title: {
      az: 'Qadın yay geyimi, M ölçü',
      ru: 'Женская летняя одежда, размер M',
    },
    description: {
      az: 'Gözəl yay geyimi, M ölçü. Yüksək keyfiyyətli parça, rahat və şık.',
      ru: 'Красивая летняя одежда, размер M. Высококачественная ткань, удобная и стильная.',
    },
    price: 85,
    currency: 'AZN',
    location: {
      az: 'Naxçıvan şəhəri',
      ru: 'город Нахчыван',
    },
    categoryId: 5,
    subcategoryId: 501,
    images: [
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=1000',
    ],
    userId: 'user2',
    storeId: '2', // Fashion House
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: getExpirationDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), 14),
    views: 67,
    isFeatured: false,
    isPremium: false,
    adType: 'free',
    contactPreference: 'both',
    favorites: 0,
  },
];

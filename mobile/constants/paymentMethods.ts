export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  category: 'mobile' | 'bank' | 'digital';
  icon?: string;
}

export const paymentMethods: PaymentMethod[] = [
  // Mobil operatorlar
  {
    id: 'azercell',
    name: 'Azercell',
    description: 'Mobil balansdan ödəniş',
    category: 'mobile',
    icon: '📱',
  },
  {
    id: 'bakcell',
    name: 'Bakcell',
    description: 'Mobil balansdan ödəniş',
    category: 'mobile',
    icon: '📱',
  },
  {
    id: 'nar',
    name: 'Nar Mobile',
    description: 'Mobil balansdan ödəniş',
    category: 'mobile',
    icon: '📱',
  },
  {
    id: 'naxtell',
    name: 'Naxtell',
    description: 'Mobil balansdan ödəniş',
    category: 'mobile',
    icon: '📱',
  },

  // Rəqəmsal ödəniş sistemləri
  {
    id: 'm10',
    name: 'M10',
    description: 'Azərbaycan mobil ödəniş sistemi',
    category: 'digital',
    icon: '💳',
  },
  {
    id: 'millikart',
    name: 'MilliKart',
    description: 'Azərbaycan milli ödəniş sistemi',
    category: 'digital',
    icon: '🏛️',
  },
  {
    id: 'epul',
    name: 'ePul',
    description: 'Elektron pul kisəsi',
    category: 'digital',
    icon: '💰',
  },

  // Banklar
  {
    id: 'kapital',
    name: 'Kapital Bank',
    description: 'Bank kartı ilə ödəniş',
    category: 'bank',
    icon: '🏦',
  },
  {
    id: 'abb',
    name: 'ABB Bank',
    description: 'Bank kartı ilə ödəniş',
    category: 'bank',
    icon: '🏦',
  },
  {
    id: 'pasha',
    name: 'Paşa Bank',
    description: 'Bank kartı ilə ödəniş',
    category: 'bank',
    icon: '🏦',
  },
  {
    id: 'rabitabank',
    name: 'Rabita Bank',
    description: 'Bank kartı ilə ödəniş',
    category: 'bank',
    icon: '🏦',
  },
  {
    id: 'yelo',
    name: 'Yelo Bank',
    description: 'Bank kartı ilə ödəniş',
    category: 'bank',
    icon: '🏦',
  },
  {
    id: 'expressbank',
    name: 'Express Bank',
    description: 'Bank kartı ilə ödəniş',
    category: 'bank',
    icon: '🏦',
  },
  {
    id: 'accessbank',
    name: 'Access Bank',
    description: 'Bank kartı ilə ödəniş',
    category: 'bank',
    icon: '🏦',
  },
  {
    id: 'unibank',
    name: 'Unibank',
    description: 'Bank kartı ilə ödəniş',
    category: 'bank',
    icon: '🏦',
  },
  {
    id: 'turanbank',
    name: 'Turan Bank',
    description: 'Bank kartı ilə ödəniş',
    category: 'bank',
    icon: '🏦',
  },

  // Payriff Payment Gateway
  {
    id: 'payriff',
    name: 'Payriff',
    description: 'Bank kartı və digər ödəniş üsulları',
    category: 'digital',
    icon: '💳',
  },
];

export const getPaymentMethodsByCategory = () => {
  const mobile = paymentMethods.filter(method => method.category === 'mobile');
  const digital = paymentMethods.filter(method => method.category === 'digital');
  const bank = paymentMethods.filter(method => method.category === 'bank');

  return { mobile, digital, bank };
};

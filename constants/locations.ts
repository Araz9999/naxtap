import { LocalizedText } from '@/types/category';

export interface Location {
  id: string;
  name: LocalizedText;
}

export const locations: Location[] = [
  {
    id: 'naxcivan',
    name: {
      az: 'Naxçıvan şəhəri',
      ru: 'Город Нахчыван',
    },
  },
  {
    id: 'babek',
    name: {
      az: 'Babək rayonu',
      ru: 'Бабекский район',
    },
  },
  {
    id: 'culfa',
    name: {
      az: 'Culfa rayonu',
      ru: 'Джульфинский район',
    },
  },
  {
    id: 'kangarli',
    name: {
      az: 'Kəngərli rayonu',
      ru: 'Кенгерлинский район',
    },
  },
  {
    id: 'ordubad',
    name: {
      az: 'Ordubad rayonu',
      ru: 'Ордубадский район',
    },
  },
  {
    id: 'sadarak',
    name: {
      az: 'Sədərək rayonu',
      ru: 'Садаракский район',
    },
  },
  {
    id: 'sahbuz',
    name: {
      az: 'Şahbuz rayonu',
      ru: 'Шахбузский район',
    },
  },
  {
    id: 'sharur',
    name: {
      az: 'Şərur rayonu',
      ru: 'Шарурский район',
    },
  },
];

export interface LocalizedText {
  az: string;
  ru: string;
  en?: string;
}

export interface Subcategory {
  id: number;
  name: LocalizedText;
  subcategories?: Subcategory[];
}

export interface Category {
  id: number;
  name: LocalizedText;
  icon: string;
  subcategories: Subcategory[];
}

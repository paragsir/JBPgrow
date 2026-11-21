export interface ShopStats {
  taps: number;
  good: number;
  bad: number;
  whatsappClicks: number;
  instaClicks: number;
  callClicks: number;
}

export interface PrivateFeedback {
  id: string;
  shopSlug: string;
  shopName: string;
  message: string;
  createdAt: string;
}

export interface ShopRecord {
  slug: string;
  name: string;
  area: string;
  category: string;
  google: string;
  whatsapp: string;
  insta: string;
  greeting: string;
  createdAt: string;
  stats: ShopStats;
}

export interface ShopFormInput {
  name: string;
  area: string;
  category: string;
  google: string;
  whatsapp: string;
  insta: string;
  greeting: string;
}

export type ShopEventType = 'tap' | 'good' | 'bad' | 'whatsapp' | 'insta' | 'call';

export const JABALPUR_AREAS = [
  'Civil Lines',
  'Vijay Nagar',
  'Wright Town',
  'Napier Town',
  'Sadar Bazar',
  'Russel Chowk',
  'Gorakhpur',
  'Madan Mahal',
  'Adhartal',
  'Gwarighat',
  'Barela',
  'Jabalpur',
] as const;

export const SHOP_CATEGORIES = [
  'Cafe & Bakery',
  'Restaurant & Dhaba',
  'Salon & Beauty Studio',
  'Clinic & Healthcare',
  'Fashion & Boutique',
  'Sweets & Mithai',
  'Mobile & Electronics',
  'Jewellery & Gold',
  'Gym & Fitness',
  'Local Store',
] as const;

export const DEFAULT_GREETING = 'Namaste! Aaj ka experience kaisa raha?';

import type { PrivateFeedback, ShopRecord } from '../types';

export function slugifyShopName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'jbp-shop';
}

export function cleanIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function normalizeSafeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Reject dangerous URL schemes explicitly
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (!parsed.hostname.includes('.')) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function buildWhatsAppUrl(phone10: string, message: string): string {
  const clean = cleanIndianPhone(phone10);
  return `https://wa.me/91${clean}?text=${encodeURIComponent(message)}`;
}

/**
 * Encodes minimal shop info into a compact UTF-8 safe base64url payload so
 * NFC/QR links work across any customer device even on static GitHub Pages hosting.
 */
export function encodeShopPayload(shop: ShopRecord): string {
  try {
    const compact = {
      n: shop.name,
      a: shop.area,
      c: shop.category,
      g: shop.google,
      w: shop.whatsapp,
      i: shop.insta,
      m: shop.greeting,
    };
    const json = JSON.stringify(compact);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

export function decodeShopPayload(slug: string, encoded: string): ShopRecord | null {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
    const binary = atob(base64 + pad);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json) as Partial<{
      n: string;
      a: string;
      c: string;
      g: string;
      w: string;
      i: string;
      m: string;
    }>;

    const google = normalizeSafeUrl(data.g || '');
    const insta = normalizeSafeUrl(data.i || '');
    const whatsapp = cleanIndianPhone(data.w || '');

    if (!data.n || !google || whatsapp.length !== 10 || insta === null) {
      return null;
    }

    return {
      slug,
      name: String(data.n).slice(0, 80),
      area: String(data.a || 'Jabalpur').slice(0, 50),
      category: String(data.c || 'Local Store').slice(0, 50),
      google,
      whatsapp,
      insta,
      greeting: String(data.m || 'Namaste! Aaj ka experience kaisa raha?').slice(0, 180),
      createdAt: new Date().toISOString(),
      stats: { taps: 0, good: 0, bad: 0, whatsappClicks: 0, instaClicks: 0, callClicks: 0 },
    };
  } catch {
    return null;
  }
}

export function buildShopShareUrl(slug: string, shop?: ShopRecord): string {
  if (typeof window === 'undefined') {
    return `?shop=${encodeURIComponent(slug)}`;
  }
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('shop', slug);
  // On static hosts (like GitHub Pages), attach compact payload so any phone can open the card
  if (shop && window.location.hostname.endsWith('github.io')) {
    const encoded = encodeShopPayload(shop);
    if (encoded) {
      url.searchParams.set('d', encoded);
    }
  }
  return url.toString();
}

export function formatPhoneDisplay(phone10: string): string {
  const clean = cleanIndianPhone(phone10);
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return `+91 ${clean}`;
}

export function getShopInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'JB';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const LOCAL_STORAGE_KEY = 'growjbp_shops_v2';
const LOCAL_FEEDBACK_KEY = 'growjbp_feedback_v2';
const LEGACY_STORAGE_KEY = 'growjbp_shops';

export const STATIC_SEED_SHOPS: ShopRecord[] = [
  {
    slug: 'sharma-chai-cafe',
    name: 'Sharma Chai & Cafe',
    area: 'Civil Lines',
    category: 'Cafe & Bakery',
    google: 'https://maps.google.com/?q=Sharma+Chai+Cafe+Civil+Lines+Jabalpur',
    whatsapp: '9826012345',
    insta: 'https://instagram.com/sharmachaicafe.jbp',
    greeting: 'Namaste! Aaj ka chai aur snacks ka experience kaisa raha?',
    createdAt: '2026-11-18T09:30:00.000Z',
    stats: { taps: 142, good: 118, bad: 6, whatsappClicks: 24, instaClicks: 39, callClicks: 11 },
  },
  {
    slug: 'narmada-style-studio',
    name: 'Narmada Style Studio',
    area: 'Vijay Nagar',
    category: 'Salon & Beauty Studio',
    google: 'https://maps.google.com/?q=Narmada+Style+Studio+Vijay+Nagar+Jabalpur',
    whatsapp: '9826054321',
    insta: 'https://instagram.com/narmadastylestudio',
    greeting: 'Namaste! Aapka grooming experience kaisa raha?',
    createdAt: '2026-11-19T12:15:00.000Z',
    stats: { taps: 89, good: 74, bad: 3, whatsappClicks: 19, instaClicks: 47, callClicks: 14 },
  },
  {
    slug: 'jabalpur-dental-care',
    name: 'Jabalpur Dental Care',
    area: 'Wright Town',
    category: 'Clinic & Healthcare',
    google: 'https://maps.google.com/?q=Jabalpur+Dental+Care+Wright+Town+Jabalpur',
    whatsapp: '9826098765',
    insta: '',
    greeting: 'Namaste! Aaj ke consultation ka experience kaisa raha?',
    createdAt: '2026-11-20T08:45:00.000Z',
    stats: { taps: 64, good: 56, bad: 2, whatsappClicks: 18, instaClicks: 0, callClicks: 22 },
  },
];

export function readLocalShops(): ShopRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    // Migrate legacy key from original prototype if present
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacyObj = JSON.parse(legacyRaw) as Record<
        string,
        { name?: string; google?: string; whatsapp?: string; insta?: string }
      >;
      return Object.entries(legacyObj).map(([slug, val]) => ({
        slug,
        name: val.name || slug,
        area: 'Jabalpur',
        category: 'Local Store',
        google: val.google || 'https://maps.google.com',
        whatsapp: cleanIndianPhone(val.whatsapp || ''),
        insta: val.insta || '',
        greeting: 'Namaste! Aaj ka experience kaisa raha?',
        createdAt: new Date().toISOString(),
        stats: { taps: 0, good: 0, bad: 0, whatsappClicks: 0, instaClicks: 0, callClicks: 0 },
      }));
    }
  } catch {
    // Ignore malformed localStorage
  }
  return [];
}

export function writeLocalShops(shops: ShopRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(shops));
  } catch {
    // Ignore quota errors
  }
}

export function readLocalFeedback(): PrivateFeedback[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_FEEDBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore malformed localStorage
  }
  return [];
}

export function writeLocalFeedback(feedback: PrivateFeedback[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(feedback));
  } catch {
    // Ignore quota errors
  }
}

export function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

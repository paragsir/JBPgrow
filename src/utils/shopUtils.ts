import type { ShopRecord } from '../types';

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

export function buildShopShareUrl(slug: string): string {
  if (typeof window === 'undefined') {
    return `?shop=${encodeURIComponent(slug)}`;
  }
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('shop', slug);
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
const LEGACY_STORAGE_KEY = 'growjbp_shops';

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

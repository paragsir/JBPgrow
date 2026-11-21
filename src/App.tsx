import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ExternalLink, Plus, Smartphone, X } from 'lucide-react';
import CustomerPage from './components/CustomerPage';
import FeedbackInbox from './components/FeedbackInbox';
import QrStandeePanel from './components/QrStandeePanel';
import ShopDirectory from './components/ShopDirectory';
import ShopForm from './components/ShopForm';
import {
  DEFAULT_GREETING,
  type PrivateFeedback,
  type ShopEventType,
  type ShopFormInput,
  type ShopRecord,
} from './types';
import {
  cleanIndianPhone,
  decodeShopPayload,
  normalizeSafeUrl,
  readLocalFeedback,
  readLocalShops,
  slugifyShopName,
  STATIC_SEED_SHOPS,
  writeLocalFeedback,
  writeLocalShops,
} from './utils/shopUtils';

type AdminTab = 'create' | 'shops' | 'qr' | 'inbox';

const EMPTY_FORM: ShopFormInput = {
  name: '',
  area: 'Civil Lines',
  category: 'Cafe & Bakery',
  google: '',
  whatsapp: '',
  insta: '',
  greeting: DEFAULT_GREETING,
};

interface RouteInfo {
  slug: string | null;
  encodedPayload: string | null;
}

/**
 * Supports GitHub Pages subpath hosting (/JBPgrow/) with both query (?shop=slug)
 * and hash (#/shop/slug or #shop=slug) routing. Any unrecognized route falls back to Home.
 */
function parseRouteFromLocation(): RouteInfo {
  if (typeof window === 'undefined') return { slug: null, encodedPayload: null };

  const params = new URLSearchParams(window.location.search);
  const querySlug = params.get('shop')?.trim().toLowerCase() || null;
  const queryPayload = params.get('d')?.trim() || null;
  if (querySlug) {
    return { slug: querySlug, encodedPayload: queryPayload };
  }

  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  if (hash) {
    if (hash.startsWith('shop/')) {
      const rest = hash.slice(5);
      const [slugPart, hashQuery] = rest.split('?');
      const hParams = new URLSearchParams(hashQuery || '');
      const cleanSlug = slugPart.trim().toLowerCase();
      if (cleanSlug) {
        return { slug: cleanSlug, encodedPayload: hParams.get('d') };
      }
    } else if (hash.includes('shop=')) {
      const hParams = new URLSearchParams(hash);
      const cleanSlug = hParams.get('shop')?.trim().toLowerCase() || null;
      if (cleanSlug) {
        return { slug: cleanSlug, encodedPayload: hParams.get('d') };
      }
    }
  }

  return { slug: null, encodedPayload: null };
}

function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json');
}

function applyLocalStatIncrement(
  shops: ShopRecord[],
  slug: string,
  type: ShopEventType
): ShopRecord[] {
  return shops.map((s) => {
    if (s.slug !== slug) return s;
    const stats = { ...s.stats };
    if (type === 'tap') stats.taps += 1;
    if (type === 'good') stats.good += 1;
    if (type === 'bad') stats.bad += 1;
    if (type === 'whatsapp') stats.whatsappClicks += 1;
    if (type === 'insta') stats.instaClicks += 1;
    if (type === 'call') stats.callClicks += 1;
    return { ...s, stats };
  });
}

export default function App() {
  const [route, setRoute] = useState<RouteInfo>(() => parseRouteFromLocation());
  const [customerShop, setCustomerShop] = useState<ShopRecord | null>(null);
  const [customerLoading, setCustomerLoading] = useState<boolean>(Boolean(route.slug));
  const [routeFallbackNotice, setRouteFallbackNotice] = useState<string | null>(null);
  const [cameFromAdmin, setCameFromAdmin] = useState<boolean>(false);

  // Admin state
  const [activeTab, setActiveTab] = useState<AdminTab>('create');
  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [feedback, setFeedback] = useState<PrivateFeedback[]>([]);
  const [loadingShops, setLoadingShops] = useState<boolean>(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Form state
  const [formValues, setFormValues] = useState<ShopFormInput>(EMPTY_FORM);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [justCreatedShop, setJustCreatedShop] = useState<ShopRecord | null>(null);

  const trackedTapRef = useRef<string | null>(null);

  // Listen to browser back/forward & hash changes
  useEffect(() => {
    const syncRoute = () => {
      setRoute(parseRouteFromLocation());
    };
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  // Load all shops for Admin workspace (works with Express API OR statically on GitHub Pages)
  const fetchAllShops = useCallback(async () => {
    setLoadingShops(true);
    try {
      const res = await fetch('./api/shops');
      if (!res.ok || !isJsonResponse(res)) throw new Error('Static host mode');
      const data = (await res.json()) as {
        shops: ShopRecord[];
        feedback: PrivateFeedback[];
      };
      setShops(data.shops);
      setFeedback(data.feedback || []);
      writeLocalShops(data.shops);
      writeLocalFeedback(data.feedback || []);
      setSelectedSlug((prev) => prev || data.shops[0]?.slug || null);
    } catch {
      const local = readLocalShops();
      const initialShops = local.length > 0 ? local : STATIC_SEED_SHOPS;
      if (local.length === 0) {
        writeLocalShops(initialShops);
      }
      setShops(initialShops);
      setFeedback(readLocalFeedback());
      setSelectedSlug((prev) => prev || initialShops[0]?.slug || null);
    } finally {
      setLoadingShops(false);
    }
  }, []);

  useEffect(() => {
    if (!route.slug) {
      fetchAllShops();
    }
  }, [route.slug, fetchAllShops]);

  // Load single shop when opened in Customer NFC/QR mode (?shop=slug or #/shop/slug)
  useEffect(() => {
    if (!route.slug) {
      setCustomerShop(null);
      setCustomerLoading(false);
      return;
    }

    let cancelled = false;
    setCustomerLoading(true);

    async function loadShop(slug: string, encodedPayload: string | null) {
      // 1. Try backend API when hosted on Node/Express
      try {
        const res = await fetch(`./api/shops/${encodeURIComponent(slug)}`);
        if (res.ok && isJsonResponse(res)) {
          const data = (await res.json()) as { shop: ShopRecord };
          if (!cancelled) {
            setCustomerShop(data.shop);
            setCustomerLoading(false);
          }
          if (trackedTapRef.current !== slug) {
            trackedTapRef.current = slug;
            fetch(`./api/shops/${encodeURIComponent(slug)}/events`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'tap' }),
            }).catch(() => {});
          }
          return;
        }
      } catch {
        // Static GitHub Pages fallback below
      }

      // 2. Check encoded URL payload (?d=...) for cross-device static links
      if (encodedPayload) {
        const decoded = decodeShopPayload(slug, encodedPayload);
        if (decoded && !cancelled) {
          setCustomerShop(decoded);
          setCustomerLoading(false);
          return;
        }
      }

      // 3. Check localStorage and static starter shops
      const localList = readLocalShops();
      const match =
        localList.find((s) => s.slug === slug) ||
        STATIC_SEED_SHOPS.find((s) => s.slug === slug);

      if (!cancelled) {
        if (match) {
          setCustomerShop(match);
          if (trackedTapRef.current !== slug) {
            trackedTapRef.current = slug;
            const updated = applyLocalStatIncrement(
              localList.length > 0 ? localList : STATIC_SEED_SHOPS,
              slug,
              'tap'
            );
            writeLocalShops(updated);
          }
        } else {
          // Fallback directly to Home page instead of showing a blank or 404 screen
          setCustomerShop(null);
          setRouteFallbackNotice(
            `"${slug}" naam ki dukaan nahi mili — isliye Home page dikhaya ja raha hai.`
          );
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('shop');
          cleanUrl.searchParams.delete('d');
          cleanUrl.hash = '';
          window.history.replaceState({}, '', cleanUrl.toString());
          setRoute({ slug: null, encodedPayload: null });
        }
        setCustomerLoading(false);
      }
    }

    loadShop(route.slug, route.encodedPayload);
    return () => {
      cancelled = true;
    };
  }, [route.slug, route.encodedPayload]);

  const navigateToCustomer = (slug: string) => {
    const targetShop = shops.find((s) => s.slug === slug);
    const url = new URL(window.location.href);
    url.hash = '';
    url.searchParams.set('shop', slug);
    url.searchParams.delete('d');
    window.history.pushState({}, '', url.toString());
    trackedTapRef.current = null;
    setCameFromAdmin(true);
    setRouteFallbackNotice(null);
    if (targetShop) {
      setCustomerShop(targetShop);
    }
    setRoute({ slug, encodedPayload: null });
  };

  const navigateBackToAdmin = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('shop');
    url.searchParams.delete('d');
    url.hash = '';
    window.history.pushState({}, '', url.toString());
    setRoute({ slug: null, encodedPayload: null });
  };

  const trackShopEvent = useCallback(
    async (slug: string, type: ShopEventType, message?: string) => {
      try {
        const res = await fetch(`./api/shops/${encodeURIComponent(slug)}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, message }),
        });
        if (res.ok && isJsonResponse(res)) {
          const data = (await res.json()) as {
            shop: ShopRecord;
            feedback: PrivateFeedback | null;
          };
          setShops((prev) => {
            const next = prev.map((s) => (s.slug === data.shop.slug ? data.shop : s));
            writeLocalShops(next);
            return next;
          });
          if (data.feedback) {
            setFeedback((prev) => {
              const next = [data.feedback!, ...prev];
              writeLocalFeedback(next);
              return next;
            });
          }
          return;
        }
      } catch {
        // Static mode fallback below
      }

      // Persist stats and private feedback locally when running statically on GitHub Pages
      setShops((prev) => {
        const next = applyLocalStatIncrement(prev, slug, type);
        writeLocalShops(next);
        return next;
      });
      if (type === 'bad' && message && message.trim()) {
        const shopMatch = shops.find((s) => s.slug === slug) || customerShop;
        const entry: PrivateFeedback = {
          id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          shopSlug: slug,
          shopName: shopMatch?.name || slug,
          message: message.trim().slice(0, 400),
          createdAt: new Date().toISOString(),
        };
        setFeedback((prev) => {
          const next = [entry, ...prev];
          writeLocalFeedback(next);
          return next;
        });
      }
    },
    [shops, customerShop]
  );

  // Handle Create / Update Shop form submit
  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = formValues.name.trim();
    const cleanWa = cleanIndianPhone(formValues.whatsapp);
    const normalizedGoogle = normalizeSafeUrl(formValues.google);
    const normalizedInsta = normalizeSafeUrl(formValues.insta);

    if (!name) {
      setFormError('Dukaan ka naam daalna zaroori hai.');
      return;
    }
    if (!normalizedGoogle) {
      setFormError('Sahi Google Review link paste karein (jaise https://g.page/r/...).');
      return;
    }
    if (cleanWa.length !== 10) {
      setFormError('10-digit WhatsApp number daalein (jaise 98260XXXXX).');
      return;
    }
    if (normalizedInsta === null) {
      setFormError('Instagram link sahi format me daalein (https://instagram.com/...).');
      return;
    }

    const payload: ShopFormInput = {
      name,
      area: formValues.area || 'Jabalpur',
      category: formValues.category || 'Local Store',
      google: normalizedGoogle,
      whatsapp: cleanWa,
      insta: normalizedInsta,
      greeting: formValues.greeting.trim() || DEFAULT_GREETING,
    };

    setSubmitting(true);
    try {
      const endpoint = editingSlug
        ? `./api/shops/${encodeURIComponent(editingSlug)}`
        : './api/shops';
      const method = editingSlug ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!isJsonResponse(res)) {
        throw new Error('Static host mode');
      }

      const data = (await res.json()) as { shop?: ShopRecord; error?: string };
      if (!res.ok || !data.shop) {
        setFormError(data.error || 'Dukaan save karne me dikkat aayi.');
        return;
      }

      const saved = data.shop;
      setShops((prev) => {
        const next = editingSlug
          ? prev.map((s) => (s.slug === saved.slug ? saved : s))
          : [saved, ...prev];
        writeLocalShops(next);
        return next;
      });
      setSelectedSlug(saved.slug);
      setJustCreatedShop(saved);
      setEditingSlug(null);
      setFormValues(EMPTY_FORM);
    } catch {
      // Static GitHub Pages localStorage persistence
      const existingShop = editingSlug
        ? shops.find((s) => s.slug === editingSlug)
        : null;
      let slug = editingSlug || slugifyShopName(payload.name);
      if (!editingSlug && shops.some((s) => s.slug === slug)) {
        let suffix = 2;
        while (shops.some((s) => s.slug === `${slug}-${suffix}`)) {
          suffix += 1;
        }
        slug = `${slug}-${suffix}`;
      }

      const localShop: ShopRecord = {
        slug,
        ...payload,
        createdAt: existingShop?.createdAt || new Date().toISOString(),
        stats: existingShop?.stats || {
          taps: 0,
          good: 0,
          bad: 0,
          whatsappClicks: 0,
          instaClicks: 0,
          callClicks: 0,
        },
      };
      setShops((prev) => {
        const next = editingSlug
          ? prev.map((s) => (s.slug === localShop.slug ? localShop : s))
          : [localShop, ...prev];
        writeLocalShops(next);
        return next;
      });
      setSelectedSlug(localShop.slug);
      setJustCreatedShop(localShop);
      setEditingSlug(null);
      setFormValues(EMPTY_FORM);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditShop = (shop: ShopRecord) => {
    setEditingSlug(shop.slug);
    setFormValues({
      name: shop.name,
      area: shop.area,
      category: shop.category,
      google: shop.google,
      whatsapp: shop.whatsapp,
      insta: shop.insta,
      greeting: shop.greeting || DEFAULT_GREETING,
    });
    setFormError(null);
    setJustCreatedShop(null);
    setSelectedSlug(shop.slug);
    setActiveTab('create');
  };

  const handleDeleteShop = async (slug: string) => {
    try {
      await fetch(`./api/shops/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    } catch {
      // Continue local removal in static mode
    }
    setShops((prev) => {
      const next = prev.filter((s) => s.slug !== slug);
      writeLocalShops(next);
      if (selectedSlug === slug) {
        setSelectedSlug(next[0]?.slug || null);
      }
      return next;
    });
    setFeedback((prev) => {
      const next = prev.filter((f) => f.shopSlug !== slug);
      writeLocalFeedback(next);
      return next;
    });
    if (justCreatedShop?.slug === slug) {
      setJustCreatedShop(null);
    }
  };

  const selectedShop = useMemo(
    () => shops.find((s) => s.slug === selectedSlug) || shops[0] || null,
    [shops, selectedSlug]
  );

  // Live preview shop reflects form inputs while typing on the "create" tab
  const livePreviewShop: ShopRecord = useMemo(() => {
    const hasDraftInput =
      activeTab === 'create' &&
      (formValues.name.trim().length > 0 || editingSlug !== null);

    if (hasDraftInput) {
      return {
        slug: editingSlug || slugifyShopName(formValues.name || 'sharma-cafe'),
        name: formValues.name.trim() || 'Sharma Cafe',
        area: formValues.area || 'Civil Lines',
        category: formValues.category || 'Cafe & Bakery',
        google: formValues.google.trim() || 'https://maps.google.com',
        whatsapp: cleanIndianPhone(formValues.whatsapp) || '9826012345',
        insta: formValues.insta.trim(),
        greeting: formValues.greeting.trim() || DEFAULT_GREETING,
        createdAt: new Date().toISOString(),
        stats: { taps: 0, good: 0, bad: 0, whatsappClicks: 0, instaClicks: 0, callClicks: 0 },
      };
    }

    if (selectedShop) return selectedShop;

    return {
      slug: 'sharma-cafe',
      name: 'Sharma Cafe',
      area: 'Civil Lines',
      category: 'Cafe & Bakery',
      google: 'https://maps.google.com',
      whatsapp: '9826012345',
      insta: 'https://instagram.com/sharmacafe',
      greeting: DEFAULT_GREETING,
      createdAt: new Date().toISOString(),
      stats: { taps: 0, good: 0, bad: 0, whatsappClicks: 0, instaClicks: 0, callClicks: 0 },
    };
  }, [activeTab, formValues, editingSlug, selectedShop]);

  // Aggregate real metrics for the KPI strip
  const totals = useMemo(() => {
    return shops.reduce(
      (acc, s) => {
        acc.taps += s.stats.taps;
        acc.good += s.stats.good;
        acc.bad += s.stats.bad;
        return acc;
      },
      { taps: 0, good: 0, bad: 0 }
    );
  }, [shops]);

  // ---------------------------------------------------------------------------
  // STANDALONE CUSTOMER ROUTE (?shop=slug or #/shop/slug)
  // ---------------------------------------------------------------------------
  if (route.slug) {
    if (customerLoading) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-[420px] rounded-3xl border border-slate-200 bg-white p-8 space-y-5">
            <div className="mx-auto h-14 w-14 animate-pulse rounded-2xl bg-slate-200" />
            <div className="mx-auto h-6 w-48 animate-pulse rounded bg-slate-200" />
            <div className="h-16 w-full animate-pulse rounded-2xl bg-slate-100" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </div>
        </div>
      );
    }

    if (customerShop) {
      return (
        <CustomerPage
          shop={customerShop}
          mode="standalone"
          onTrackEvent={(type, msg) => trackShopEvent(customerShop.slug, type, msg)}
          onBackToAdmin={cameFromAdmin ? navigateBackToAdmin : undefined}
        />
      );
    }
  }

  // ---------------------------------------------------------------------------
  // ADMIN PANEL / HOME PAGE WORKSPACE (Default fallback for all unknown routes)
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Bar: Strict 3-zone contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm no-print">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className="font-display text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Grow<span className="text-emerald-600">JBP</span>
          </button>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav
            aria-label="Primary Workspace Navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {(
              [
                { id: 'create', label: 'Nayi Dukaan' },
                { id: 'shops', label: 'Dukaanein' },
                { id: 'qr', label: 'QR & NFC Kit' },
                { id: 'inbox', label: 'Shikayat Inbox' },
              ] as const
            ).map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-5 transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'font-semibold text-slate-900'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-600" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA Button */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingSlug(null);
                setFormValues(EMPTY_FORM);
                setFormError(null);
                setActiveTab('create');
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Nayi Dukaan</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Strip */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-1.5 md:hidden">
          {(
            [
              { id: 'create', label: 'Nayi Dukaan' },
              { id: 'shops', label: 'Dukaanein' },
              { id: 'qr', label: 'QR & NFC Kit' },
              { id: 'inbox', label: 'Shikayat' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === item.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {routeFallbackNotice && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 no-print">
            <span>{routeFallbackNotice}</span>
            <button
              type="button"
              onClick={() => setRouteFallbackNotice(null)}
              aria-label="Notice band karein"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-amber-800 hover:bg-amber-100 shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Page Heading + KPI Strip */}
        <section className="no-print">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Jabalpur Ke Local Business Ko Grow Karo
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Smart NFC Card aur QR Standee link banayein — khush customers ko Google 5-Star Review par aur shikayat seedha WhatsApp par bhejein.
              </p>
            </div>
            <p className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
              Jabalpur · Madhya Pradesh
            </p>
          </div>

          {/* Full-width 4-column metric bar (single elevation, hairline dividers, tabular-nums) */}
          <div className="mt-6 grid grid-cols-2 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-slate-500">Total Dukaanein</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">
                {shops.length}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-slate-500">Total NFC / QR Taps</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">
                {totals.taps}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-slate-500">5-Star Review Redirects</p>
              <p className="mt-1 font-display text-2xl font-bold text-emerald-700 tabular-nums">
                {totals.good}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-slate-500">Private Feedback Saved</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">
                {totals.bad}
              </p>
            </div>
          </div>
        </section>

        {/* 2-Column Workspace */}
        <section className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Primary Workspace Column */}
          <div className="lg:col-span-7">
            {activeTab === 'create' && (
              <ShopForm
                values={formValues}
                editingSlug={editingSlug}
                submitting={submitting}
                error={formError}
                justCreatedShop={justCreatedShop}
                onChange={setFormValues}
                onSubmit={handleFormSubmit}
                onCancelEdit={() => {
                  setEditingSlug(null);
                  setFormValues(EMPTY_FORM);
                  setFormError(null);
                }}
                onOpenQrKit={(shop) => {
                  setSelectedSlug(shop.slug);
                  setActiveTab('qr');
                }}
                onOpenCustomerView={navigateToCustomer}
              />
            )}

            {activeTab === 'shops' && (
              <ShopDirectory
                shops={shops}
                selectedSlug={selectedShop?.slug || null}
                loading={loadingShops}
                onSelectShop={(shop) => setSelectedSlug(shop.slug)}
                onEditShop={handleEditShop}
                onDeleteShop={handleDeleteShop}
                onOpenQrKit={(shop) => {
                  setSelectedSlug(shop.slug);
                  setActiveTab('qr');
                }}
                onOpenCustomerView={navigateToCustomer}
                onCreateNew={() => {
                  setEditingSlug(null);
                  setFormValues(EMPTY_FORM);
                  setActiveTab('create');
                }}
              />
            )}

            {activeTab === 'qr' && (
              <div className="space-y-4">
                {shops.length > 0 && selectedShop ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                      <label
                        htmlFor="qrShopSelect"
                        className="text-sm font-semibold text-slate-800"
                      >
                        Dukaan Select Karein:
                      </label>
                      <select
                        id="qrShopSelect"
                        value={selectedShop.slug}
                        onChange={(e) => setSelectedSlug(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 focus:border-emerald-600 focus:outline-none"
                      >
                        {shops.map((s) => (
                          <option key={s.slug} value={s.slug}>
                            {s.name} ({s.area})
                          </option>
                        ))}
                      </select>
                    </div>
                    <QrStandeePanel
                      shop={selectedShop}
                      onOpenCustomerView={navigateToCustomer}
                    />
                  </>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                    <p className="font-display text-base font-bold text-slate-900">
                      Pehle ek dukaan add karein
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Dukaan add karne ke baad uska NFC link aur printable QR Standee yahan dikhega.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('create')}
                      className="mt-5 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span>Nayi Dukaan Add Karo</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'inbox' && <FeedbackInbox feedback={feedback} />}
          </div>

          {/* Right Column: Sticky Live Customer Phone Preview */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24 no-print">
            <div className="rounded-2xl border border-slate-200 bg-slate-100/80 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-slate-600" aria-hidden="true" />
                  <span className="font-display text-sm font-bold text-slate-900">
                    Live Customer Tap Preview
                  </span>
                </div>
                {selectedShop && (
                  <button
                    type="button"
                    onClick={() => navigateToCustomer(selectedShop.slug)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0"
                  >
                    <span>Full Screen</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Interactive Customer Page Preview */}
              <CustomerPage
                key={
                  activeTab === 'create'
                    ? editingSlug || 'draft-preview'
                    : selectedShop?.slug || 'default-preview'
                }
                shop={livePreviewShop}
                mode="preview"
                onTrackEvent={(type, msg) => {
                  if (shops.some((s) => s.slug === livePreviewShop.slug)) {
                    trackShopEvent(livePreviewShop.slug, type, msg);
                  }
                }}
              />

              <p className="mt-3 text-center text-xs text-slate-500">
                Upar &ldquo;Bahut Accha&rdquo; ya &ldquo;Theek Nahi&rdquo; click karke live customer flow test karein.
              </p>
            </div>
          </aside>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white no-print">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <p>GrowJBP · Jabalpur Local Business NFC &amp; QR Review Platform</p>
          <p>Civil Lines · Vijay Nagar · Wright Town · Sadar · Napier Town</p>
        </div>
      </footer>
    </div>
  );
}

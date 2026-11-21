import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

interface ShopStats {
  taps: number;
  good: number;
  bad: number;
  whatsappClicks: number;
  instaClicks: number;
  callClicks: number;
}

interface ShopRecord {
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

interface PrivateFeedback {
  id: string;
  shopSlug: string;
  shopName: string;
  message: string;
  createdAt: string;
}

interface StoreData {
  shops: Record<string, ShopRecord>;
  feedback: PrivateFeedback[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'growjbp_store.json');

const SEED_DATA: StoreData = {
  shops: {
    'sharma-chai-cafe': {
      slug: 'sharma-chai-cafe',
      name: 'Sharma Chai & Cafe',
      area: 'Civil Lines',
      category: 'Cafe & Bakery',
      google: 'https://maps.google.com/?q=Sharma+Chai+Cafe+Civil+Lines+Jabalpur',
      whatsapp: '9826012345',
      insta: 'https://instagram.com/sharmachaicafe.jbp',
      greeting: 'Namaste! Aaj ka chai aur snacks ka experience kaisa raha?',
      createdAt: '2026-11-18T09:30:00.000Z',
      stats: {
        taps: 142,
        good: 118,
        bad: 6,
        whatsappClicks: 24,
        instaClicks: 39,
        callClicks: 11,
      },
    },
    'narmada-style-studio': {
      slug: 'narmada-style-studio',
      name: 'Narmada Style Studio',
      area: 'Vijay Nagar',
      category: 'Salon & Beauty Studio',
      google: 'https://maps.google.com/?q=Narmada+Style+Studio+Vijay+Nagar+Jabalpur',
      whatsapp: '9826054321',
      insta: 'https://instagram.com/narmadastylestudio',
      greeting: 'Namaste! Aapka grooming experience kaisa raha?',
      createdAt: '2026-11-19T12:15:00.000Z',
      stats: {
        taps: 89,
        good: 74,
        bad: 3,
        whatsappClicks: 19,
        instaClicks: 47,
        callClicks: 14,
      },
    },
    'jabalpur-dental-care': {
      slug: 'jabalpur-dental-care',
      name: 'Jabalpur Dental Care',
      area: 'Wright Town',
      category: 'Clinic & Healthcare',
      google: 'https://maps.google.com/?q=Jabalpur+Dental+Care+Wright+Town+Jabalpur',
      whatsapp: '9826098765',
      insta: '',
      greeting: 'Namaste! Aaj ke consultation ka experience kaisa raha?',
      createdAt: '2026-11-20T08:45:00.000Z',
      stats: {
        taps: 64,
        good: 56,
        bad: 2,
        whatsappClicks: 18,
        instaClicks: 0,
        callClicks: 22,
      },
    },
  },
  feedback: [
    {
      id: 'fb-seed-1',
      shopSlug: 'sharma-chai-cafe',
      shopName: 'Sharma Chai & Cafe',
      message: 'Evening rush me order thoda late aaya, baaki chai badhiya thi.',
      createdAt: '2026-11-20T14:20:00.000Z',
    },
  ],
};

function ensureStore(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
      return JSON.parse(JSON.stringify(SEED_DATA)) as StoreData;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return {
      shops: parsed.shops && typeof parsed.shops === 'object' ? parsed.shops : {},
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
    };
  } catch {
    return JSON.parse(JSON.stringify(SEED_DATA)) as StoreData;
  }
}

function saveStore(data: StoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist store:', err);
  }
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'jbp-shop';
}

function normalizeUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return '';
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
    const u = new URL(withProtocol);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function cleanPhone(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  const store = ensureStore();

  // List all shops and private feedback
  app.get('/api/shops', (_req, res) => {
    const list = Object.values(store.shops).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json({ shops: list, feedback: store.feedback });
  });

  // Get a single shop by slug (used by customer NFC/QR landing page)
  app.get('/api/shops/:slug', (req, res) => {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    const shop = store.shops[slug];
    if (!shop) {
      res.status(404).json({ error: 'Ye dukaan GrowJBP par nahi mili.' });
      return;
    }
    res.json({ shop });
  });

  // Create a new shop
  app.post('/api/shops', (req, res) => {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
    const area = typeof body.area === 'string' && body.area.trim() ? body.area.trim().slice(0, 50) : 'Jabalpur';
    const category =
      typeof body.category === 'string' && body.category.trim()
        ? body.category.trim().slice(0, 50)
        : 'Local Store';
    const greeting =
      typeof body.greeting === 'string' && body.greeting.trim()
        ? body.greeting.trim().slice(0, 180)
        : 'Namaste! Aaj ka experience kaisa raha?';
    const google = normalizeUrl(body.google);
    const insta = normalizeUrl(body.insta ?? '');
    const whatsapp = cleanPhone(body.whatsapp);

    if (!name) {
      res.status(400).json({ error: 'Dukaan ka naam daalna zaroori hai.' });
      return;
    }
    if (!google) {
      res.status(400).json({ error: 'Sahi Google Review link paste karein (https://...).' });
      return;
    }
    if (whatsapp.length !== 10) {
      res.status(400).json({ error: '10-digit WhatsApp number daalein (jaise 98260XXXXX).' });
      return;
    }
    if (insta === null) {
      res.status(400).json({ error: 'Instagram link sahi format me daalein (https://instagram.com/...).' });
      return;
    }

    let slug = slugify(name);
    if (store.shops[slug]) {
      let suffix = 2;
      while (store.shops[`${slug}-${suffix}`]) {
        suffix += 1;
      }
      slug = `${slug}-${suffix}`;
    }

    const newShop: ShopRecord = {
      slug,
      name,
      area,
      category,
      google,
      whatsapp,
      insta,
      greeting,
      createdAt: new Date().toISOString(),
      stats: {
        taps: 0,
        good: 0,
        bad: 0,
        whatsappClicks: 0,
        instaClicks: 0,
        callClicks: 0,
      },
    };

    store.shops[slug] = newShop;
    saveStore(store);
    res.status(201).json({ shop: newShop });
  });

  // Update an existing shop
  app.put('/api/shops/:slug', (req, res) => {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    const existing = store.shops[slug];
    if (!existing) {
      res.status(404).json({ error: 'Dukaan nahi mili.' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
    const area = typeof body.area === 'string' && body.area.trim() ? body.area.trim().slice(0, 50) : 'Jabalpur';
    const category =
      typeof body.category === 'string' && body.category.trim()
        ? body.category.trim().slice(0, 50)
        : 'Local Store';
    const greeting =
      typeof body.greeting === 'string' && body.greeting.trim()
        ? body.greeting.trim().slice(0, 180)
        : 'Namaste! Aaj ka experience kaisa raha?';
    const google = normalizeUrl(body.google);
    const insta = normalizeUrl(body.insta ?? '');
    const whatsapp = cleanPhone(body.whatsapp);

    if (!name || !google || whatsapp.length !== 10 || insta === null) {
      res.status(400).json({ error: 'Naam, valid Google Link aur 10-digit WhatsApp number check karein.' });
      return;
    }

    const updated: ShopRecord = {
      ...existing,
      name,
      area,
      category,
      google,
      whatsapp,
      insta,
      greeting,
    };

    store.shops[slug] = updated;
    saveStore(store);
    res.json({ shop: updated });
  });

  // Delete a shop
  app.delete('/api/shops/:slug', (req, res) => {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!store.shops[slug]) {
      res.status(404).json({ error: 'Dukaan nahi mili.' });
      return;
    }
    delete store.shops[slug];
    store.feedback = store.feedback.filter((f) => f.shopSlug !== slug);
    saveStore(store);
    res.json({ ok: true });
  });

  // Record a real customer interaction event (tap, good, bad, whatsapp, insta, call)
  app.post('/api/shops/:slug/events', (req, res) => {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    const shop = store.shops[slug];
    if (!shop) {
      res.status(404).json({ error: 'Dukaan nahi mili.' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const type = typeof body.type === 'string' ? body.type : '';
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 400) : '';

    switch (type) {
      case 'tap':
        shop.stats.taps += 1;
        break;
      case 'good':
        shop.stats.good += 1;
        break;
      case 'bad':
        shop.stats.bad += 1;
        break;
      case 'whatsapp':
        shop.stats.whatsappClicks += 1;
        break;
      case 'insta':
        shop.stats.instaClicks += 1;
        break;
      case 'call':
        shop.stats.callClicks += 1;
        break;
      default:
        res.status(400).json({ error: 'Invalid event type.' });
        return;
    }

    let savedFeedback: PrivateFeedback | null = null;
    if (type === 'bad' && message) {
      savedFeedback = {
        id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        shopSlug: shop.slug,
        shopName: shop.name,
        message,
        createdAt: new Date().toISOString(),
      };
      store.feedback.unshift(savedFeedback);
      if (store.feedback.length > 200) {
        store.feedback = store.feedback.slice(0, 200);
      }
    }

    saveStore(store);
    res.json({ shop, feedback: savedFeedback });
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GrowJBP server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  QrCode,
  Search,
  Trash2,
} from 'lucide-react';
import { JABALPUR_AREAS, type ShopRecord } from '../types';
import {
  buildShopShareUrl,
  formatPhoneDisplay,
  formatShortDate,
} from '../utils/shopUtils';

interface ShopDirectoryProps {
  shops: ShopRecord[];
  selectedSlug: string | null;
  loading: boolean;
  onSelectShop: (shop: ShopRecord) => void;
  onEditShop: (shop: ShopRecord) => void;
  onDeleteShop: (slug: string) => void;
  onOpenQrKit: (shop: ShopRecord) => void;
  onOpenCustomerView: (slug: string) => void;
  onCreateNew: () => void;
}

export default function ShopDirectory({
  shops,
  selectedSlug,
  loading,
  onSelectShop,
  onEditShop,
  onDeleteShop,
  onOpenQrKit,
  onOpenCustomerView,
  onCreateNew,
}: ShopDirectoryProps) {
  const [query, setQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);

  const filtered = shops.filter((shop) => {
    const matchesArea = areaFilter === 'ALL' || shop.area === areaFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      shop.name.toLowerCase().includes(q) ||
      shop.area.toLowerCase().includes(q) ||
      shop.category.toLowerCase().includes(q) ||
      shop.whatsapp.includes(q);
    return matchesArea && matchesQuery;
  });

  const handleCopy = async (shop: ShopRecord) => {
    const url = buildShopShareUrl(shop.slug, shop);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopiedSlug(shop.slug);
    window.setTimeout(() => {
      setCopiedSlug((prev) => (prev === shop.slug ? null : prev));
    }, 2000);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Saved Jabalpur Dukaanein
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
            {filtered.length} of {shops.length} businesses active
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Dukaan ya area khojein..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none sm:w-52"
            />
          </div>

          <select
            aria-label="Filter by Jabalpur Area"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Areas</option>
            {JABALPUR_AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="divide-y divide-slate-100 p-5">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="flex items-center justify-between py-4">
              <div className="space-y-2">
                <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-64 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="font-display text-base font-semibold text-slate-800">
            {shops.length === 0
              ? 'Abhi koi dukaan add nahi ki gayi hai'
              : 'Is search ya area me koi dukaan nahi mili'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {shops.length === 0
              ? 'Pehli local dukaan add karein aur turant NFC/QR review link banayein.'
              : 'Search clear karein ya nayi dukaan add karein.'}
          </p>
          <button
            type="button"
            onClick={onCreateNew}
            className="mt-5 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Nayi Dukaan Add Karo</span>
          </button>
        </div>
      )}

      {/* Shop Rows */}
      {!loading && filtered.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {filtered.map((shop) => {
            const isSelected = shop.slug === selectedSlug;
            const isConfirmingDelete = confirmDeleteSlug === shop.slug;

            return (
              <li
                key={shop.slug}
                onClick={() => onSelectShop(shop)}
                className={`cursor-pointer px-5 py-4 transition-colors ${
                  isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50/80'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-display text-base font-bold text-slate-900">
                        {shop.name}
                      </h3>
                      {isSelected && (
                        <span className="text-xs font-semibold text-emerald-700 whitespace-nowrap shrink-0">
                          · Preview Active
                        </span>
                      )}
                    </div>

                    {/* Clean unboxed metadata */}
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                      <span>{shop.area}</span>
                      <span aria-hidden="true">·</span>
                      <span>{shop.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{formatPhoneDisplay(shop.whatsapp)}</span>
                      {shop.createdAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{formatShortDate(shop.createdAt)}</span>
                        </>
                      )}
                    </p>

                    {/* Tabular real counters */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 tabular-nums">
                      <span>
                        <strong className="font-mono font-semibold text-slate-900">
                          {shop.stats.taps}
                        </strong>{' '}
                        Taps
                      </span>
                      <span>
                        <strong className="font-mono font-semibold text-emerald-700">
                          {shop.stats.good}
                        </strong>{' '}
                        Bahut Accha
                      </span>
                      <span>
                        <strong className="font-mono font-semibold text-amber-700">
                          {shop.stats.bad}
                        </strong>{' '}
                        Private Shikayat
                      </span>
                      <span>
                        <strong className="font-mono font-semibold text-slate-900">
                          {shop.stats.whatsappClicks}
                        </strong>{' '}
                        WhatsApp
                      </span>
                    </div>
                  </div>

                  {/* Row Actions */}
                  <div
                    className="flex flex-wrap items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleCopy(shop)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                    >
                      {copiedSlug === shop.slug ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenQrKit(shop)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                    >
                      <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>QR Kit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenCustomerView(shop.slug)}
                      title="Customer Page Open Karein"
                      className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditShop(shop)}
                      title="Details Edit Karein"
                      className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteShop(shop.slug);
                            setConfirmDeleteSlug(null);
                          }}
                          className="min-h-[36px] rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors whitespace-nowrap"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSlug(null)}
                          className="min-h-[36px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSlug(shop.slug)}
                        title="Dukaan Delete Karein"
                        className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

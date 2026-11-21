import type { FormEvent } from 'react';
import { Check, Copy, ExternalLink, QrCode, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import {
  DEFAULT_GREETING,
  JABALPUR_AREAS,
  SHOP_CATEGORIES,
  type ShopFormInput,
  type ShopRecord,
} from '../types';
import { buildShopShareUrl } from '../utils/shopUtils';

interface ShopFormProps {
  values: ShopFormInput;
  editingSlug: string | null;
  submitting: boolean;
  error: string | null;
  justCreatedShop: ShopRecord | null;
  onChange: (next: ShopFormInput) => void;
  onSubmit: (e: FormEvent) => void;
  onCancelEdit: () => void;
  onOpenQrKit: (shop: ShopRecord) => void;
  onOpenCustomerView: (slug: string) => void;
}

export default function ShopForm({
  values,
  editingSlug,
  submitting,
  error,
  justCreatedShop,
  onChange,
  onSubmit,
  onCancelEdit,
  onOpenQrKit,
  onOpenCustomerView,
}: ShopFormProps) {
  const [copiedNew, setCopiedNew] = useState(false);

  const createdUrl = justCreatedShop
    ? buildShopShareUrl(justCreatedShop.slug, justCreatedShop)
    : '';

  const handleCopyCreated = async () => {
    if (!createdUrl) return;
    try {
      await navigator.clipboard.writeText(createdUrl);
      setCopiedNew(true);
      window.setTimeout(() => setCopiedNew(false), 2200);
    } catch {
      const input = document.createElement('input');
      input.value = createdUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedNew(true);
      window.setTimeout(() => setCopiedNew(false), 2200);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
              {editingSlug ? 'Dukaan Details Update Karo' : 'Nayi Dukaan Add Karo'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Dukaan ki details bharein — NFC card aur QR standee ka ready link turant banega.
            </p>
          </div>
          {editingSlug && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Edit Cancel Karo</span>
            </button>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          >
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {/* Shop Name */}
          <div>
            <label
              htmlFor="shopName"
              className="block text-sm font-semibold text-slate-800"
            >
              Dukaan Ka Naam <span className="text-red-600">*</span>
            </label>
            <input
              id="shopName"
              type="text"
              required
              value={values.name}
              onChange={(e) => onChange({ ...values, name: e.target.value })}
              placeholder="Jaise Sharma Cafe"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* Area & Category */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="shopArea"
                className="block text-sm font-semibold text-slate-800"
              >
                Jabalpur Area
              </label>
              <select
                id="shopArea"
                value={values.area}
                onChange={(e) => onChange({ ...values, area: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              >
                {JABALPUR_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="shopCategory"
                className="block text-sm font-semibold text-slate-800"
              >
                Business Category
              </label>
              <select
                id="shopCategory"
                value={values.category}
                onChange={(e) => onChange({ ...values, category: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              >
                {SHOP_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Google Review Link */}
          <div>
            <label
              htmlFor="googleLink"
              className="block text-sm font-semibold text-slate-800"
            >
              Google Review Link <span className="text-red-600">*</span>
            </label>
            <input
              id="googleLink"
              type="text"
              required
              value={values.google}
              onChange={(e) => onChange({ ...values, google: e.target.value })}
              placeholder="https://g.page/r/... ya Google Maps Review Link Paste Karo"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs text-slate-900 placeholder:font-sans placeholder:text-sm placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* WhatsApp Number */}
          <div>
            <label
              htmlFor="whatsapp"
              className="block text-sm font-semibold text-slate-800"
            >
              Dukaandaar Ka WhatsApp Number <span className="text-red-600">*</span>
            </label>
            <div className="mt-1.5 flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-emerald-600">
              <span className="border-r border-slate-200 px-3.5 py-3 font-mono text-sm font-medium text-slate-500">
                +91
              </span>
              <input
                id="whatsapp"
                type="tel"
                inputMode="numeric"
                required
                value={values.whatsapp}
                onChange={(e) => onChange({ ...values, whatsapp: e.target.value })}
                placeholder="98260XXXXX"
                className="w-full rounded-r-xl bg-transparent px-3.5 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Instagram Link */}
          <div>
            <label
              htmlFor="insta"
              className="block text-sm font-semibold text-slate-800"
            >
              Instagram Link <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              id="insta"
              type="text"
              value={values.insta}
              onChange={(e) => onChange({ ...values, insta: e.target.value })}
              placeholder="https://instagram.com/dukaan_page"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs text-slate-900 placeholder:font-sans placeholder:text-sm placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* Custom Welcome Greeting */}
          <div>
            <label
              htmlFor="greeting"
              className="block text-sm font-semibold text-slate-800"
            >
              Customer Greeting Message
            </label>
            <input
              id="greeting"
              type="text"
              value={values.greeting}
              onChange={(e) => onChange({ ...values, greeting: e.target.value })}
              placeholder={DEFAULT_GREETING}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Ye link hi NFC Card aur QR Code me dalna hai.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {submitting
              ? 'Save Ho Raha Hai...'
              : editingSlug
              ? 'Details Update Karo'
              : 'Dukaan Ka Link Banao'}
          </button>
        </div>
      </form>

      {/* Immediate Generated Link Confirmation Banner */}
      {justCreatedShop && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold text-slate-900">
              Ho Gaya! {justCreatedShop.name} ka NFC Link tayyar hai
            </h3>
            <span className="text-xs font-medium text-emerald-800">
              {justCreatedShop.area} · Jabalpur
            </span>
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-emerald-200 bg-white px-3.5 py-3 font-mono text-xs text-slate-800">
            {createdUrl}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyCreated}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {copiedNew ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Copy Ho Gaya</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Link Copy Karo</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onOpenQrKit(justCreatedShop)}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
              <span>QR Standee Download Karo</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenCustomerView(justCreatedShop.slug)}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Customer Page Test Karo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

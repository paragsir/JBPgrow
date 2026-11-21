import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ExternalLink,
  Instagram,
  MessageCircle,
  Phone,
  Send,
  Smile,
  Star,
  ThumbsDown,
} from 'lucide-react';
import type { ShopEventType, ShopRecord } from '../types';
import {
  buildWhatsAppUrl,
  cleanIndianPhone,
  getShopInitials,
  normalizeSafeUrl,
} from '../utils/shopUtils';

interface CustomerPageProps {
  shop: ShopRecord;
  mode?: 'standalone' | 'preview';
  onTrackEvent?: (type: ShopEventType, message?: string) => void;
  onBackToAdmin?: () => void;
}

export default function CustomerPage({
  shop,
  mode = 'standalone',
  onTrackEvent,
  onBackToAdmin,
}: CustomerPageProps) {
  const [experience, setExperience] = useState<'idle' | 'good' | 'bad'>('idle');
  const [complaintText, setComplaintText] = useState('');
  const [complaintLogged, setComplaintLogged] = useState(false);

  const safeGoogleUrl = normalizeSafeUrl(shop.google) || 'https://maps.google.com';
  const safeInstaUrl = normalizeSafeUrl(shop.insta);
  const cleanWa = cleanIndianPhone(shop.whatsapp);

  const generalWaHref = buildWhatsAppUrl(
    cleanWa,
    `Namaste! Mujhe ${shop.name} ke baare me baat karni hai.`
  );

  const complaintWaHref = buildWhatsAppUrl(
    cleanWa,
    complaintText.trim()
      ? `Namaste, ${shop.name} me mera experience theek nahi tha: "${complaintText.trim()}". Kripya is par dhyan dein.`
      : `Namaste, mera experience theek nahi tha. Mujhe aapse baat karni hai - ${shop.name}`
  );

  const handleGoodClick = () => {
    setExperience('good');
    onTrackEvent?.('good');
  };

  const handleBadClick = () => {
    setExperience('bad');
    setComplaintLogged(false);
    onTrackEvent?.('bad');
  };

  const handleSendComplaint = () => {
    if (complaintText.trim()) {
      onTrackEvent?.('bad', complaintText.trim());
      setComplaintLogged(true);
    }
    onTrackEvent?.('whatsapp');
  };

  const isPreview = mode === 'preview';

  const cardBody = (
    <div
      className={`w-full bg-white ${
        isPreview
          ? 'rounded-2xl border border-slate-200 p-5'
          : 'max-w-[440px] rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm'
      }`}
    >
      {/* Shop Header */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 font-display text-lg font-bold tracking-tight text-white">
          {getShopInitials(shop.name)}
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-slate-900">
          {shop.name || 'Dukaan Ka Naam'}
        </h1>
        <p className="mt-1 text-xs font-medium text-slate-500">
          <span>{shop.area || 'Jabalpur'}</span>
          <span aria-hidden="true" className="mx-1.5">
            ·
          </span>
          <span>Jabalpur</span>
          {shop.category ? (
            <>
              <span aria-hidden="true" className="mx-1.5">
                ·
              </span>
              <span>{shop.category}</span>
            </>
          ) : null}
        </p>
      </div>

      {/* Greeting Prompt */}
      <div className="mt-6 rounded-2xl bg-slate-100 px-4 py-3.5 text-[15px] leading-relaxed text-slate-800">
        {shop.greeting || 'Namaste! Aaj ka experience kaisa raha?'}
      </div>

      {/* Experience Selection */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleGoodClick}
          className={`flex min-h-[50px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap ${
            experience === 'good'
              ? 'bg-emerald-700 text-white ring-2 ring-emerald-600 ring-offset-2'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          <Smile className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Bahut Accha</span>
        </button>

        <button
          type="button"
          onClick={handleBadClick}
          className={`flex min-h-[50px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap ${
            experience === 'bad'
              ? 'bg-slate-950 text-white ring-2 ring-slate-900 ring-offset-2'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          <ThumbsDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Theek Nahi</span>
        </button>
      </div>

      {/* Contextual Follow-up */}
      <AnimatePresence mode="wait">
        {experience === 'good' && (
          <motion.div
            key="good-branch"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 space-y-3"
          >
            <div className="rounded-2xl bg-emerald-50 px-4 py-3.5 text-sm leading-relaxed text-emerald-950">
              Thank You! Kya aap Google par 5-Star Review de denge? Aapka ek review humare
              local business ko bahut help karta hai.
            </div>
            <a
              href={safeGoogleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 transition-colors duration-150 hover:bg-amber-300 active:scale-[0.98]"
            >
              <Star className="h-4 w-4 fill-slate-950 shrink-0" aria-hidden="true" />
              <span>Google Par Review Do</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
            </a>
          </motion.div>
        )}

        {experience === 'bad' && (
          <motion.div
            key="bad-branch"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 space-y-3"
          >
            <div className="rounded-2xl bg-slate-100 px-4 py-3.5 text-sm leading-relaxed text-slate-800">
              Sorry! Kya hua, hume batayein. Aapka message seedha dukaandaar ke paas jayega.
            </div>

            <textarea
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              rows={2}
              placeholder="Apni baat yahan likhein (optional)..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
            />

            <a
              href={complaintWaHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleSendComplaint}
              className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#15803D] px-4 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#166534] active:scale-[0.98]"
            >
              <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>WhatsApp Par Shikayat Bhejo</span>
            </a>

            {complaintLogged && (
              <p className="text-center text-xs font-medium text-emerald-700">
                Feedback save ho gaya aur WhatsApp open ho raha hai.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hairline Divider */}
      <div className="my-6 border-t border-slate-200" />

      {/* Direct Contact Actions */}
      <div className="space-y-2.5">
        <a
          href={generalWaHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onTrackEvent?.('whatsapp')}
          className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#16A34A] px-4 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#15803D] active:scale-[0.98]"
        >
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>WhatsApp Par Baat Karo</span>
        </a>

        {safeInstaUrl ? (
          <a
            href={safeInstaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onTrackEvent?.('insta')}
            className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#BE185D] px-4 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#9D174D] active:scale-[0.98]"
          >
            <Instagram className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Instagram Par Follow Karo</span>
          </a>
        ) : null}

        <a
          href={`tel:+91${cleanWa}`}
          onClick={() => onTrackEvent?.('call')}
          className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#1D4ED8] px-4 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#1E40AF] active:scale-[0.98]"
        >
          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Call Karo</span>
        </a>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-xs text-slate-400">
        Powered by <span className="font-semibold text-slate-600">GrowJBP</span>
        <span aria-hidden="true" className="mx-1.5">
          ·
        </span>
        Jabalpur
      </p>
    </div>
  );

  if (isPreview) {
    return cardBody;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Compact Brand Header */}
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex h-14 max-w-[440px] items-center justify-between px-4">
          <div className="font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0">
            Grow<span className="text-emerald-400">JBP</span>
          </div>
          {onBackToAdmin ? (
            <button
              type="button"
              onClick={onBackToAdmin}
              className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Admin Panel</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">Jabalpur</span>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-6 sm:py-10">
        {cardBody}
      </main>
    </div>
  );
}

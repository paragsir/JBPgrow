import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Nfc,
  Printer,
  Smartphone,
} from 'lucide-react';
import type { ShopRecord } from '../types';
import { buildShopShareUrl } from '../utils/shopUtils';

interface QrStandeePanelProps {
  shop: ShopRecord;
  onOpenCustomerView: (slug: string) => void;
}

export default function QrStandeePanel({
  shop,
  onOpenCustomerView,
}: QrStandeePanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const shareUrl = buildShopShareUrl(shop.slug);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(shareUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [shareUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback copy via temporary input
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleDownloadStandee = async () => {
    if (!qrDataUrl) return;
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 1180;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // White card canvas
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top dark slate header band
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, canvas.width, 220);

      // GrowJBP header text
      ctx.font = '800 54px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('GrowJBP', canvas.width / 2, 108);

      ctx.font = '500 26px "DM Sans", Arial, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('NFC Tap ya QR Code Scan Karein', canvas.width / 2, 162);

      // Shop Name
      ctx.fillStyle = '#0F172A';
      ctx.font = '700 48px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(shop.name.slice(0, 32), canvas.width / 2, 315);

      // Area + City
      ctx.fillStyle = '#64748B';
      ctx.font = '500 26px "DM Sans", Arial, sans-serif';
      ctx.fillText(`${shop.area || 'Jabalpur'} · Jabalpur`, canvas.width / 2, 362);

      // QR Code frame
      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => reject(new Error('QR load failed'));
      });

      const qrSize = 460;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 415;

      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 4;
      ctx.strokeRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Call to action
      ctx.fillStyle = '#15803D';
      ctx.font = '700 32px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('Google 5-Star Review & Direct WhatsApp', canvas.width / 2, 985);

      ctx.fillStyle = '#475569';
      ctx.font = '500 24px "DM Sans", Arial, sans-serif';
      ctx.fillText('Apna phone card par touch karein ya camera se scan karein', canvas.width / 2, 1035);

      // Bottom hairline & footer
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(90, 1090);
      ctx.lineTo(810, 1090);
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = '600 22px "DM Sans", Arial, sans-serif';
      ctx.fillText('Powered by GrowJBP · Jabalpur', canvas.width / 2, 1138);

      const link = document.createElement('a');
      link.download = `growjbp-${shop.slug}-qr-standee.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* NFC Link Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              NFC Card &amp; QR Link Ready
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ye link hi NFC Card aur QR Standee me dalna hai — {shop.name} ({shop.area})
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenCustomerView(shop.slug)}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Customer Page Kholein</span>
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 font-mono text-xs text-slate-800">
            {shareUrl}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>Copy Ho Gaya</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                <span>Link Copy Karo</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Nfc className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            NFC Tools App → Write → URL/URI me paste karein
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            Har Android &amp; iPhone par bina app ke khulega
          </span>
        </div>
      </div>

      {/* Printable Counter QR Standee Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 no-print">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Counter QR Standee Card
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Billing counter ke liye ready-to-print QR card download ya print karein.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadStandee}
              disabled={!qrDataUrl || downloading}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>{downloading ? 'Ban Raha Hai...' : 'Standee PNG Download'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span>Print Karo</span>
            </button>
          </div>
        </div>

        {/* Standee Preview Surface */}
        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white text-center">
            <div className="bg-slate-900 px-6 py-5 text-white">
              <div className="font-display text-xl font-extrabold tracking-tight">
                Grow<span className="text-emerald-400">JBP</span>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                NFC Card Tap ya QR Scan Karein
              </p>
            </div>

            <div className="px-6 py-6">
              <h4 className="font-display text-lg font-bold text-slate-900">
                {shop.name}
              </h4>
              <p className="mt-0.5 text-xs text-slate-500">
                {shop.area} · Jabalpur
              </p>

              <div className="mx-auto mt-5 flex h-48 w-48 items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`${shop.name} GrowJBP QR Code`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
                )}
              </div>

              <p className="mt-4 text-xs font-semibold text-emerald-700">
                Google Review · WhatsApp · Instagram
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Powered by GrowJBP · Jabalpur
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

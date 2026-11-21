import { MessageSquareText } from 'lucide-react';
import type { PrivateFeedback } from '../types';
import { formatShortDate } from '../utils/shopUtils';

interface FeedbackInboxProps {
  feedback: PrivateFeedback[];
}

export default function FeedbackInbox({ feedback }: FeedbackInboxProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-5">
        <h2 className="font-display text-lg font-bold text-slate-900">
          Private Shikayat Inbox
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Jab customer &ldquo;Theek Nahi&rdquo; choose karta hai, unka message public Google Review ke bajaye yahan aur dukaandaar ke WhatsApp par aata hai.
        </p>
      </div>

      {feedback.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <MessageSquareText
            className="mx-auto h-7 w-7 text-slate-300"
            aria-hidden="true"
          />
          <p className="mt-3 font-display text-sm font-semibold text-slate-800">
            Abhi koi private shikayat nahi aayi hai
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Live Preview me &ldquo;Theek Nahi&rdquo; click karke test message bhej sakte hain.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {feedback.map((item) => (
            <li key={item.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-slate-900">
                  {item.shopName}
                </span>
                <span className="text-xs text-slate-400 tabular-nums">
                  {formatShortDate(item.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                {item.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

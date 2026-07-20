'use client';

import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { Button } from '@tableflow/ui';
import { cartTotal, lineTotal, type CartLine } from '@/lib/guest-cart';

interface CartSheetProps {
  items: CartLine[];
  brandColor: string;
  ordering: boolean;
  /** pay_per_order → "Continue to pay"; otherwise "Confirm order" */
  confirmLabel?: string;
  onRemove: (lineKey: string) => void;
  onConfirm: () => void;
}

export function CartSheet({
  items,
  brandColor,
  ordering,
  confirmLabel = 'Confirm order',
  onRemove,
  onConfirm,
}: CartSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const itemCount = items.reduce((n, c) => n + c.quantity, 0);
  const total = cartTotal(items);
  const primaryLabel = `${confirmLabel} · $${total.toFixed(2)}`;

  if (items.length === 0) return null;

  if (expanded) {
    return (
      <div
        role="dialog"
        aria-modal
        aria-label="Your cart"
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60"
        onClick={() => setExpanded(false)}
      >
        <div
          className="max-h-[85vh] w-full max-w-[560px] overflow-auto rounded-t-xl bg-flagship-surface-low p-6 shadow-[0_-8px_32px_rgba(0,0,0,0.4)]"
          style={{ animation: 'sheetSlideUp 250ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-flagship-outline-variant/40" />
          <div className="mb-5 flex items-center justify-between">
            <h3 className="m-0 font-serif text-xl font-light text-flagship-on-surface">Your order</h3>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="label-caps border-none bg-transparent text-flagship-on-surface-variant"
            >
              Close
            </button>
          </div>
          <div className="mb-6 space-y-3">
            {items.map((item) => (
              <div key={item.lineKey} className="carved-edge flex gap-3 bg-flagship-surface/50 p-4">
                {item.image_url ? (
                  <div
                    className="h-16 w-16 shrink-0 rounded-md bg-cover bg-center"
                    style={{ backgroundImage: `url(${item.image_url})` }}
                    aria-hidden
                  />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-md bg-luxury-surface-high" aria-hidden />
                )}
                <div className="flex-1">
                  <p className="m-0 font-serif font-light text-gold">
                    {item.quantity}× {item.name}
                  </p>
                  {item.modifierLabels && item.modifierLabels.length > 0 && (
                    <p className="mt-1 text-sm text-flagship-on-surface-variant">
                      {item.modifierLabels.join(', ')}
                    </p>
                  )}
                </div>
                <span className="font-mono font-semibold text-flagship-on-surface">
                  ${lineTotal(item).toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(item.lineKey)}
                  className="cursor-pointer border-none bg-transparent text-lg text-error"
                  aria-label={`Remove ${item.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <Button
            onClick={onConfirm}
            disabled={ordering}
            accentColor={brandColor}
            style={{ width: '100%', opacity: ordering ? 0.7 : 1 }}
          >
            {ordering ? 'Sending…' : primaryLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-40px)] max-w-md -translate-x-1/2 md:bottom-8">
      <div className="flex items-center justify-between overflow-hidden rounded-full border border-gold/20 bg-[#1A1A1A]/80 p-2 pl-6 shadow-[0_8px_32px_rgba(212,175,55,0.08)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex flex-1 items-center gap-4 border-none bg-transparent text-left"
          aria-label="View cart"
        >
          <div className="flex -space-x-3">
            {items.slice(0, 3).map((item) =>
              item.image_url ? (
                <div
                  key={item.lineKey}
                  className="h-9 w-9 rounded-full border-2 border-[#1A1A1A] bg-cover bg-center shadow-sm"
                  style={{ backgroundImage: `url(${item.image_url})` }}
                  aria-hidden
                />
              ) : (
                <div
                  key={item.lineKey}
                  className="h-9 w-9 rounded-full border-2 border-[#1A1A1A] bg-luxury-surface-high"
                  aria-hidden
                />
              )
            )}
          </div>
          <div>
            <p className="label-caps text-[10px] tracking-widest text-flagship-on-surface-variant">
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </p>
            <p className="text-sm font-light text-flagship-on-surface">${total.toFixed(2)}</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          disabled={ordering}
          className="label-caps flex items-center gap-2 rounded-full bg-gradient-to-r from-gold/90 to-gold-container/90 px-6 py-3 text-gold-on shadow-[0_0_15px_rgba(212,175,55,0.15)] transition-all hover:from-gold hover:to-gold-container disabled:opacity-70"
        >
          <span>{ordering ? 'Sending' : 'View cart'}</span>
          <Receipt size={16} />
        </button>
      </div>
    </div>
  );
}

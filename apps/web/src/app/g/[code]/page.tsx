'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  OrderStatusBar,
  Button,
  Badge,
  orderStatusLabel,
} from '@tableflow/ui';
import type { MenuCategoryWithItems, MenuItemWithModifiers, OrderStatus } from '@tableflow/types';
import { useOrderStatus } from '@/hooks/useOrderStatus';
import { CartSheet } from '@/components/guest/CartSheet';
import { ItemDetailSheet } from '@/components/guest/ItemDetailSheet';
import { PaymentSheet } from '@/components/guest/PaymentSheet';
import { RequestsSheet } from '@/components/guest/RequestsSheet';
import { GuestShell } from '@/components/guest/GuestShell';
import { GuestErrorState } from '@/components/guest/GuestErrorState';
import { GuestLoadingState } from '@/components/guest/GuestLoadingState';
import { Reveal, RevealItem } from '@/components/marketing/motion';

interface ScanResponse {
  session_id: string;
  session_token: string;
  venue_id: string;
  table_id: string;
  table_name: string;
  venue_name: string;
  guest_id: string;
  brand_color?: string;
  currency: string;
  tab_mode?: string;
}

import { cartLineKey, type CartLine } from '@/lib/guest-cart';

const SESSION_KEY = 'tableflow_guest_session';
const DEFAULT_GOLD = '#f2ca50';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

export default function GuestScanPage() {
  const params = useParams();
  const qrCode = decodeURIComponent(params.code as string);
  const [session, setSession] = useState<ScanResponse | null>(null);
  const [categories, setCategories] = useState<MenuCategoryWithItems[]>([]);
  const [search, setSearch] = useState('');
  const [dietary, setDietary] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [ordering, setOrdering] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<MenuItemWithModifiers | null>(null);
  const [showRequests, setShowRequests] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'setup' | 'close' | 'pay_order' | null>(null);
  const [guestTab, setGuestTab] = useState<'concierge' | 'menu'>('concierge');
  const [tabTotal, setTabTotal] = useState(0);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [lastOrderTotal, setLastOrderTotal] = useState(0);

  const brandColor = session?.brand_color ?? DEFAULT_GOLD;
  const orderStatus = useOrderStatus(activeOrderId ?? '', session?.session_token);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-flow', brandColor);
    document.documentElement.style.setProperty('--color-ember', brandColor);
    document.documentElement.style.setProperty('--color-primary', brandColor);
  }, [brandColor]);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/sessions/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qr_code: qrCode }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message ?? 'Invalid QR code');
        }
        const sess: ScanResponse = await res.json();
        localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
        setSession(sess);

        const menuRes = await fetch(`/api/venues/${sess.venue_id}/menu`);
        if (!menuRes.ok) {
          throw new Error('Menu is unavailable right now. Ask your server or try again.');
        }
        const menuData = await menuRes.json();
        setCategories(menuData.categories ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    }
    setLoading(true);
    setError('');
    init();
  }, [qrCode]);

  useEffect(() => {
    if (!session?.session_id || !session.session_token) return;
    fetch(`/api/sessions/${session.session_id}`, {
      headers: { Authorization: `Bearer ${session.session_token}` },
    })
      .then((r) => r.json())
      .then((data) => setTabTotal(Number(data.total_amount ?? 0)))
      .catch(() => {});
  }, [session?.session_id, session?.session_token, activeOrderId]);

  const filteredItems = useMemo(() => {
    const source = selectedCategoryId
      ? categories.filter((c) => c.id === selectedCategoryId)
      : categories;
    const all = source.flatMap((c) =>
      c.items.map((item) => ({ ...item, categoryName: c.name }))
    );
    return all.filter((item) => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (dietary && !item.dietary_tags?.includes(dietary)) return false;
      return true;
    });
  }, [categories, search, dietary, selectedCategoryId]);

  const addToCart = useCallback((item: Omit<CartLine, 'lineKey'>) => {
    const lineKey = cartLineKey(item);
    setCart((prev) => {
      const existing = prev.find((c) => c.lineKey === lineKey);
      if (existing) {
        return prev.map((c) =>
          c.lineKey === lineKey ? { ...c, quantity: c.quantity + item.quantity } : c
        );
      }
      return [...prev, { ...item, lineKey }];
    });
  }, []);

  const removeFromCart = useCallback((lineKey: string) => {
    setCart((prev) => prev.filter((c) => c.lineKey !== lineKey));
  }, []);

  const placeOrder = useCallback(async () => {
    if (!session || cart.length === 0 || ordering) return;
    setOrdering(true);
    setError('');

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.session_token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `order-${session.session_id}-${Date.now()}`,
        },
        body: JSON.stringify({
          session_id: session.session_id,
          guest_id: session.guest_id,
          items: cart.map((c) => ({
            item_id: c.item_id,
            quantity: c.quantity,
            modifiers: c.modifiers,
            special_instructions: c.special_instructions,
            course: c.course,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? 'Order failed — please try again');
      }
      const data = await res.json();
      setActiveOrderId(data.order_id);
      setCart([]);
      if (session.tab_mode === 'pay_per_order') {
        setLastOrderTotal(Number(data.subtotal ?? 0));
        setShowOrderDetail(false);
        setPaymentMode('pay_order');
      } else {
        setShowOrderDetail(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Order failed');
    } finally {
      setOrdering(false);
    }
  }, [session, cart, ordering]);

  if (loading) {
    return <GuestLoadingState />;
  }

  if (error && !session) {
    return (
      <GuestErrorState
        message={error}
        onRetry={() => {
          setError('');
          setLoading(true);
          window.location.reload();
        }}
      />
    );
  }

  const hasFilters = Boolean(search || dietary || selectedCategoryId);
  const featuredItem = filteredItems.find((item) => item.image_url) ?? filteredItems[0];
  const gridItems = featuredItem
    ? filteredItems.filter((item) => item.id !== featuredItem.id)
    : filteredItems;

  return (
    <GuestShell
      venueName={session?.venue_name ?? 'TableFlow'}
      tableName={session?.table_name ?? ''}
      activeTab={guestTab}
      onNavigate={(tab) => {
        setGuestTab(tab);
        if (tab === 'menu') {
          document.getElementById('guest-menu')?.scrollIntoView({ behavior: scrollBehavior() });
        } else {
          window.scrollTo({ top: 0, behavior: scrollBehavior() });
        }
      }}
      onCallServer={() => setShowRequests(true)}
    >
      <div className="mx-auto max-w-7xl px-5 md:px-gutter">
        <Reveal className="mb-8 py-8 md:py-16" immediate stagger={0.12}>
          <RevealItem>
            <div className="decorative-rule mb-6" aria-hidden />
          </RevealItem>
          <RevealItem>
            <h1 className="mb-4 font-serif text-[clamp(2rem,5vw,3.5rem)] font-light leading-tight text-flagship-on-surface">
              Good evening,{' '}
              <br />
              <span className="text-glow-gold bg-gradient-to-r from-gold to-gold-container bg-clip-text italic text-transparent">
                {session?.venue_name}
              </span>
            </h1>
          </RevealItem>
          <RevealItem>
            <p className="max-w-2xl text-lg font-light leading-relaxed text-flagship-on-surface-variant">
              Allow us to guide you through tonight&apos;s selections. Payment is securely authorized
              prior to preparation to ensure uninterrupted service.
            </p>
          </RevealItem>
        </Reveal>

        <Reveal id="guest-menu" className="mb-8 space-y-4" immediate delay={0.3}>
          <RevealItem>
            <input
              type="search"
              placeholder="Search menu"
              aria-label="Search menu"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full border-luxury-outline-variant/40 bg-luxury-surface-low text-luxury-on-surface placeholder:text-luxury-on-surface-variant/60"
            />
          </RevealItem>
          <RevealItem className="flex gap-2 overflow-x-auto pb-1">
            <CategoryTab label="All" active={!selectedCategoryId} brandColor={brandColor} onClick={() => setSelectedCategoryId(null)} />
            {categories.map((cat) => (
              <CategoryTab
                key={cat.id}
                label={cat.name}
                active={selectedCategoryId === cat.id}
                brandColor={brandColor}
                onClick={() => setSelectedCategoryId(cat.id)}
              />
            ))}
          </RevealItem>
          <RevealItem className="flex flex-wrap gap-2">
            {['vegan', 'vegetarian', 'gluten-free'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setDietary(dietary === tag ? null : tag)}
                className="cursor-pointer border-none bg-transparent p-0"
              >
                <Badge
                  variant={dietary === tag ? 'solid' : 'outline'}
                  color="flow"
                  accentColor={brandColor}
                >
                  {tag}
                </Badge>
              </button>
            ))}
          </RevealItem>
        </Reveal>

        {filteredItems.length === 0 ? (
          <EmptyMenuState hasFilters={hasFilters} onClearFilters={() => { setSearch(''); setDietary(null); setSelectedCategoryId(null); }} />
        ) : (
          <Reveal className="grid auto-rows-[200px] grid-cols-1 gap-4 md:auto-rows-[240px] md:grid-cols-12" stagger={0.08}>
            {featuredItem && (
              <RevealItem className="col-span-1 row-span-2 md:col-span-8">
                <button
                  type="button"
                  disabled={!featuredItem.is_available}
                  onClick={() => featuredItem.is_available && setDetailItem(featuredItem)}
                  className="carved-edge group relative h-full w-full overflow-hidden rounded-lg bg-luxury-surface-low/50 text-left shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-shadow hover:shadow-[0_8px_40px_rgba(212,175,55,0.12)] disabled:opacity-50"
                >
                  {featuredItem.image_url ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{ backgroundImage: `url(${featuredItem.image_url})` }}
                      aria-hidden
                    />
                  ) : (
                    <div className="absolute inset-0 bg-luxury-surface-high" aria-hidden />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-luxury-bg via-luxury-bg/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 flex w-full items-end justify-between p-6">
                    <div>
                      <p className="label-caps mb-2 tracking-[0.2em] text-gold/80">{featuredItem.categoryName}</p>
                      <h3 className="font-serif text-2xl font-light text-luxury-on-surface">{featuredItem.name}</h3>
                      <p className="mt-1 font-mono text-sm text-luxury-on-surface-variant">
                        ${Number(featuredItem.price).toFixed(2)}
                      </p>
                    </div>
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-gold transition-colors group-hover:border-gold"
                      aria-hidden
                    >
                      →
                    </span>
                  </div>
                </button>
              </RevealItem>
            )}
            {gridItems.map((item) => (
              <RevealItem key={item.id} className="col-span-1 md:col-span-4">
                <button
                  type="button"
                  disabled={!item.is_available}
                  onClick={() => item.is_available && setDetailItem(item)}
                  className="carved-edge group relative h-full w-full overflow-hidden rounded-lg bg-luxury-surface-low/50 text-left shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-shadow hover:shadow-[0_8px_40px_rgba(212,175,55,0.12)] disabled:opacity-50"
                >
                  {item.image_url ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-80 transition-transform duration-700 group-hover:scale-105"
                      style={{ backgroundImage: `url(${item.image_url})` }}
                      aria-hidden
                    />
                  ) : (
                    <div className="absolute inset-0 bg-luxury-surface-high" aria-hidden />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-luxury-bg/95 to-luxury-bg/20" />
                  <div className="absolute bottom-0 left-0 w-full p-5">
                    <h3 className="font-serif text-lg font-light text-luxury-on-surface">{item.name}</h3>
                    <p className="mt-1 font-mono text-sm text-luxury-on-surface-variant">
                      ${Number(item.price).toFixed(2)}
                    </p>
                  </div>
                </button>
              </RevealItem>
            ))}
          </Reveal>
        )}
      </div>

      {activeOrderId && cart.length === 0 && !paymentMode && (
        <div
          id="guest-order-status-dock"
          tabIndex={-1}
          className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-40px)] max-w-md -translate-x-1/2 outline-none md:bottom-8"
        >
          <button
            type="button"
            onClick={() => {
              if (orderStatus === 'pending_payment' && session?.tab_mode === 'pay_per_order') {
                setPaymentMode('pay_order');
              } else {
                setShowOrderDetail(true);
              }
            }}
            className="flex w-full items-center justify-between overflow-hidden rounded-full border border-gold/20 bg-[#1A1A1A]/80 p-2 pl-6 shadow-[0_8px_32px_rgba(212,175,55,0.08)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-4">
              <div className="relative flex h-3 w-3">
                <span className="guest-status-ping absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/60 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-gold/80 shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
              </div>
              <div className="text-left">
                <p className="label-caps text-[10px] tracking-widest text-flagship-on-surface-variant">
                  {orderStatusLabel(orderStatus)}
                </p>
                <p className="text-sm font-light text-flagship-on-surface">
                  {orderStatus === 'pending_payment'
                    ? 'Pay to send to kitchen'
                    : 'View order status'}
                </p>
              </div>
            </div>
            <span className="label-caps rounded-full bg-gradient-to-r from-gold/90 to-gold-container/90 px-6 py-3 text-gold-on">
              {orderStatus === 'pending_payment' ? 'Pay now' : 'Details'}
            </span>
          </button>
        </div>
      )}

      {error && session && (
        <p className="px-gutter py-3 text-center text-error">{error}</p>
      )}

      {detailItem && (
        <ItemDetailSheet
          item={detailItem}
          brandColor={brandColor}
          onClose={() => setDetailItem(null)}
          onAdd={addToCart}
        />
      )}

      <CartSheet
        items={cart}
        brandColor={brandColor}
        ordering={ordering}
        confirmLabel={session?.tab_mode === 'pay_per_order' ? 'Continue to pay' : 'Confirm order'}
        onRemove={removeFromCart}
        onConfirm={placeOrder}
      />

      {showRequests && session && (
        <RequestsSheet
          sessionId={session.session_id}
          sessionToken={session.session_token}
          tableId={session.table_id}
          brandColor={brandColor}
          onClose={() => setShowRequests(false)}
        />
      )}

      {showOrderDetail && activeOrderId && (
        <OrderDetailSheet
          status={orderStatus as OrderStatus}
          brandColor={brandColor}
          tabMode={session?.tab_mode}
          tabTotal={tabTotal}
          orderTotal={lastOrderTotal}
          onClose={() => setShowOrderDetail(false)}
          onAddMore={() => setShowOrderDetail(false)}
          onRequest={() => { setShowOrderDetail(false); setShowRequests(true); }}
          onPayOrder={() => { setShowOrderDetail(false); setPaymentMode('pay_order'); }}
          onPayTab={() => { setShowOrderDetail(false); setPaymentMode('close'); }}
          onSaveCard={() => { setShowOrderDetail(false); setPaymentMode('setup'); }}
        />
      )}

      {paymentMode && session && (
        <PaymentSheet
          mode={paymentMode}
          sessionToken={session.session_token}
          sessionId={session.session_id}
          guestId={session.guest_id}
          venueName={session.venue_name}
          brandColor={brandColor}
          tabTotal={tabTotal}
          orderId={activeOrderId ?? undefined}
          orderTotal={lastOrderTotal}
          paymentIntentId={paymentIntentId}
          onClose={() => {
            const wasPayOrder = paymentMode === 'pay_order';
            setPaymentMode(null);
            if (wasPayOrder && activeOrderId) {
              setShowOrderDetail(false);
              // Fixed dock is always in viewport; nudge focus for a11y after Pay later.
              requestAnimationFrame(() => {
                document.getElementById('guest-order-status-dock')?.focus?.();
                document.getElementById('guest-order-status-dock')?.scrollIntoView({
                  block: 'nearest',
                  behavior: scrollBehavior(),
                });
              });
            }
          }}
          onCardSaved={() => {
            setPaymentMode(null);
            setShowOrderDetail(true);
          }}
          onPaymentIntentCreated={setPaymentIntentId}
          onPaymentComplete={() => {
            setError('');
            setShowOrderDetail(true);
          }}
        />
      )}
    </GuestShell>
  );
}

function EmptyMenuState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-lg border border-luxury-outline-variant/30 bg-luxury-surface-low text-3xl">
        🍽
      </div>
      <h3 className="mb-2 font-serif text-xl font-light text-luxury-on-surface">
        {hasFilters ? 'No items match' : 'Menu is empty'}
      </h3>
      <p className="text-luxury-on-surface-variant">
        {hasFilters
          ? 'Try adjusting your search or dietary filters.'
          : 'Check back soon. The kitchen is updating the menu.'}
      </p>
      {hasFilters && (
        <Button variant="secondary" onClick={onClearFilters} className="mt-4">
          Clear filters
        </Button>
      )}
    </div>
  );
}

function OrderDetailSheet({
  status,
  brandColor,
  tabMode,
  tabTotal,
  orderTotal,
  onClose,
  onAddMore,
  onRequest,
  onPayOrder,
  onPayTab,
  onSaveCard,
}: {
  status: OrderStatus;
  brandColor: string;
  tabMode?: string;
  tabTotal: number;
  orderTotal: number;
  onClose: () => void;
  onAddMore: () => void;
  onRequest: () => void;
  onPayOrder: () => void;
  onPayTab: () => void;
  onSaveCard: () => void;
}) {
  const needsOrderPay = status === 'pending_payment' && tabMode === 'pay_per_order';

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Order status"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-[560px] overflow-auto rounded-t-xl bg-luxury-surface-low p-6 shadow-[0_-8px_32px_rgba(0,0,0,0.4)]"
        style={{ animation: 'sheetSlideUp 250ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-luxury-outline-variant/40" />
        <h2 className="mb-4 text-center font-serif text-2xl font-light text-luxury-on-surface">Order Status</h2>
        <OrderStatusBar status={status} accentColor={brandColor} />
        <div className="mt-6 grid gap-2.5">
          {needsOrderPay && (
            <Button accentColor={brandColor} onClick={onPayOrder} style={{ width: '100%' }}>
              Pay now {orderTotal > 0 ? `($${orderTotal.toFixed(2)})` : ''}
            </Button>
          )}
          <Button
            accentColor={needsOrderPay ? undefined : brandColor}
            variant={needsOrderPay ? 'secondary' : 'primary'}
            onClick={onAddMore}
            style={{ width: '100%' }}
          >
            Add more items
          </Button>
          <Button variant="secondary" onClick={onRequest} style={{ width: '100%' }}>
            Request something
          </Button>
          {tabMode !== 'pay_per_order' && (
            <>
              <Button accentColor={brandColor} onClick={onPayTab} style={{ width: '100%' }}>
                Pay & close tab {tabTotal > 0 ? `($${tabTotal.toFixed(2)})` : ''}
              </Button>
              <Button variant="ghost" onClick={onSaveCard} style={{ width: '100%', color: brandColor }}>
                Save card for later
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryTab({
  label,
  active,
  brandColor,
  onClick,
}: {
  label: string;
  active: boolean;
  brandColor: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="label-caps shrink-0 rounded-sm px-4 py-2 transition-colors"
      style={{
        color: active ? '#241a00' : 'var(--color-luxury-on-surface-variant)',
        background: active ? brandColor : 'transparent',
        border: active ? 'none' : '1px solid var(--color-luxury-outline-variant)',
      }}
    >
      {label}
    </button>
  );
}

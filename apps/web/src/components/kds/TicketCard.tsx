'use client';

import { memo, useMemo } from 'react';
import { getAgeColor } from '@/hooks/useKDSFeed';
import type { KDSTicket } from '@tableflow/types';

const COURSE_ORDER = ['starter', 'drink', 'main', 'dessert'] as const;
const COURSE_LABELS: Record<string, string> = {
  starter: 'Starters',
  drink: 'Drinks',
  main: 'Mains',
  dessert: 'Desserts',
};

interface TicketCardProps {
  ticket: KDSTicket;
  onStatusChange: (orderId: string, status: string) => void;
  onItemDone: (itemId: string) => void;
}

export const TicketCard = memo(function TicketCard({
  ticket,
  onStatusChange,
  onItemDone,
}: TicketCardProps) {
  const allItemsDone = ticket.items.every((item) => item.status === 'done' || item.status === 'cancelled');
  const isUrgent = ticket.age_minutes >= 20;
  const isHold = ticket.status === 'received' && ticket.age_minutes < 3;
  const ageColor = getAgeColor(ticket.age_minutes);

  const borderClass = isUrgent ? 'kds-ticket-urgent' : isHold ? 'kds-ticket-hold' : 'kds-ticket-fired';
  const fireLabel =
    ticket.status === 'received'
      ? isHold
        ? 'Hold: Incoming'
        : 'Fire: New'
      : ticket.status === 'preparing'
        ? 'Fire: In Progress'
        : ticket.status;

  const courseGroups = useMemo(() => {
    const groups = new Map<string, KDSTicket['items']>();
    for (const item of ticket.items) {
      const course = item.course ?? 'main';
      if (!groups.has(course)) groups.set(course, []);
      groups.get(course)!.push(item);
    }
    const ordered: Array<{ course: string; label: string; items: KDSTicket['items'] }> = [];
    for (const course of COURSE_ORDER) {
      if (groups.has(course)) {
        ordered.push({ course, label: COURSE_LABELS[course] ?? course, items: groups.get(course)! });
      }
    }
    for (const [course, items] of groups) {
      if (!COURSE_ORDER.includes(course as (typeof COURSE_ORDER)[number])) {
        ordered.push({ course, label: COURSE_LABELS[course] ?? course, items });
      }
    }
    return ordered;
  }, [ticket.items]);

  return (
    <article className={`relative flex flex-col rounded-sm bg-luxury-surface-low p-5 ${borderClass}`}>
      <div
        className="absolute right-3 top-3 rounded-sm border border-gold/40 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-gold"
        title="Payment cleared before kitchen fire"
      >
        Paid
      </div>

      <header className="mb-4 mt-4 flex items-start justify-between border-b border-luxury-outline-variant/20 pb-3">
        <div>
          <h2
            className="font-serif text-2xl font-light"
            style={{ color: isUrgent ? 'var(--kds-red)' : undefined }}
          >
            {ticket.table_name}
          </h2>
          <span
            className="label-caps mt-1 block"
            style={{ color: isUrgent ? 'var(--kds-red)' : ageColor }}
          >
            {isUrgent ? `Rush · ${fireLabel}` : fireLabel}
          </span>
        </div>
        <div className="text-right">
          <span
            className={`block font-mono text-lg ${isUrgent ? 'animate-pulse font-semibold' : ''}`}
            style={{ color: ageColor }}
            aria-label={`${ticket.age_minutes} minutes since paid`}
          >
            {ticket.age_minutes}m
          </span>
        </div>
      </header>

      <div className="flex-grow space-y-3">
        {courseGroups.map((group) => (
          <div key={group.course}>
            <div className="label-caps mb-2 border-b border-luxury-outline-variant/20 pb-1 text-luxury-on-surface-variant">
              {group.label}
            </div>
            {group.items.map((item) => {
              const isDone = item.status === 'done';
              return (
                <div
                  key={item.id}
                  className="border-b border-luxury-outline-variant/20 pb-2 last:border-0"
                  style={{ opacity: isDone ? 0.5 : 1 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className={isDone ? 'line-through' : ''}>
                        {item.quantity}x {item.name}
                      </div>
                      {item.special_instructions && (
                        <div
                          className={`mt-1 border-l pl-3 text-sm ${
                            item.special_instructions.toLowerCase().includes('allergy')
                              ? 'border-error/50 font-semibold text-error'
                              : 'border-luxury-outline-variant/30 text-luxury-on-surface-variant'
                          }`}
                        >
                          {item.special_instructions}
                        </div>
                      )}
                      {item.modifiers.length > 0 && (
                        <ul className="mt-1 space-y-0.5 pl-3 text-sm text-luxury-on-surface-variant">
                          {item.modifiers.map((mod) => (
                            <li key={mod}>· {mod}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {!isDone && item.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => onItemDone(item.id)}
                        className="label-caps shrink-0 rounded-sm bg-luxury-surface-highest px-2.5 py-1.5 text-luxury-on-surface transition-colors hover:bg-gold hover:text-gold-on"
                      >
                        Done
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <footer className="mt-4 flex gap-2 border-t border-luxury-outline-variant/20 pt-4">
        {ticket.status === 'received' && !isHold && (
          <button
            type="button"
            onClick={() => onStatusChange(ticket.order_id, 'preparing')}
            className="label-caps flex-1 rounded-sm bg-gold py-2 text-luxury-bg transition-opacity hover:opacity-90"
          >
            Start
          </button>
        )}
        {ticket.status === 'received' && isHold && (
          <button
            type="button"
            onClick={() => onStatusChange(ticket.order_id, 'preparing')}
            className="label-caps w-full rounded-sm border border-luxury-outline-variant py-2 text-luxury-on-surface transition-colors hover:bg-luxury-surface-high"
          >
            Fire Now
          </button>
        )}
        {isUrgent && ticket.status !== 'ready' && (
          <button
            type="button"
            onClick={() => onStatusChange(ticket.order_id, 'ready')}
            className="label-caps flex-1 rounded-sm bg-error py-2 text-luxury-bg transition-opacity hover:opacity-90"
          >
            Bump Rush
          </button>
        )}
        {ticket.status === 'preparing' && !isUrgent && allItemsDone && (
          <button
            type="button"
            onClick={() => onStatusChange(ticket.order_id, 'ready')}
            className="label-caps flex-1 rounded-sm bg-gold py-2 text-luxury-bg transition-opacity hover:opacity-90"
          >
            Ready
          </button>
        )}
        {ticket.status === 'preparing' && !isUrgent && !allItemsDone && (
          <button
            type="button"
            onClick={() => onStatusChange(ticket.order_id, 'ready')}
            className="label-caps flex-1 rounded-sm border border-luxury-outline-variant py-2 text-luxury-on-surface transition-colors hover:bg-luxury-surface-high"
          >
            Mark Ready
          </button>
        )}
        {ticket.status === 'ready' && (
          <button
            type="button"
            onClick={() => onStatusChange(ticket.order_id, 'delivered')}
            className="label-caps flex-1 rounded-sm bg-gold py-2 text-luxury-bg transition-opacity hover:opacity-90"
          >
            Bump
          </button>
        )}
      </footer>
    </article>
  );
});

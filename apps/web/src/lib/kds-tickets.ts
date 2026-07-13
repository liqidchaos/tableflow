import type { KDSTicket, OrderItemStatus, OrderStatus } from '@tableflow/types';
import { isKdsVisibleStatus } from '@/lib/kitchen-enqueue';

export type KdsOrderRow = {
  id: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  order_items?: Array<{
    id: string;
    quantity: number;
    modifiers: Array<{ name: string } | string> | null;
    special_instructions: string | null;
    course: string | null;
    status: string;
    menu_items: { name: string } | null;
  }> | null;
  table_sessions?: {
    venue_tables?: { name: string } | null;
  } | null;
};

function modifierNames(
  modifiers: Array<{ name: string } | string> | null | undefined
): string[] {
  if (!modifiers?.length) return [];
  return modifiers.map((m) => (typeof m === 'string' ? m : m.name)).filter(Boolean);
}

/** Age since payment cleared (paid_at), falling back to created_at for legacy rows. */
export function ticketReceivedAt(order: Pick<KdsOrderRow, 'paid_at' | 'created_at'>): string {
  return order.paid_at ?? order.created_at;
}

export function ageMinutesFrom(receivedAt: string, nowMs = Date.now()): number {
  return Math.max(0, Math.floor((nowMs - new Date(receivedAt).getTime()) / 60000));
}

export function mapOrderToKdsTicket(order: KdsOrderRow, nowMs = Date.now()): KDSTicket | null {
  if (!isKdsVisibleStatus(order.status)) return null;

  const receivedAt = ticketReceivedAt(order);
  const tableName = order.table_sessions?.venue_tables?.name ?? 'Unknown';

  return {
    order_id: order.id,
    table_name: tableName,
    status: order.status as OrderStatus,
    received_at: receivedAt,
    age_minutes: ageMinutesFrom(receivedAt, nowMs),
    items: (order.order_items ?? []).map((item) => ({
      id: item.id,
      name: item.menu_items?.name ?? 'Item',
      quantity: item.quantity,
      modifiers: modifierNames(item.modifiers),
      special_instructions: item.special_instructions,
      course: item.course ?? 'main',
      status: item.status as OrderItemStatus,
    })),
  };
}

/** Defense in depth: drop any unpaid / non-kitchen statuses before the rail renders. */
export function buildKdsTickets(orders: KdsOrderRow[], nowMs = Date.now()): KDSTicket[] {
  const tickets: KDSTicket[] = [];
  for (const order of orders) {
    const ticket = mapOrderToKdsTicket(order, nowMs);
    if (ticket) tickets.push(ticket);
  }
  tickets.sort(
    (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
  );
  return tickets;
}

export function refreshTicketAges(tickets: KDSTicket[], nowMs = Date.now()): KDSTicket[] {
  return tickets.map((ticket) => ({
    ...ticket,
    age_minutes: ageMinutesFrom(ticket.received_at, nowMs),
  }));
}

export function filterPaidKdsTickets(tickets: KDSTicket[]): KDSTicket[] {
  return tickets.filter((t) => isKdsVisibleStatus(t.status));
}

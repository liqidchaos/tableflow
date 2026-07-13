import { describe, expect, it } from 'vitest';
import {
  buildKdsTickets,
  filterPaidKdsTickets,
  mapOrderToKdsTicket,
  refreshTicketAges,
  type KdsOrderRow,
} from './kds-tickets';

const NOW = Date.parse('2026-07-13T12:00:00.000Z');

function order(overrides: Partial<KdsOrderRow> & Pick<KdsOrderRow, 'id' | 'status'>): KdsOrderRow {
  return {
    paid_at: '2026-07-13T11:50:00.000Z',
    created_at: '2026-07-13T11:40:00.000Z',
    order_items: [
      {
        id: 'oi-1',
        quantity: 1,
        modifiers: [{ name: 'No onion' }, { name: 'Medium' }],
        special_instructions: 'Allergy: nuts',
        course: 'main',
        status: 'pending',
        menu_items: { name: 'Wagyu Burger' },
      },
    ],
    table_sessions: { venue_tables: { name: 'Table 12' } },
    ...overrides,
  };
}

describe('KDS paid-only ticket mapping', () => {
  it('never maps pending_payment (unpaid) orders', () => {
    expect(
      mapOrderToKdsTicket(
        order({ id: 'o1', status: 'pending_payment', paid_at: null }),
        NOW
      )
    ).toBeNull();
  });

  it('never maps cancelled or delivered orders', () => {
    expect(mapOrderToKdsTicket(order({ id: 'o1', status: 'cancelled' }), NOW)).toBeNull();
    expect(mapOrderToKdsTicket(order({ id: 'o2', status: 'delivered' }), NOW)).toBeNull();
  });

  it('maps paid kitchen statuses with table, modifiers, and paid_at age', () => {
    const ticket = mapOrderToKdsTicket(order({ id: 'o1', status: 'received' }), NOW);
    expect(ticket).toMatchObject({
      order_id: 'o1',
      table_name: 'Table 12',
      status: 'received',
      received_at: '2026-07-13T11:50:00.000Z',
      age_minutes: 10,
    });
    expect(ticket!.items[0]).toMatchObject({
      name: 'Wagyu Burger',
      modifiers: ['No onion', 'Medium'],
      special_instructions: 'Allergy: nuts',
      course: 'main',
    });
  });

  it('buildKdsTickets drops unpaid rows even if the query leaked them', () => {
    const tickets = buildKdsTickets(
      [
        order({ id: 'unpaid', status: 'pending_payment', paid_at: null }),
        order({
          id: 'paid-old',
          status: 'preparing',
          paid_at: '2026-07-13T11:45:00.000Z',
        }),
        order({
          id: 'paid-new',
          status: 'received',
          paid_at: '2026-07-13T11:55:00.000Z',
        }),
      ],
      NOW
    );

    expect(tickets.map((t) => t.order_id)).toEqual(['paid-old', 'paid-new']);
  });

  it('filterPaidKdsTickets is a client-side belt-and-suspenders guard', () => {
    expect(
      filterPaidKdsTickets([
        {
          order_id: 'x',
          table_name: 'T1',
          status: 'pending_payment',
          received_at: '2026-07-13T11:50:00.000Z',
          age_minutes: 1,
          items: [],
        },
        {
          order_id: 'y',
          table_name: 'T2',
          status: 'ready',
          received_at: '2026-07-13T11:50:00.000Z',
          age_minutes: 1,
          items: [],
        },
      ]).map((t) => t.order_id)
    ).toEqual(['y']);
  });

  it('refreshTicketAges recomputes urgency from received_at', () => {
    const [ticket] = refreshTicketAges(
      [
        {
          order_id: 'o1',
          table_name: 'Table 12',
          status: 'received',
          received_at: '2026-07-13T11:30:00.000Z',
          age_minutes: 0,
          items: [],
        },
      ],
      NOW
    );
    expect(ticket.age_minutes).toBe(30);
  });
});

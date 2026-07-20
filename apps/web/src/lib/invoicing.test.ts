import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { createVenueInvoice, ensureStripeCustomer } from './invoicing';

const venue = { id: 'venue_1', name: 'Test Venue', stripe_customer_id: null as string | null };

function mockSupabase(insertResult: unknown = { id: 'row_1' }) {
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  const single = vi.fn().mockResolvedValue({ data: insertResult, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ update, insert });
  return { client: { from } as unknown as SupabaseClient, update, insert, single };
}

function mockStripe(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    customers: { create: vi.fn().mockResolvedValue({ id: 'cus_new' }) },
    invoiceItems: { create: vi.fn().mockResolvedValue({ id: 'ii_1' }) },
    invoices: {
      create: vi.fn().mockResolvedValue({ id: 'in_1' }),
      finalizeInvoice: vi.fn().mockResolvedValue({
        id: 'in_1',
        status: 'open',
        hosted_invoice_url: 'https://stripe.test/invoice/in_1',
        invoice_pdf: 'https://stripe.test/invoice/in_1.pdf',
        due_date: 1735689600,
      }),
      sendInvoice: vi.fn().mockResolvedValue({ id: 'in_1' }),
    },
    ...overrides,
  } as unknown as Stripe;
}

describe('ensureStripeCustomer', () => {
  it('reuses an existing customer without calling Stripe', async () => {
    const { client } = mockSupabase();
    const stripe = mockStripe();
    const id = await ensureStripeCustomer(stripe, client, { ...venue, stripe_customer_id: 'cus_existing' });
    expect(id).toBe('cus_existing');
    expect(stripe.customers.create).not.toHaveBeenCalled();
  });

  it('creates and persists a customer when missing', async () => {
    const { client, update } = mockSupabase();
    const stripe = mockStripe();
    const id = await ensureStripeCustomer(stripe, client, venue, 'owner@example.com');
    expect(id).toBe('cus_new');
    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'owner@example.com', name: venue.name })
    );
    expect(update).toHaveBeenCalledWith({ stripe_customer_id: 'cus_new' });
  });
});

describe('createVenueInvoice', () => {
  it('creates an invoice item, finalizes with auto_advance disabled, and sends it (send_invoice)', async () => {
    const { client } = mockSupabase();
    const stripe = mockStripe();

    const invoice = await createVenueInvoice(stripe, client, { ...venue, stripe_customer_id: 'cus_existing' }, {
      description: 'Setup fee',
      amount: 5000,
    });

    expect(stripe.invoiceItems.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing', amount: 5000, description: 'Setup fee' })
    );
    expect(stripe.invoices.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing', auto_advance: false, collection_method: 'send_invoice' })
    );
    expect(stripe.invoices.finalizeInvoice).toHaveBeenCalledWith('in_1');
    expect(stripe.invoices.sendInvoice).toHaveBeenCalledWith('in_1');
    expect(invoice).toEqual({ id: 'row_1' });
  });

  it('always uses send_invoice (charge_automatically disabled until admin RBAC)', async () => {
    const { client } = mockSupabase();
    const stripe = mockStripe();

    await createVenueInvoice(stripe, client, { ...venue, stripe_customer_id: 'cus_existing' }, {
      description: 'Adjustment',
      amount: 1200,
    });

    expect(stripe.invoices.create).toHaveBeenCalledWith(
      expect.objectContaining({ collection_method: 'send_invoice' })
    );
    expect(stripe.invoices.sendInvoice).toHaveBeenCalledWith('in_1');
  });
});

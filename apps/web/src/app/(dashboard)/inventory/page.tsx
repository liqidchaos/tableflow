'use client';

import { useEffect, useState } from 'react';
import { Button } from '@tableflow/ui';
import { OperatorPageHeader } from '@/components/dashboard/OperatorPageHeader';
import { useVenueContext } from '@/hooks/useVenueContext';
import type { InventoryItem } from '@tableflow/types';

export default function InventoryPage() {
  const { venueId, authFetch, loading } = useVenueContext();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', unit: 'units', quantity: '0', par_level: '0', supplier: '' });

  async function loadInventory() {
    if (!venueId) return;
    const res = await authFetch(`/api/venues/${venueId}/inventory`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
      setLowStock(data.low_stock ?? []);
    }
  }

  useEffect(() => {
    if (!loading && venueId) loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, venueId]);

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    const res = await authFetch(`/api/venues/${venueId}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        unit: form.unit,
        quantity: parseFloat(form.quantity),
        par_level: parseFloat(form.par_level),
        supplier: form.supplier || undefined,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ name: '', unit: 'units', quantity: '0', par_level: '0', supplier: '' });
      loadInventory();
    }
  }

  async function updateQuantity(itemId: string, quantity: number) {
    await authFetch(`/api/venues/${venueId}/inventory/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    loadInventory();
  }

  async function deleteItem(itemId: string) {
    if (!confirm('Remove this inventory item?')) return;
    await authFetch(`/api/venues/${venueId}/inventory/${itemId}`, { method: 'DELETE' });
    loadInventory();
  }

  return (
    <div>
      <OperatorPageHeader title="Inventory" description="Track stock levels and par alerts." />
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Item'}
        </Button>
      </div>

      {lowStock.length > 0 && (
        <div className="carved-edge mb-6 border-l-2 border-gold bg-luxury-surface-low p-5">
          <p className="label-caps mb-3 text-gold">Low stock alerts</p>
          {lowStock.map((item) => (
            <p key={item.id} className="text-sm text-luxury-on-surface-variant">
              {item.name}: {item.quantity} {item.unit} (par: {item.par_level})
            </p>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={createItem} className="card mb-6">
          <div className="grid gap-3">
            <input className="input" placeholder="Item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="input" placeholder="Unit (lbs, bottles, etc.)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <input className="input" placeholder="Quantity" type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <input className="input" placeholder="Par level" type="number" step="0.01" value={form.par_level} onChange={(e) => setForm({ ...form, par_level: e.target.value })} />
            <input className="input" placeholder="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            <Button type="submit">Save</Button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {items.map((item) => {
          const isLow = Number(item.quantity) <= Number(item.par_level);
          return (
            <div key={item.id} className="card flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-lg font-light">{item.name}</h3>
                <p className="text-sm text-luxury-on-surface-variant">
                  {item.quantity} {item.unit} · Par: {item.par_level}
                  {item.supplier && ` · ${item.supplier}`}
                </p>
                {isLow && <span className="label-caps mt-1 inline-block text-gold">Low stock</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => updateQuantity(item.id, Number(item.quantity) + 10)}>+10</Button>
                <Button variant="ghost" onClick={() => deleteItem(item.id)} className="text-error">
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && !loading && (
          <p className="text-luxury-on-surface-variant">No inventory items yet. Add items to track stock levels.</p>
        )}
      </div>
    </div>
  );
}

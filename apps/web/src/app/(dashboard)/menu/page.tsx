'use client';

import { useEffect, useState } from 'react';
import { OperatorPageHeader } from '@/components/dashboard/OperatorPageHeader';
import { MenuItemCard, Button } from '@tableflow/ui';
import { useVenueContext } from '@/hooks/useVenueContext';
import type { MenuCategoryWithItems, MenuItem } from '@tableflow/types';

export default function MenuPage() {
  const { venueId, authFetch, loading } = useVenueContext();
  const [categories, setCategories] = useState<MenuCategoryWithItems[]>([]);
  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items');
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState({ name: '', price: '', description: '', category_id: '', allergens: '', dietary_tags: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [modifierForm, setModifierForm] = useState({ group_name: '', option_name: '', price_delta: '0' });

  async function loadMenu() {
    if (!venueId) return;
    const res = await authFetch(`/api/venues/${venueId}/menu?available_only=false`);
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories ?? []);
      if (data.categories[0] && !itemForm.category_id) {
        setItemForm((f) => ({ ...f, category_id: data.categories[0].id }));
      }
    }
  }

  useEffect(() => {
    if (!loading && venueId) loadMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, venueId]);

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    const res = await authFetch(`/api/venues/${venueId}/menu/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category_id: itemForm.category_id,
        name: itemForm.name,
        description: itemForm.description,
        price: parseFloat(itemForm.price),
        allergens: itemForm.allergens ? itemForm.allergens.split(',').map((s) => s.trim()) : [],
        dietary_tags: itemForm.dietary_tags ? itemForm.dietary_tags.split(',').map((s) => s.trim()) : [],
      }),
    });
    if (res.ok) {
      setShowItemForm(false);
      setItemForm({ name: '', price: '', description: '', category_id: itemForm.category_id, allergens: '', dietary_tags: '' });
      loadMenu();
    }
  }

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    const res = await authFetch(`/api/venues/${venueId}/menu/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryForm),
    });
    if (res.ok) {
      setShowCategoryForm(false);
      setCategoryForm({ name: '', description: '' });
      loadMenu();
    }
  }

  async function toggle86(itemId: string, available: boolean) {
    await authFetch(`/api/venues/${venueId}/menu/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !available }),
    });
    loadMenu();
  }

  async function deleteItem(itemId: string) {
    if (!confirm('Delete this menu item?')) return;
    await authFetch(`/api/venues/${venueId}/menu/items/${itemId}`, { method: 'DELETE' });
    loadMenu();
  }

  async function uploadImage(itemId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    await authFetch(`/api/venues/${venueId}/menu/items/${itemId}/image`, {
      method: 'POST',
      body: formData,
    });
    loadMenu();
  }

  async function addModifier(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    await authFetch(`/api/venues/${venueId}/menu/items/${selectedItem.id}/modifiers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group_name: modifierForm.group_name,
        options: [{ name: modifierForm.option_name, price_delta: parseFloat(modifierForm.price_delta) || 0 }],
      }),
    });
    setModifierForm({ group_name: '', option_name: '', price_delta: '0' });
    setSelectedItem(null);
    loadMenu();
  }

  const allItems = categories.flatMap((c) => c.items);

  return (
    <div>
      <OperatorPageHeader title="Menu" description="Categories, items, modifiers, and availability." />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setActiveTab(activeTab === 'items' ? 'categories' : 'items')}>
            {activeTab === 'items' ? 'Categories' : 'Items'}
          </Button>
          <Button onClick={() => activeTab === 'items' ? setShowItemForm(!showItemForm) : setShowCategoryForm(!showCategoryForm)}>
            {activeTab === 'items' ? (showItemForm ? 'Cancel' : 'Add Item') : (showCategoryForm ? 'Cancel' : 'Add Category')}
          </Button>
        </div>
      </div>

      {activeTab === 'items' && showItemForm && (
        <form onSubmit={createItem} className="card mb-6">
          <div className="grid gap-3">
            <select className="input" value={itemForm.category_id} onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })} required>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="input" placeholder="Name" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required />
            <input className="input" placeholder="Price" type="number" step="0.01" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} required />
            <input className="input" placeholder="Description" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
            <input className="input" placeholder="Allergens (comma-separated)" value={itemForm.allergens} onChange={(e) => setItemForm({ ...itemForm, allergens: e.target.value })} />
            <input className="input" placeholder="Dietary tags (comma-separated)" value={itemForm.dietary_tags} onChange={(e) => setItemForm({ ...itemForm, dietary_tags: e.target.value })} />
            <Button type="submit">Save Item</Button>
          </div>
        </form>
      )}

      {activeTab === 'categories' && showCategoryForm && (
        <form onSubmit={createCategory} className="card mb-6">
          <div className="grid gap-3">
            <input className="input" placeholder="Category name" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
            <input className="input" placeholder="Description" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
            <Button type="submit">Save Category</Button>
          </div>
        </form>
      )}

      {selectedItem && (
        <form onSubmit={addModifier} className="card mb-6">
          <p className="mb-3 font-medium text-luxury-on-surface">Add modifier to {selectedItem.name}</p>
          <div className="grid gap-3">
            <input className="input" placeholder="Group name (e.g. Size)" value={modifierForm.group_name} onChange={(e) => setModifierForm({ ...modifierForm, group_name: e.target.value })} required />
            <input className="input" placeholder="Option name (e.g. Large)" value={modifierForm.option_name} onChange={(e) => setModifierForm({ ...modifierForm, option_name: e.target.value })} required />
            <input className="input" placeholder="Price delta" type="number" step="0.01" value={modifierForm.price_delta} onChange={(e) => setModifierForm({ ...modifierForm, price_delta: e.target.value })} />
            <div className="flex gap-2">
              <Button type="submit">Add Modifier</Button>
              <Button type="button" variant="secondary" onClick={() => setSelectedItem(null)}>Cancel</Button>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'categories' ? (
        <div className="grid gap-3">
          {categories.map((cat) => (
            <div key={cat.id} className="card flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-light">{cat.name}</h3>
                <p className="text-sm text-luxury-on-surface-variant">{cat.items.length} items</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allItems.map((item) => (
            <div key={item.id}>
              <MenuItemCard
                name={item.name}
                description={item.description}
                price={Number(item.price)}
                imageUrl={item.image_url}
                allergens={item.allergens}
                dietaryTags={item.dietary_tags}
                isAvailable={item.is_available}
              />
              <div className="mt-2 flex flex-col gap-2">
                <label className="cursor-pointer text-sm text-luxury-on-surface-variant">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage(item.id, file);
                    }}
                  />
                  Upload photo
                </label>
                {item.modifiers && item.modifiers.length > 0 && (
                  <p className="text-sm text-luxury-on-surface-variant">
                    {item.modifiers.length} modifier group{item.modifiers.length > 1 ? 's' : ''}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => toggle86(item.id, item.is_available)} className="min-w-0 flex-1">
                    {item.is_available ? '86 Item' : 'Restore'}
                  </Button>
                  <Button variant="ghost" onClick={() => setSelectedItem(item)} className="min-w-0 flex-1">
                    + Modifier
                  </Button>
                  <Button variant="ghost" onClick={() => deleteItem(item.id)} className="text-error">
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

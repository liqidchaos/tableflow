'use client';

import { useMemo, useState } from 'react';
import type { MenuItemWithModifiers, MenuModifierWithOptions } from '@tableflow/types';
import { Button, Sheet } from '@tableflow/ui';
import { unitPrice, type CartLine } from '@/lib/guest-cart';

interface ItemDetailSheetProps {
  item: MenuItemWithModifiers;
  brandColor: string;
  onClose: () => void;
  onAdd: (line: Omit<CartLine, 'lineKey'>) => void;
}

export function ItemDetailSheet({ item, brandColor, onClose, onAdd }: ItemDetailSheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');

  const { modifierSelections, modifierLabels, modifierPriceDeltas, totalUnitPrice } = useMemo(() => {
    const selections: { modifier_id: string; option_id: string }[] = [];
    const labels: string[] = [];
    const deltas: number[] = [];

    for (const group of item.modifiers ?? []) {
      for (const optionId of selected[group.id] ?? []) {
        const option = group.options.find((o) => o.id === optionId);
        if (option) {
          selections.push({ modifier_id: group.id, option_id: option.id });
          labels.push(option.name);
          deltas.push(Number(option.price_delta));
        }
      }
    }

    return {
      modifierSelections: selections,
      modifierLabels: labels,
      modifierPriceDeltas: deltas,
      totalUnitPrice: unitPrice(Number(item.price), deltas),
    };
  }, [item, selected]);

  function toggleOption(group: MenuModifierWithOptions, optionId: string) {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      const isSelected = current.includes(optionId);

      if (group.max_select === 1) {
        return { ...prev, [group.id]: isSelected ? [] : [optionId] };
      }
      if (isSelected) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= group.max_select) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  }

  function validateModifiers(): boolean {
    for (const group of item.modifiers ?? []) {
      const count = (selected[group.id] ?? []).length;
      if (group.is_required && count < Math.max(1, group.min_select)) {
        setError(`Please choose an option for ${group.group_name}`);
        return false;
      }
      if (count < group.min_select) {
        setError(`Choose at least ${group.min_select} for ${group.group_name}`);
        return false;
      }
    }
    setError('');
    return true;
  }

  function handleAdd() {
    if (!validateModifiers()) return;
    onAdd({
      item_id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity,
      modifiers: modifierSelections,
      modifierLabels,
      modifierPriceDeltas,
      special_instructions: instructions || undefined,
      course: 'main',
      image_url: item.image_url ?? undefined,
    });
    onClose();
  }

  return (
    <Sheet onClose={onClose} title={item.name} variant="dark">
      {item.image_url && (
        <div
          className="mb-4 h-[200px] rounded-lg bg-cover bg-center"
          style={{ backgroundImage: `url(${item.image_url})` }}
        />
      )}
      <h2 className="m-0 font-serif text-2xl font-light text-luxury-on-surface">{item.name}</h2>
      <p className="my-2 font-mono text-lg font-semibold text-luxury-on-surface">
        ${totalUnitPrice.toFixed(2)}
      </p>
      {item.description && (
        <p className="mb-4 text-luxury-on-surface-variant">{item.description}</p>
      )}
      {item.allergens?.length > 0 && (
        <p className="mb-4 text-sm text-gold">
          Allergens: {item.allergens.join(', ')}
        </p>
      )}

      {(item.modifiers ?? []).map((group) => (
        <div key={group.id} className="mb-5">
          <p className="mb-1 font-serif text-xl font-light text-luxury-on-surface">
            {group.group_name}
            {group.is_required ? ' *' : ''}
          </p>
          <p className="mb-2 text-sm text-luxury-on-surface-variant">
            {group.max_select === 1 ? 'Choose one' : `Choose up to ${group.max_select}`}
          </p>
          {group.options
            .filter((o) => o.is_available)
            .map((option) => {
              const isOn = (selected[group.id] ?? []).includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleOption(group, option.id)}
                  className="mb-2 flex w-full cursor-pointer items-center justify-between rounded-full px-4 py-3 text-left transition-colors"
                  style={{
                    border: `1.5px solid ${isOn ? brandColor : 'var(--color-luxury-outline-variant)'}`,
                    background: isOn ? `${brandColor}18` : 'var(--color-luxury-surface-high)',
                    color: 'var(--color-luxury-on-surface)',
                    fontWeight: isOn ? 600 : 400,
                  }}
                >
                  <span>{option.name}</span>
                  {Number(option.price_delta) !== 0 && (
                    <span className="font-mono text-luxury-on-surface-variant">
                      {Number(option.price_delta) > 0 ? '+' : ''}${Number(option.price_delta).toFixed(2)}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      ))}

      <textarea
        placeholder="Special instructions (e.g. no onions)"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        rows={2}
        className="input mb-4 w-full resize-y border-luxury-outline-variant/40 bg-luxury-surface-high text-luxury-on-surface placeholder:text-luxury-on-surface-variant/60"
      />

      <div className="mb-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-luxury-outline-variant bg-luxury-surface-high text-xl font-semibold text-luxury-on-surface"
        >
          −
        </button>
        <span className="min-w-6 text-center font-mono font-semibold text-luxury-on-surface">{quantity}</span>
        <button
          type="button"
          onClick={() => setQuantity(quantity + 1)}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-luxury-outline-variant bg-luxury-surface-high text-xl font-semibold text-luxury-on-surface"
        >
          +
        </button>
      </div>

      {error && <p className="mb-3 text-error">{error}</p>}

      <Button onClick={handleAdd} accentColor={brandColor} style={{ width: '100%' }}>
        Add to cart (${(totalUnitPrice * quantity).toFixed(2)})
      </Button>
    </Sheet>
  );
}

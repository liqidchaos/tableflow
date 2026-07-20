import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { cartLineKey, cartTotal, type CartModifier } from '../utils/cart';

export interface CartItem {
  lineKey: string;
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: CartModifier[];
  modifierLabels?: string[];
  modifierPriceDeltas?: number[];
  special_instructions?: string;
  course: string;
  image_url?: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'lineKey'>) => void;
  removeItem: (lineKey: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: Omit<CartItem, 'lineKey'>) => {
    const lineKey = cartLineKey(item);
    setItems((prev) => {
      const existing = prev.find((i) => i.lineKey === lineKey);
      if (existing) {
        return prev.map((i) =>
          i.lineKey === lineKey ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, { ...item, lineKey }];
    });
  }, []);

  const removeItem = useCallback((lineKey: string) => {
    setItems((prev) => prev.filter((i) => i.lineKey !== lineKey));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = useMemo(() => cartTotal(items), [items]);
  const itemCount = useMemo(() => items.reduce((n, i) => n + i.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

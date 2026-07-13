import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useSession } from '../context/SessionContext';
import type { OrderItem } from '@tableflow/types';

interface OrderDetail {
  id: string;
  status: string;
  subtotal: number;
  order_items: Array<
    OrderItem & {
      menu_items?: { name: string } | null;
    }
  >;
}

export function useOrderDetail(orderId: string) {
  const { sessionToken } = useSession();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !sessionToken || orderId === 'pending') {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    apiFetch(`/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, sessionToken]);

  return { order, loading };
}

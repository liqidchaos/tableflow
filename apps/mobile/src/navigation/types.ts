import type { MenuItemWithModifiers } from '@tableflow/types';
import type { FloorTable } from '@tableflow/types';

export type RootStackParamList = {
  Scan: undefined;
  Menu: undefined;
  ItemDetail: { itemId: string; item: MenuItemWithModifiers };
  Cart: undefined;
  OrderStatus: { orderId: string };
  Payment: { mode?: 'setup' | 'close' | 'pay_order'; tabTotal?: number; orderId?: string; orderTotal?: number } | undefined;
  GuestRequests: undefined;
  ServerLogin: undefined;
  ServerFloor: undefined;
  ServerTable: { table: FloorTable; venueId: string };
  ServerRequests: { venueId: string };
};

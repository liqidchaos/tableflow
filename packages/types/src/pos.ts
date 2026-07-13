import type { MenuItem, Order } from './database';

export type POSProvider = 'toast' | 'square' | 'clover' | 'standalone';

export interface POSAdapter {
  syncMenu(venueId: string): Promise<MenuItem[]>;
  pushOrder(order: Order): Promise<string>;
  getOrderStatus(posOrderId: string): Promise<string>;
}

function notImplemented(provider: POSProvider): never {
  throw new Error(`${provider} POS integration is not configured — TableFlow runs in standalone mode`);
}

export class ToastAdapter implements POSAdapter {
  async syncMenu(_venueId: string): Promise<MenuItem[]> {
    return notImplemented('toast');
  }
  async pushOrder(_order: Order): Promise<string> {
    return notImplemented('toast');
  }
  async getOrderStatus(_posOrderId: string): Promise<string> {
    return notImplemented('toast');
  }
}

export class SquareAdapter implements POSAdapter {
  async syncMenu(_venueId: string): Promise<MenuItem[]> {
    return notImplemented('square');
  }
  async pushOrder(_order: Order): Promise<string> {
    return notImplemented('square');
  }
  async getOrderStatus(_posOrderId: string): Promise<string> {
    return notImplemented('square');
  }
}

export class CloverAdapter implements POSAdapter {
  async syncMenu(_venueId: string): Promise<MenuItem[]> {
    return notImplemented('clover');
  }
  async pushOrder(_order: Order): Promise<string> {
    return notImplemented('clover');
  }
  async getOrderStatus(_posOrderId: string): Promise<string> {
    return notImplemented('clover');
  }
}

/** No-op adapter — TableFlow is the POS */
export class StandaloneAdapter implements POSAdapter {
  async syncMenu(_venueId: string): Promise<MenuItem[]> {
    return [];
  }
  async pushOrder(_order: Order): Promise<string> {
    return `tf-${_order.id}`;
  }
  async getOrderStatus(_posOrderId: string): Promise<string> {
    return 'synced';
  }
}

export function createPOSAdapter(provider: POSProvider | null | undefined): POSAdapter {
  switch (provider) {
    case 'toast':
      return new ToastAdapter();
    case 'square':
      return new SquareAdapter();
    case 'clover':
      return new CloverAdapter();
    default:
      return new StandaloneAdapter();
  }
}

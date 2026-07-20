export type TabMode = 'preauth' | 'pay_per_order' | 'bar_tab';
export type QrMode = 'static' | 'dynamic';
export type OrderStatus =
  | 'pending_payment'
  | 'received'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';
export type OrderItemStatus = 'pending' | 'preparing' | 'done' | 'cancelled';
export type SessionStatus = 'open' | 'closed' | 'abandoned';
export type RequestType = 'water' | 'bread' | 'napkins' | 'check' | 'custom';
export type RequestStatus = 'pending' | 'acknowledged' | 'fulfilled';
export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';
export type StaffRole = 'server' | 'kitchen' | 'manager' | 'owner';
export type VenuePlan = 'starter' | 'growth' | 'multi_venue';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'expired';

export interface Venue {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  stripe_account_id: string | null;
  stripe_onboarded: boolean;
  logo_url: string | null;
  brand_color: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  /** Opt-in: Stripe Tax calculations incur live-mode fees and require an active tax registration. */
  tax_enabled: boolean;
  timezone: string;
  currency: string;
  pos_provider: string | null;
  pos_access_token: string | null;
  pos_location_id: string | null;
  qr_mode: QrMode;
  nfc_enabled: boolean;
  tab_mode: TabMode;
  service_fee_pct: number;
  plan: VenuePlan;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface VenueTable {
  id: string;
  venue_id: string;
  name: string;
  capacity: number;
  qr_code: string | null;
  nfc_uid: string | null;
  is_active: boolean;
  position_x: number | null;
  position_y: number | null;
  /** Primary server for request routing; null = broadcast to all servers. */
  assigned_staff_id: string | null;
  created_at: string;
}

export interface TableSession {
  id: string;
  venue_id: string;
  table_id: string;
  status: SessionStatus;
  tab_mode: TabMode;
  stripe_payment_intent: string | null;
  stripe_customer_id: string | null;
  opened_at: string;
  closed_at: string | null;
  total_amount: number;
  tip_amount: number;
  platform_fee: number;
  created_at: string;
}

export interface SessionGuest {
  id: string;
  session_id: string;
  user_id: string | null;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  stripe_pm_id: string | null;
  push_token: string | null;
  joined_at: string;
}

export interface MenuCategory {
  id: string;
  venue_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  venue_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  allergens: string[];
  dietary_tags: string[];
  prep_time_minutes: number | null;
  calories: number | null;
  sort_order: number;
  pos_item_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MenuItemModifier {
  id: string;
  item_id: string;
  group_name: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
}

export interface MenuModifierOption {
  id: string;
  modifier_id: string;
  name: string;
  price_delta: number;
  is_available: boolean;
  sort_order: number;
}

export interface Order {
  id: string;
  venue_id: string;
  session_id: string;
  guest_id: string | null;
  status: OrderStatus;
  subtotal: number;
  notes: string | null;
  fired_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemModifierSnapshot {
  modifier_id: string;
  option_id: string;
  name: string;
  price_delta: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  modifiers: OrderItemModifierSnapshot[];
  special_instructions: string | null;
  status: OrderItemStatus;
  course: string;
  is_held: boolean;
  created_at: string;
}

export interface ItemRequest {
  id: string;
  venue_id: string;
  session_id: string;
  table_id: string;
  request_type: RequestType;
  custom_text: string | null;
  status: RequestStatus;
  created_at: string;
  acknowledged_at: string | null;
  fulfilled_at: string | null;
}

export interface Payment {
  id: string;
  venue_id: string;
  session_id: string;
  guest_id: string | null;
  order_id: string | null;
  stripe_payment_intent: string;
  stripe_charge_id: string | null;
  amount: number;
  tip_amount: number;
  platform_fee: number;
  tax_amount: number;
  stripe_tax_calculation_id: string | null;
  currency: string;
  status: PaymentStatus;
  payment_method_type: string | null;
  split_type: string | null;
  created_at: string;
  captured_at: string | null;
}

export type VenueInvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface VenueInvoice {
  id: string;
  venue_id: string;
  stripe_invoice_id: string;
  stripe_invoice_item_id: string | null;
  description: string;
  amount: number;
  currency: string;
  status: VenueInvoiceStatus;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  due_date: string | null;
  created_at: string;
  paid_at: string | null;
  voided_at: string | null;
}

export interface Staff {
  id: string;
  venue_id: string;
  user_id: string;
  role: StaffRole;
  display_name: string | null;
  pin: string | null;
  push_token: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  venue_id: string;
  name: string;
  unit: string;
  quantity: number;
  par_level: number;
  cost_per_unit: number | null;
  supplier: string | null;
  last_restocked: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIInsight {
  id: string;
  venue_id: string;
  type: string;
  content: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface MenuModifierWithOptions extends MenuItemModifier {
  options: MenuModifierOption[];
}

export interface MenuItemWithModifiers extends MenuItem {
  modifiers: MenuModifierWithOptions[];
}

export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItemWithModifiers[];
}

export interface SessionScanResponse {
  session_id: string;
  session_token: string;
  venue_id: string;
  table_id: string;
  table_name: string;
  venue_name: string;
  tab_mode: TabMode;
  currency: string;
  brand_color: string;
  existing_order_count: number;
  guest_id: string;
}

export type FloorTableStatus =
  | 'empty'
  | 'ordering'
  | 'eating'
  | 'paying'
  | 'needs_attention';

export interface FloorTable {
  id: string;
  name: string;
  status: FloorTableStatus;
  guest_count: number;
  open_orders: number;
  pending_requests: number;
  session_id: string | null;
  tab_total: number;
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
}

export interface KDSTicket {
  order_id: string;
  table_name: string;
  status: OrderStatus;
  received_at: string;
  age_minutes: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    modifiers: string[];
    special_instructions: string | null;
    course: string;
    status: OrderItemStatus;
  }>;
}

export interface VenueStats {
  menu_items: number;
  active_tables: number;
  today_orders: number;
  today_revenue: number;
}

export interface AnalyticsSummary {
  period: 'day' | 'week' | 'month';
  revenue: number;
  covers: number;
  avg_check: number;
  order_count: number;
}

export interface TopMenuItem {
  item_id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface OrderWithDetails extends Order {
  table_name: string | null;
  item_count: number;
}

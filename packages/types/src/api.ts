import { z } from 'zod';

export const StaffLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  venue_name: z.string().min(1),
});

export const ScanSessionSchema = z.object({
  qr_code: z.string().optional(),
  nfc_uid: z.string().optional(),
}).refine((d) => d.qr_code || d.nfc_uid, { message: 'qr_code or nfc_uid required' });

export const AddGuestSchema = z.object({
  display_name: z.string().min(1),
  email: z.string().email().optional(),
});

export const CreateTableSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().int().positive().default(4),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
  assigned_staff_id: z.string().uuid().nullable().optional(),
});

export const UpdateTableSchema = z.object({
  name: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
  assigned_staff_id: z.string().uuid().nullable().optional(),
});

export const UpdateVenueSchema = z.object({
  name: z.string().min(1).optional(),
  tab_mode: z.enum(['preauth', 'pay_per_order', 'bar_tab']).optional(),
  qr_mode: z.enum(['static', 'dynamic']).optional(),
  nfc_enabled: z.boolean().optional(),
  brand_color: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  timezone: z.string().optional(),
});

export const CreateMenuItemSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  image_url: z.string().url().optional(),
  allergens: z.array(z.string()).default([]),
  dietary_tags: z.array(z.string()).default([]),
  prep_time_minutes: z.number().int().positive().optional(),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial();

export const CreateCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sort_order: z.number().int().default(0),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export const CreateModifierSchema = z.object({
  group_name: z.string().min(1),
  is_required: z.boolean().default(false),
  min_select: z.number().int().min(0).default(0),
  max_select: z.number().int().min(1).default(1),
  options: z.array(z.object({
    name: z.string().min(1),
    price_delta: z.number().default(0),
  })).min(1),
});

export const CreateStaffSchema = z.object({
  email: z.string().email(),
  display_name: z.string().min(1),
  role: z.enum(['server', 'kitchen', 'manager']),
});

export const UpdateStaffSchema = z.object({
  display_name: z.string().min(1).optional(),
  role: z.enum(['server', 'kitchen', 'manager']).optional(),
  is_active: z.boolean().optional(),
  push_token: z.string().optional(),
});

export const CreateInventorySchema = z.object({
  name: z.string().min(1),
  unit: z.string().default('units'),
  quantity: z.number().min(0).default(0),
  par_level: z.number().min(0).default(0),
  cost_per_unit: z.number().min(0).optional(),
  supplier: z.string().optional(),
});

export const UpdateInventorySchema = CreateInventorySchema.partial();

export const OrderItemInputSchema = z.object({
  item_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  modifiers: z.array(z.object({
    modifier_id: z.string().uuid(),
    option_id: z.string().uuid(),
  })).default([]),
  special_instructions: z.string().optional(),
  course: z.enum(['starter', 'main', 'dessert', 'drink']).default('main'),
});

export const CreateOrderSchema = z.object({
  session_id: z.string().uuid(),
  guest_id: z.string().uuid(),
  items: z.array(OrderItemInputSchema).min(1),
  notes: z.string().optional(),
});

export const UpdateOrderStatusSchema = z.object({
  /** `received` is staff-only: mark paid / fire a pending_payment ticket to the kitchen. */
  status: z.enum(['received', 'preparing', 'ready', 'delivered', 'cancelled']),
});

export const UpdateOrderItemStatusSchema = z.object({
  status: z.enum(['preparing', 'done', 'cancelled']),
});

export const HoldOrderItemSchema = z.object({
  is_held: z.boolean(),
});

export const CreateRequestSchema = z.object({
  session_id: z.string().uuid(),
  table_id: z.string().uuid(),
  request_type: z.enum(['water', 'bread', 'napkins', 'check', 'custom']),
  custom_text: z.string().optional(),
});

export const UpdateRequestSchema = z.object({
  status: z.enum(['acknowledged', 'fulfilled']),
});

export const SetupIntentSchema = z.object({
  session_id: z.string().uuid(),
  guest_id: z.string().uuid(),
});

export const AuthorizePaymentSchema = z.object({
  session_id: z.string().uuid(),
  guest_id: z.string().uuid(),
  amount: z.number().int().positive(),
  payment_method_id: z.string(),
});

export const CapturePaymentSchema = z.object({
  payment_intent_id: z.string(),
  final_amount: z.number().int().positive(),
  tip_amount: z.number().int().min(0).default(0),
});

export const ChargePaymentSchema = z.object({
  session_id: z.string().uuid(),
  guest_id: z.string().uuid(),
  order_id: z.string().uuid(),
  amount: z.number().int().positive(),
  tip_amount: z.number().int().min(0).default(0),
  payment_method_id: z.string(),
});

export const SplitPaymentSchema = z.object({
  session_id: z.string().uuid(),
  split_type: z.enum(['individual', 'even', 'custom']),
  payments: z.array(z.object({
    guest_id: z.string().uuid(),
    amount: z.number().int().positive(),
    tip_amount: z.number().int().min(0).default(0),
    payment_method_id: z.string(),
  })),
});

export const RefundPaymentSchema = z.object({
  payment_intent_id: z.string(),
  amount: z.number().int().positive().optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).default('requested_by_customer'),
});

export const BillingCheckoutSchema = z.object({
  plan: z.enum(['starter', 'growth']),
});

export const CreatePaymentIntentSchema = z.object({
  session_id: z.string().uuid(),
  guest_id: z.string().uuid(),
  order_id: z.string().uuid().optional(),
  amount: z.number().int().positive(),
  tip_amount: z.number().int().min(0).default(0),
  mode: z.enum(['pay_order', 'preauth']).default('pay_order'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ScanSessionInput = z.infer<typeof ScanSessionSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

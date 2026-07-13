# TableFlow — API Specification
**Version:** 1.0  
**Base URL:** `https://api.tableflow.com/v1`  
**Auth:** Supabase JWT (Bearer token) for all authenticated endpoints  
**Content-Type:** `application/json`

---

## Authentication

All requests except public menu endpoints require:
```
Authorization: Bearer <supabase_jwt>
```

Session-scoped guest endpoints use a short-lived **session token** issued at QR scan time. This token is scoped to a single `table_session` and expires when the session closes.

---

## Endpoint Groups

1. Auth & Onboarding
2. Venue & Table Management
3. QR / NFC Session
4. Menu
5. Orders
6. Payments
7. Requests (water, bread, etc.)
8. Staff & KDS
9. Inventory
10. Analytics & AI

---

## 1. Auth & Onboarding

### `POST /auth/register`
Register a new operator account.

**Body:**
```json
{
  "email": "owner@venue.com",
  "password": "string",
  "full_name": "string",
  "venue_name": "string"
}
```

**Response `201`:**
```json
{
  "user_id": "uuid",
  "venue_id": "uuid",
  "access_token": "string",
  "stripe_onboarding_url": "https://connect.stripe.com/..."
}
```

---

### `POST /auth/stripe-onboard`
Initiates or refreshes Stripe Connect Express onboarding for a venue.

**Auth:** Operator JWT  
**Response `200`:**
```json
{
  "onboarding_url": "https://connect.stripe.com/setup/e/..."
}
```

---

### `GET /auth/stripe-status`
Check Stripe Connect onboarding status.

**Auth:** Operator JWT  
**Response `200`:**
```json
{
  "stripe_account_id": "acct_xxx",
  "onboarded": true,
  "payouts_enabled": true,
  "charges_enabled": true
}
```

---

## 2. Venue & Table Management

### `GET /venues/:venue_id`
Get venue details.

**Auth:** Operator JWT  
**Response `200`:** Full venue object

---

### `PATCH /venues/:venue_id`
Update venue settings.

**Auth:** Operator JWT  
**Body (partial):**
```json
{
  "name": "string",
  "tab_mode": "preauth | pay_per_order | bar_tab",
  "qr_mode": "static | dynamic",
  "nfc_enabled": true,
  "brand_color": "#FF5733"
}
```

---

### `GET /venues/:venue_id/tables`
List all tables.

**Auth:** Operator or Staff JWT  
**Response `200`:**
```json
{
  "tables": [
    {
      "id": "uuid",
      "name": "Table 4",
      "capacity": 4,
      "qr_code": "tf_t_xxxx",
      "nfc_uid": "string|null",
      "is_active": true,
      "active_session_id": "uuid|null"
    }
  ]
}
```

---

### `POST /venues/:venue_id/tables`
Create a new table.

**Auth:** Operator JWT  
**Body:**
```json
{
  "name": "Table 7",
  "capacity": 6,
  "position_x": 120,
  "position_y": 340
}
```

**Response `201`:** Table object with generated `qr_code`

---

### `POST /venues/:venue_id/tables/:table_id/regenerate-qr`
Regenerate QR code for a table (static mode only).

**Auth:** Operator JWT  
**Response `200`:**
```json
{
  "qr_code": "tf_t_newcode",
  "qr_image_url": "https://..."
}
```

---

## 3. QR / NFC Session

### `POST /sessions/scan`
Called when a guest scans a QR code or taps NFC. Creates or resumes a session.

**Auth:** None (public)  
**Body:**
```json
{
  "qr_code": "tf_t_xxxx",
  "nfc_uid": "string|null"
}
```

**Response `200`:**
```json
{
  "session_id": "uuid",
  "session_token": "string",                // short-lived JWT scoped to this session
  "venue_id": "uuid",
  "table_id": "uuid",
  "table_name": "Table 4",
  "venue_name": "The Rusty Anchor",
  "tab_mode": "preauth",
  "currency": "usd",
  "existing_order_count": 0
}
```

---

### `POST /sessions/:session_id/guests`
Add a guest to the session (for split billing).

**Auth:** Session token  
**Body:**
```json
{
  "display_name": "Alex",
  "email": "alex@email.com"
}
```

**Response `201`:** Guest object with `guest_id`

---

### `GET /sessions/:session_id`
Get full session state.

**Auth:** Session token or Staff JWT  
**Response `200`:** Session object with guests, orders, and open tab total

---

### `DELETE /sessions/:session_id`
Close a session (manager/staff only).

**Auth:** Staff JWT  

---

## 4. Menu

### `GET /venues/:venue_id/menu`
Fetch full menu. Public endpoint — no auth required.

**Query params:**
- `?category_id=uuid` — filter by category
- `?available_only=true` — exclude 86'd items (default true)

**Response `200`:**
```json
{
  "venue_id": "uuid",
  "categories": [
    {
      "id": "uuid",
      "name": "Starters",
      "sort_order": 0,
      "items": [
        {
          "id": "uuid",
          "name": "Truffle Fries",
          "description": "Hand-cut fries, truffle oil, parmesan",
          "price": 12.00,
          "image_url": "https://...",
          "is_available": true,
          "allergens": ["dairy"],
          "dietary_tags": ["vegetarian"],
          "modifiers": [
            {
              "id": "uuid",
              "group_name": "Add-ons",
              "is_required": false,
              "options": [
                { "id": "uuid", "name": "Extra Parmesan", "price_delta": 1.50 }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

### `POST /venues/:venue_id/menu/items`
Create a menu item.

**Auth:** Operator JWT  
**Body:**
```json
{
  "category_id": "uuid",
  "name": "Wagyu Burger",
  "description": "string",
  "price": 28.00,
  "image_url": "https://...",
  "allergens": ["gluten", "dairy"],
  "dietary_tags": [],
  "prep_time_minutes": 12
}
```

---

### `PATCH /venues/:venue_id/menu/items/:item_id`
Update item. Use `is_available: false` to instantly 86 an item.

**Auth:** Operator JWT  

---

### `DELETE /venues/:venue_id/menu/items/:item_id`
Soft delete a menu item.

**Auth:** Operator JWT  

---

### `POST /venues/:venue_id/menu/items/:item_id/image`
Upload item image to Supabase Storage.

**Auth:** Operator JWT  
**Content-Type:** `multipart/form-data`  
**Body:** `file` field with image  
**Response `200`:** `{ "image_url": "https://..." }`

---

## 5. Orders

### `POST /orders`
Place a new order.

**Auth:** Session token  
**Body:**
```json
{
  "session_id": "uuid",
  "guest_id": "uuid",
  "items": [
    {
      "item_id": "uuid",
      "quantity": 2,
      "modifiers": [
        { "modifier_id": "uuid", "option_id": "uuid" }
      ],
      "special_instructions": "No onions",
      "course": "main"
    }
  ],
  "notes": "Allergy: shellfish"
}
```

**Response `201`:**
```json
{
  "order_id": "uuid",
  "status": "received",
  "subtotal": 36.00,
  "estimated_prep_minutes": 14
}
```

---

### `GET /orders/:order_id`
Get order status and items.

**Auth:** Session token or Staff JWT  

---

### `GET /sessions/:session_id/orders`
Get all orders for a session.

**Auth:** Session token or Staff JWT  

---

### `PATCH /orders/:order_id/status`
Update order status.

**Auth:** Staff JWT  
**Body:**
```json
{
  "status": "preparing | ready | delivered | cancelled"
}
```

---

### `PATCH /order-items/:item_id/status`
Update individual item status (KDS use).

**Auth:** Staff JWT  
**Body:**
```json
{
  "status": "preparing | done | cancelled"
}
```

---

### `PATCH /order-items/:item_id/hold`
Hold or fire an item.

**Auth:** Staff JWT  
**Body:**
```json
{
  "is_held": true
}
```

---

## 6. Payments

### `POST /payments/setup-intent`
Create a Stripe SetupIntent to save a payment method (preauth / bar tab mode).

**Auth:** Session token  
**Body:**
```json
{
  "session_id": "uuid",
  "guest_id": "uuid"
}
```

**Response `200`:**
```json
{
  "client_secret": "seti_xxx_secret_xxx",
  "stripe_customer_id": "cus_xxx"
}
```

---

### `POST /payments/authorize`
Authorize (preauth) a payment amount. Card not charged yet.

**Auth:** Session token  
**Body:**
```json
{
  "session_id": "uuid",
  "guest_id": "uuid",
  "amount": 8000,            // cents
  "payment_method_id": "pm_xxx"
}
```

**Response `200`:**
```json
{
  "payment_intent_id": "pi_xxx",
  "status": "requires_capture",
  "amount_authorized": 8000
}
```

---

### `POST /payments/capture`
Capture a previously authorized payment (add tip, close tab).

**Auth:** Session token or Staff JWT  
**Body:**
```json
{
  "payment_intent_id": "pi_xxx",
  "final_amount": 8500,      // cents, may differ from authorized amount (tip)
  "tip_amount": 500
}
```

**Response `200`:**
```json
{
  "status": "captured",
  "amount_captured": 8500,
  "receipt_url": "https://..."
}
```

---

### `POST /payments/charge`
Immediate charge (pay-per-order mode).

**Auth:** Session token  
**Body:**
```json
{
  "session_id": "uuid",
  "guest_id": "uuid",
  "order_id": "uuid",
  "amount": 3600,
  "tip_amount": 720,
  "payment_method_id": "pm_xxx"
}
```

---

### `POST /payments/split`
Record split payment — call once per paying guest.

**Auth:** Session token  
**Body:**
```json
{
  "session_id": "uuid",
  "split_type": "individual | even | custom",
  "payments": [
    {
      "guest_id": "uuid",
      "amount": 4200,
      "tip_amount": 840,
      "payment_method_id": "pm_xxx"
    }
  ]
}
```

---

### `POST /payments/refund`
Refund a payment (manager only).

**Auth:** Operator JWT  
**Body:**
```json
{
  "payment_intent_id": "pi_xxx",
  "amount": 1200,
  "reason": "duplicate | fraudulent | requested_by_customer"
}
```

---

## 7. Item Requests

### `POST /requests`
Guest submits a request (water, bread, etc.).

**Auth:** Session token  
**Body:**
```json
{
  "session_id": "uuid",
  "table_id": "uuid",
  "request_type": "water | bread | napkins | check | custom",
  "custom_text": "Can we get some hot sauce?"
}
```

**Response `201`:** Request object

---

### `GET /venues/:venue_id/requests`
Get all pending requests for a venue.

**Auth:** Staff JWT  
**Query:** `?status=pending`

---

### `PATCH /requests/:request_id`
Acknowledge or fulfill a request.

**Auth:** Staff JWT  
**Body:**
```json
{
  "status": "acknowledged | fulfilled"
}
```

---

## 8. Staff & KDS

### `GET /venues/:venue_id/floor`
Live floor view — all tables with session and order status.

**Auth:** Staff JWT  
**Response `200`:**
```json
{
  "tables": [
    {
      "id": "uuid",
      "name": "Table 4",
      "status": "empty | active | needs_attention | tab_open",
      "guest_count": 3,
      "open_orders": 2,
      "pending_requests": 1,
      "session_id": "uuid|null",
      "tab_total": 96.00
    }
  ]
}
```

---

### `GET /venues/:venue_id/kds`
Kitchen display feed — all active orders sorted by time.

**Auth:** Staff JWT  
**Response `200`:**
```json
{
  "tickets": [
    {
      "order_id": "uuid",
      "table_name": "Table 4",
      "status": "received",
      "received_at": "2026-06-25T20:14:00Z",
      "age_minutes": 3,
      "items": [
        {
          "id": "uuid",
          "name": "Wagyu Burger",
          "quantity": 1,
          "modifiers": ["Medium rare"],
          "special_instructions": "No onions",
          "course": "main",
          "status": "pending"
        }
      ]
    }
  ]
}
```

---

### `POST /venues/:venue_id/staff`
Add a staff member.

**Auth:** Operator JWT  
**Body:**
```json
{
  "email": "server@venue.com",
  "role": "server | kitchen | manager",
  "display_name": "Maria"
}
```

---

## 9. Inventory

### `GET /venues/:venue_id/inventory`
List all inventory items.

**Auth:** Operator or Manager JWT  

---

### `POST /venues/:venue_id/inventory`
Add an inventory item.

**Auth:** Operator JWT  
**Body:**
```json
{
  "name": "Ribeye",
  "unit": "kg",
  "quantity": 12.5,
  "par_level": 3.0,
  "cost_per_unit": 28.00
}
```

---

### `PATCH /venues/:venue_id/inventory/:item_id`
Update inventory quantity (restock or manual adjustment).

**Auth:** Operator or Manager JWT  
**Body:**
```json
{
  "quantity": 18.0,
  "last_restocked": "2026-06-25T09:00:00Z"
}
```

---

### `GET /venues/:venue_id/inventory/alerts`
Items at or below par level.

**Auth:** Operator or Manager JWT  
**Response `200`:**
```json
{
  "alerts": [
    {
      "item_id": "uuid",
      "name": "Truffle Oil",
      "quantity": 0.2,
      "par_level": 1.0,
      "unit": "liters",
      "severity": "critical | warning"
    }
  ]
}
```

---

## 10. Analytics & AI

### `GET /venues/:venue_id/analytics/summary`
Revenue and covers summary.

**Auth:** Operator JWT  
**Query:** `?period=today|week|month&tz=America/New_York`

**Response `200`:**
```json
{
  "period": "week",
  "revenue": 14820.00,
  "covers": 342,
  "avg_check": 43.33,
  "orders_count": 412,
  "top_items": [
    { "item_id": "uuid", "name": "Wagyu Burger", "quantity_sold": 87, "revenue": 2436.00 }
  ],
  "revenue_by_day": [
    { "date": "2026-06-19", "revenue": 2140.00, "covers": 48 }
  ]
}
```

---

### `GET /venues/:venue_id/analytics/items`
Item-level performance.

**Auth:** Operator JWT  
**Query:** `?sort=revenue|quantity|margin&period=week`

---

### `GET /venues/:venue_id/ai/insights`
Fetch latest AI-generated insights.

**Auth:** Operator JWT  
**Response `200`:**
```json
{
  "insights": [
    {
      "id": "uuid",
      "type": "demand_forecast",
      "content": "Based on last 4 Saturdays, expect 22% higher ribeye demand tonight. Recommend prepping 8 additional portions.",
      "created_at": "2026-06-25T06:00:00Z",
      "is_read": false
    }
  ]
}
```

---

### `POST /venues/:venue_id/ai/upsell`
Get contextual upsell suggestions for a current order.

**Auth:** Session token  
**Body:**
```json
{
  "current_items": ["uuid", "uuid"],
  "session_context": {
    "time_of_day": "evening",
    "day_of_week": "saturday"
  }
}
```

**Response `200`:**
```json
{
  "suggestions": [
    {
      "item_id": "uuid",
      "name": "House Red Wine",
      "reason": "Ordered with Wagyu Burger by 78% of guests",
      "price": 12.00
    }
  ]
}
```

---

## Webhooks (Stripe → TableFlow)

TableFlow listens for the following Stripe webhook events at `POST /webhooks/stripe`:

| Event | Action |
|---|---|
| `payment_intent.amount_capturable_updated` | Confirm preauth success, update payment record |
| `payment_intent.succeeded` | Mark payment captured, close tab if final |
| `payment_intent.payment_failed` | Notify guest, prompt retry |
| `account.updated` | Update Stripe Connect onboarding status |
| `charge.refunded` | Update payment record, notify operator |

---

## Error Format

All errors return:
```json
{
  "error": {
    "code": "SESSION_EXPIRED",
    "message": "This table session has been closed.",
    "status": 401
  }
}
```

### Error Codes

| Code | Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `SESSION_EXPIRED` | 401 | Table session closed or expired |
| `FORBIDDEN` | 403 | Insufficient role |
| `NOT_FOUND` | 404 | Resource not found |
| `ITEM_UNAVAILABLE` | 409 | Ordered item is 86'd |
| `PAYMENT_FAILED` | 402 | Stripe payment failure |
| `VENUE_NOT_ONBOARDED` | 403 | Stripe Connect not completed |
| `VALIDATION_ERROR` | 422 | Request body failed validation |
| `RATE_LIMITED` | 429 | Too many requests |

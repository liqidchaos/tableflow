# TableFlow — Design System
**Version:** 1.0  
**Applies to:** Guest App · Server App · Operator Dashboard · KDS

---

## Brand Identity

**Name:** TableFlow  
**Positioning:** Modern, invisible infrastructure for hospitality. The product should feel premium but never clinical — warm enough for a guest, clean enough for a kitchen.  
**Tone:** Direct, confident, minimal. No exclamation points in UI copy. No loading text that says "Please wait..." — always specific ("Getting your menu", "Confirming order").

---

## Color Palette

### Core
| Token | Hex | Usage |
|---|---|---|
| `--color-ink` | `#0F0F0F` | Primary text, headings |
| `--color-paper` | `#FAFAF8` | Default background (warm off-white) |
| `--color-surface` | `#FFFFFF` | Cards, modals, elevated surfaces |
| `--color-border` | `#E8E6E1` | Subtle dividers |

### Brand
| Token | Hex | Usage |
|---|---|---|
| `--color-ember` | `#E84B2C` | Primary CTA, active states, notifications |
| `--color-ember-light` | `#FFF0ED` | Ember tint backgrounds |
| `--color-ember-dark` | `#C13820` | Hover/pressed states |

### Semantic
| Token | Hex | Usage |
|---|---|---|
| `--color-success` | `#1A7F5A` | Order confirmed, payment success |
| `--color-success-light` | `#E8F5F0` | Success tint |
| `--color-warning` | `#D97706` | Inventory alerts, order aging |
| `--color-warning-light` | `#FEF3C7` | Warning tint |
| `--color-error` | `#DC2626` | Payment failed, validation errors |
| `--color-error-light` | `#FEE2E2` | Error tint |
| `--color-muted` | `#6B7280` | Secondary text, placeholders |
| `--color-muted-light` | `#9CA3AF` | Disabled states |

### KDS-Specific (Dark mode — always dark)
| Token | Hex | Usage |
|---|---|---|
| `--kds-bg` | `#111111` | KDS background |
| `--kds-card` | `#1C1C1C` | Ticket card background |
| `--kds-border` | `#2A2A2A` | Card borders |
| `--kds-text` | `#F5F5F5` | Primary text |
| `--kds-green` | `#22C55E` | New ticket (< 5 min) |
| `--kds-yellow` | `#EAB308` | Aging ticket (5-10 min) |
| `--kds-red` | `#EF4444` | Urgent ticket (10+ min) |
| `--kds-done` | `#3F3F3F` | Completed ticket |

---

## Typography

### Typefaces
| Role | Family | Notes |
|---|---|---|
| Display | `"Fraunces"` (Google Fonts) | Optical sizing, used for headings only. Warm, editorial. Renders at `--opsz 144`. |
| Body | `"Inter"` | System-feel, highly legible at small sizes. All UI copy. |
| Data / Mono | `"JetBrains Mono"` | Prices, order IDs, timestamps. Never in guest-facing UI. |

### Type Scale
| Token | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `--text-display` | 36px | 600 | 1.1 | Page heroes, onboarding |
| `--text-h1` | 28px | 600 | 1.2 | Page titles |
| `--text-h2` | 22px | 600 | 1.3 | Section headers |
| `--text-h3` | 18px | 600 | 1.3 | Card titles, item names |
| `--text-body` | 15px | 400 | 1.6 | Descriptions, body copy |
| `--text-body-sm` | 13px | 400 | 1.5 | Secondary info, allergens |
| `--text-label` | 11px | 600 | 1.2 | Tags, badges, uppercase labels |
| `--text-price` | 17px | 600 | 1 | Prices (JetBrains Mono) |

---

## Spacing System

Base unit: `4px`

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Micro gaps |
| `--space-2` | 8px | Tight internal padding |
| `--space-3` | 12px | Default element gap |
| `--space-4` | 16px | Component padding |
| `--space-5` | 20px | Card padding |
| `--space-6` | 24px | Section gaps |
| `--space-8` | 32px | Large section breaks |
| `--space-12` | 48px | Page section spacing |
| `--space-16` | 64px | Hero spacing |

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6px | Tags, badges, chips |
| `--radius-md` | 10px | Buttons, inputs |
| `--radius-lg` | 16px | Cards, modals |
| `--radius-xl` | 24px | Bottom sheets, hero cards |
| `--radius-full` | 9999px | Pills, avatar containers |

---

## Elevation (Shadows)

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | Cards at rest |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.10)` | Dropdowns, popovers |
| `--shadow-lg` | `0 8px 30px rgba(0,0,0,0.14)` | Modals, bottom sheets |
| `--shadow-ember` | `0 4px 16px rgba(232,75,44,0.28)` | Primary CTA button |

---

## Component Specifications

### Primary Button
```
Background:  --color-ember
Text:        white, --text-body, weight 600
Padding:     14px 24px
Radius:      --radius-md
Shadow:      --shadow-ember
Hover:       background --color-ember-dark, shadow reduced
Active:      scale(0.97), shadow none
Disabled:    opacity 0.4, no shadow, cursor not-allowed
Min width:   140px
```

### Secondary Button
```
Background:  transparent
Border:      1.5px solid --color-border
Text:        --color-ink, --text-body, weight 500
Padding:     14px 24px
Radius:      --radius-md
Hover:       background --color-ember-light, border --color-ember
```

### Menu Item Card (Guest App)
```
Background:  --color-surface
Radius:      --radius-lg
Shadow:      --shadow-sm
Padding:     --space-4
Image:       Full bleed top, 200px height, object-fit: cover
             Radius top-left and top-right matching card radius
Name:        --text-h3, --color-ink
Description: --text-body, --color-muted, max 2 lines (line-clamp)
Price:       --text-price, --color-ink, aligned right
Tags:        Pill chips, --text-label, --color-ember on --color-ember-light
Add button:  --color-ember circle icon button, bottom-right corner
```

### KDS Ticket Card
```
Background:  --kds-card
Border-left: 4px solid (green/yellow/red based on age)
Radius:      8px
Padding:     16px
Table label: White, 18px, weight 700
Time badge:  Monospace, color matching border
Item list:   16px, white, line height 1.8
Course group:Headers in --kds-text, muted, 11px uppercase
Done button: Full width, green, 48px touch target
```

### Order Status Bar (Guest App)
```
4 steps: Received → Preparing → Ready → Delivered
Active step: --color-ember filled circle
Completed: --color-success filled circle with checkmark
Inactive: --color-border circle
Connector line: 2px, color matches completion state
Label: --text-body-sm, below each step
Animation: Smooth transition on state change (300ms ease)
```

---

## Motion

All animations use `ease-out` timing. Reduced motion respected via `prefers-reduced-motion`.

| Event | Duration | Easing |
|---|---|---|
| Page transition | 220ms | ease-out |
| Modal open/close | 280ms | spring (tension 200, friction 26) |
| Bottom sheet | 320ms | spring |
| Status update | 300ms | ease-out |
| Button press | 80ms | ease-in |
| Toast notification | 200ms in, 150ms out | ease-out |
| KDS ticket appear | 200ms (slide + fade) | ease-out |

---

## Iconography

Library: **Lucide Icons** (consistent with Next.js ecosystem)  
Size: 20px default, 16px compact, 24px touch targets  
Stroke: 1.5px  
Color: Inherits from context (never hardcoded)

Key icons:
- Scan: `scan`
- Order: `clipboard-list`
- Payment: `credit-card`
- Request: `hand-metal` or `bell`
- Kitchen: `chef-hat`
- Table: `layout-grid`
- Inventory: `package`
- Analytics: `bar-chart-2`
- Alert: `alert-triangle`

---

## Venue Brand Customization

Operators can set `brand_color` on their venue. This color propagates to:
- Guest app header background
- CTA buttons (replaces `--color-ember`)
- Active state indicators

Implementation:
```typescript
// Guest app applies venue brand color at session load
const venueColor = session.venue.brand_color ?? '#E84B2C';
document.documentElement.style.setProperty('--color-primary', venueColor);
```

Accessibility check: If brand color fails WCAG AA contrast on white, fallback to `--color-ember`.

---

## Guest App Screen Map

```
Scan Screen (entry)
    └── Menu Screen
          ├── Category tabs (horizontal scroll)
          ├── Item detail bottom sheet
          │     └── Modifier selection
          │     └── Add to cart
          ├── Cart sheet (persistent bottom bar → expand)
          │     └── Review order
          │     └── Payment method
          │     └── Confirm order
          └── Active Order Screen
                ├── Status bar (Received → Preparing → Ready → Delivered)
                ├── Order items list
                ├── Reorder / Add items button
                ├── Request button (water, bread, etc.)
                └── Close tab / Pay screen
                      ├── Tip selection
                      ├── Split options
                      └── Confirm payment
```

---

## Operator Dashboard Screen Map

```
Dashboard Home (live floor view)
├── Menu Management
│     ├── Categories
│     ├── Items (CRUD + image upload)
│     └── Modifiers
├── Tables
│     ├── Floor map
│     ├── QR generation + print
│     └── NFC assignment
├── Orders (live)
│     └── Per-table detail
├── Staff
│     ├── Add/remove
│     └── Roles + PINs
├── Inventory
│     ├── Item list + par levels
│     ├── Alerts panel
│     └── AI demand forecast
├── Analytics
│     ├── Revenue overview
│     ├── Item performance
│     └── Shift comparison
├── AI Insights feed
└── Settings
      ├── Venue details
      ├── Payment / Stripe
      ├── POS integration
      └── Notifications
```

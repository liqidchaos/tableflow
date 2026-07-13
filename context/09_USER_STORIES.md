# TableFlow — User Stories
**Version:** 1.0  
**Format:** As a [persona], I want to [action], so that [outcome].  
**Priority:** P0 = MVP blocker · P1 = MVP core · P2 = post-MVP

---

## Guest (Customer) Stories

### Onboarding
| ID | Story | Priority |
|---|---|---|
| G-01 | As a guest, I want to scan a QR code at my table and immediately see the menu without downloading an app, so I can start browsing instantly. | P0 |
| G-02 | As a guest, I want to tap an NFC pad at my table to open the menu, so I don't have to scan a QR code. | P1 |
| G-03 | As a guest, I want the menu to load in under 2 seconds, so I'm not waiting staring at a spinner. | P0 |
| G-04 | As a returning guest, I want to be recognized and see "your usual" suggested, so I can reorder quickly. | P1 |

### Menu Browsing
| ID | Story | Priority |
|---|---|---|
| G-05 | As a guest, I want to see high-quality photos of each menu item, so I know what I'm ordering. | P0 |
| G-06 | As a guest, I want to filter the menu by dietary preference (vegan, gluten-free), so I only see items I can eat. | P1 |
| G-07 | As a guest, I want to see allergen information on each item, so I can make safe choices. | P0 |
| G-08 | As a guest, I want to search the menu by name, so I can find a specific item fast. | P1 |
| G-09 | As a guest, I want to see contextual suggestions like "pairs well with," so I can discover items I'd enjoy. | P1 |
| G-10 | As a guest, I want to see which items are unavailable (86'd) without being able to order them, so I'm not disappointed. | P0 |

### Ordering
| ID | Story | Priority |
|---|---|---|
| G-11 | As a guest, I want to add items to a cart with modifier selections (size, temp, add-ons), so my order is exactly how I want it. | P0 |
| G-12 | As a guest, I want to add special instructions to an item (e.g. "no onions"), so the kitchen knows my preference. | P0 |
| G-13 | As a guest, I want to review my full cart before submitting, so I can catch mistakes. | P0 |
| G-14 | As a guest, I want to submit my order and get instant confirmation, so I know it went through. | P0 |
| G-15 | As a guest, I want to add more items to my order while my food is being prepared, so I can order another round of drinks. | P0 |

### Live Status
| ID | Story | Priority |
|---|---|---|
| G-16 | As a guest, I want to see live order status (Received → Preparing → Ready → Delivered), so I know where my food is. | P0 |
| G-17 | As a guest, I want to receive a push notification when my order is ready, so I don't have to watch the status screen. | P1 |

### Requests
| ID | Story | Priority |
|---|---|---|
| G-18 | As a guest, I want to request items like water, bread, or napkins from my phone, so I don't have to flag down a server. | P0 |
| G-19 | As a guest, I want to see that my request has been acknowledged, so I know someone is coming. | P1 |

### Payment
| ID | Story | Priority |
|---|---|---|
| G-20 | As a guest, I want to save my card at the start of my meal and pay at the end, so I don't have to wait for a check. | P0 |
| G-21 | As a guest, I want to pay immediately after each order if I prefer, so I stay in control of my spending. | P1 |
| G-22 | As a guest, I want to select a tip (15/20/25/custom/none) before paying, so tipping is easy. | P0 |
| G-23 | As a guest, I want to pay with Apple Pay or Google Pay, so I don't have to enter card details. | P1 |
| G-24 | As a guest, I want to split the bill with my table — by item, evenly, or one person pays all — so settling up is frictionless. | P1 |
| G-25 | As a guest, I want to receive an email receipt after paying, so I have a record. | P1 |
| G-26 | As a bar guest, I want to open a tab with my card and have it charged when I leave, so I can order freely throughout the night. | P1 |

---

## Server / Floor Staff Stories

| ID | Story | Priority |
|---|---|---|
| S-01 | As a server, I want to see a live view of all my tables' status on my phone, so I know where attention is needed. | P0 |
| S-02 | As a server, I want to receive a push notification when a guest places an order, so I'm immediately aware. | P0 |
| S-03 | As a server, I want to receive a push notification when a guest requests something (water, bread), so I can respond fast. | P0 |
| S-04 | As a server, I want to mark a request as fulfilled, so the guest sees it's been handled and the alert clears. | P0 |
| S-05 | As a server, I want to see the full order detail for any table, so I know what's been ordered. | P0 |
| S-06 | As a server, I want to manually add an item to a table's order (for guests who prefer to order verbally), so every order is tracked. | P1 |
| S-07 | As a server, I want to hold a course and fire it when the table is ready, so courses come out at the right time. | P1 |
| S-08 | As a server, I want to close a table's tab from my app, so I don't need to walk to a terminal. | P1 |

---

## Kitchen Staff Stories

| ID | Story | Priority |
|---|---|---|
| K-01 | As a kitchen staff member, I want new orders to appear on the KDS instantly when placed, so I start prep without delay. | P0 |
| K-02 | As a kitchen staff member, I want an audio alert when a new ticket arrives, so I don't miss orders during a rush. | P0 |
| K-03 | As a kitchen staff member, I want tickets to be color-coded by age (green/yellow/red), so I can prioritize without checking timestamps. | P0 |
| K-04 | As a kitchen staff member, I want to mark individual items as done, so I can track partial completion. | P0 |
| K-05 | As a kitchen staff member, I want to bump completed tickets off the screen, so the display stays clean. | P0 |
| K-06 | As a kitchen staff member, I want to see courses grouped separately (starters / mains), so I know what to fire and when. | P1 |
| K-07 | As a kitchen staff member, I want to see special instructions prominently on each item, so I don't miss customizations. | P0 |

---

## Operator / Manager Stories

### Menu Management
| ID | Story | Priority |
|---|---|---|
| O-01 | As an operator, I want to add/edit/delete menu items with photos, descriptions, and prices, so my menu is always accurate. | P0 |
| O-02 | As an operator, I want to instantly 86 an item when it runs out, so guests can't order it. | P0 |
| O-03 | As an operator, I want to organize items into categories and set sort order, so the menu flows logically. | P0 |
| O-04 | As an operator, I want to add modifier groups to items (size, add-ons), so guests can customize their order. | P0 |
| O-05 | As an operator, I want to tag items with allergens and dietary labels, so guests can make safe choices. | P0 |

### Table Management
| ID | Story | Priority |
|---|---|---|
| O-06 | As an operator, I want to define my tables and generate QR codes for each, so guests can scan and order. | P0 |
| O-07 | As an operator, I want to print QR codes for my tables in a clean format, so I can put them on tables immediately. | P0 |
| O-08 | As an operator, I want to choose between static and dynamic QR modes, so I can match my security preference. | P1 |
| O-09 | As an operator, I want to enable NFC for my tables, so guests with NFC-capable phones can tap to order. | P2 |

### Operations
| ID | Story | Priority |
|---|---|---|
| O-10 | As an operator, I want to see a live floor view showing which tables are active, have open orders, or need attention, so I can manage the floor without walking it. | P1 |
| O-11 | As an operator, I want to add/remove staff and assign roles (server, kitchen, manager), so access is properly controlled. | P0 |
| O-12 | As an operator, I want to connect my existing POS (Toast, Square, Clover) so TableFlow orders flow into my existing system. | P1 |
| O-13 | As an operator, I want to run TableFlow as a standalone system without a POS, so I don't need to pay for both. | P0 |

### Inventory
| ID | Story | Priority |
|---|---|---|
| O-14 | As an operator, I want to set par levels for inventory items, so I get alerted before I run out. | P1 |
| O-15 | As an operator, I want inventory to deduct automatically when orders are placed, so counts are always current. | P1 |
| O-16 | As an operator, I want to see which menu items are linked to which inventory items, so I understand depletion sources. | P1 |
| O-17 | As an operator, I want an AI alert when an item is approaching zero and a suggestion to 86 it, so I catch it before guests order something unavailable. | P1 |

### Analytics
| ID | Story | Priority |
|---|---|---|
| O-18 | As an operator, I want to see daily/weekly/monthly revenue, covers, and average check, so I understand my business performance. | P1 |
| O-19 | As an operator, I want to see my top-performing and slowest items by revenue and quantity, so I can optimize my menu. | P1 |
| O-20 | As an operator, I want to see a shift-by-shift breakdown, so I know when my peak hours are. | P2 |
| O-21 | As an operator, I want AI-generated plain-English summaries of my performance, so I don't have to stare at charts. | P1 |
| O-22 | As an operator, I want demand forecasts for upcoming shifts based on historical data, so I know how much to prep. | P1 |

### Payments & Billing
| ID | Story | Priority |
|---|---|---|
| O-23 | As an operator, I want to connect my Stripe account in under 5 minutes, so I can start accepting payments immediately. | P0 |
| O-24 | As an operator, I want payments to go directly to my Stripe account, so I'm not waiting for TableFlow to pay me out. | P0 |
| O-25 | As an operator, I want to issue refunds from the dashboard when needed, so I can handle guest issues without calling support. | P1 |
| O-26 | As an operator, I want to choose my venue's payment mode (preauth / pay-per-order / bar tab), so it matches how my business works. | P0 |

# Staff floor view + request routing (TAB-8)

**Date:** 2026-07-13  
**Goal:** Live floor stages (ordering / eating / paying) and route guest requests to the assigned server.

## Surface map

| Surface | Role | What it shows |
|---|---|---|
| Web `/floor` | Owner / manager | Full venue grid + pending request queue with fulfill |
| Web `/tables` | Owner / manager | Assign primary server per table |
| Mobile `ServerFloor` | Server | `?mine=1` — assigned + unassigned tables |
| Mobile `ServerRequests` | Server | `?mine=1` — requests for those tables |
| `GET /api/venues/:id/floor` | Staff | Stages derived from session + orders + requests |
| `POST /api/requests` | Guest session | Creates request; push routes to assignee |

## Stage derivation (order/payment tied)

| Stage | Signal |
|---|---|
| `empty` | No open `table_sessions` |
| `ordering` | Open session; no paid kitchen/served tickets yet (includes `pending_payment`) |
| `eating` | At least one `received` / `preparing` / `ready` / `delivered` order |
| `paying` | Pending `check` request |
| `needs_attention` | Pending non-check request (water, bread, etc.) — wins over paying |

Unpaid tickets never imply kitchen activity — `pending_payment` stays in **ordering** until payment clears (TAB-5 / TAB-7 invariant).

## Request routing

1. Table has `assigned_staff_id` + active server/manager with Expo push token → notify that staff only.
2. Otherwise → broadcast to all active servers/managers (`notifyVenueServers`).
3. Audit: `request.routed` with `routed_to_staff_id` + `broadcast`.

Migration: `020_floor_server_assignment.sql` adds `venue_tables.assigned_staff_id`.

## Verify

```bash
npm test --workspace=web -- floor-status
npm test --workspace=web -- request-routing
```

## Designer / later gaps

- Spatial floor plan using `position_x` / `position_y` (grid only today).
- Session dwell time / cover duration on cards.
- Realtime websocket on web `/floor` (polls 15s; mobile already uses Realtime).
- Section/zone multi-server assignment (one primary server per table in v1).
- Acknowledge vs fulfill UX polish on operator floor queue.

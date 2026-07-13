# TableFlow — Master Document Index
**Version:** 1.0  
**Status:** Ready for build

---

## What Is TableFlow

TableFlow is a QR/NFC-powered mobile ordering and restaurant operations platform. Guests scan a code at their table, browse a rich media menu, place orders, and pay — all from their phone. Operators get real-time order management, kitchen display, inventory tracking, AI-driven insights, and analytics in a single system.

---

## Document Suite

| # | Document | Purpose | Primary Audience |
|---|---|---|---|
| 01 | [PRD](./01_PRD.md) | Full product requirements: personas, features, monetization, timeline | Product, Founders |
| 02 | [Database Schema](./02_DATABASE_SCHEMA.md) | Full Supabase PostgreSQL schema with RLS, indexes, Realtime | Backend, AI Agents |
| 03 | [API Specification](./03_API_SPEC.md) | Every endpoint: method, auth, request/response shape, errors | Backend, Frontend, AI Agents |
| 04 | [Architecture](./04_ARCHITECTURE.md) | System diagrams, data flows, Stripe Connect model, deployment | Backend, DevOps |
| 05 | [AI Agents](./05_AI_AGENTS.md) | All 5 AI agents: prompts, triggers, outputs, cost model | AI Agents, Backend |
| 06 | [Design System](./06_DESIGN_SYSTEM.md) | Colors, typography, components, motion, screen maps | Frontend, AI Agents |
| 07 | [Agent Build Instructions](./07_AGENT_BUILD_INSTRUCTIONS.md) | Step-by-step coding agent instructions for all 5 phases | AI Coding Agents |
| 08 | [GTM Strategy](./08_GTM_STRATEGY.md) | Positioning, pricing, launch channels, 90-day KPIs | Founders |
| 09 | [User Stories](./09_USER_STORIES.md) | P0/P1/P2 stories for all 4 personas | Product, AI Agents |

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Guest + Server App | React Native (Expo SDK 51) |
| Operator Dashboard + KDS | Next.js 14 (App Router) |
| Backend / API | Next.js API Routes + Supabase Edge Functions |
| Database | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime (WebSocket) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (CDN-backed) |
| Payments | Stripe Connect Express + Payment Intents |
| AI | Claude API (claude-sonnet-4-6) |
| Notifications | Expo Push (APNs + FCM) + Twilio SMS |
| Email | Resend |
| Hosting | Vercel |
| Monorepo | Turborepo |
| Monitoring | Sentry + Vercel Analytics |

---

## Build Phases

| Phase | Weeks | Key Deliverable |
|---|---|---|
| 1 — Foundation | 1–4 | Auth, DB schema, Stripe Connect, QR scan, menu render |
| 2 — Core Order Loop | 5–8 | Guest ordering, KDS, server app, Realtime, payments |
| 3 — Ops Layer | 9–12 | Operator dashboard, inventory, analytics, menu management |
| 4 — AI Layer | 13–16 | All 5 AI agents deployed and integrated |
| 5 — Polish + Launch | 17–20 | POS integrations, NFC, split billing, beta venues, App Store |

**Target launch:** Q4 2026

---

## How to Use This With AI Coding Agents

1. Feed `07_AGENT_BUILD_INSTRUCTIONS.md` to your coding agent as the master build file
2. Reference `02_DATABASE_SCHEMA.md` when generating migrations
3. Reference `03_API_SPEC.md` when generating API routes
4. Reference `05_AI_AGENTS.md` when building Edge Functions
5. Reference `06_DESIGN_SYSTEM.md` when building any UI component
6. Use `09_USER_STORIES.md` to validate feature completeness — every P0 story must pass before Phase 2 begins

---

## Key Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Payment platform | Stripe Connect Express | Venues onboard in minutes, TableFlow never holds funds, PCI handled by Stripe |
| Monetization | $99–$399/mo SaaS + 0.4% GMV fee | Predictable for operators, upside for platform, friction-free |
| QR system | Static + Dynamic (operator choice) | Static = simple, Dynamic = session security for high-volume venues |
| POS strategy | Integration + Standalone both supported | Removes biggest sales objection ("we already have a POS") |
| Staff hardware | No dedicated hardware required | Server uses own phone, KDS runs in browser on any tablet |
| AI model | Claude via Anthropic API | Best-in-class instruction following for structured JSON output |
| Realtime | Supabase Realtime | Native to stack, < 500ms, no additional infra |
| Mobile | Expo (not bare RN) | OTA updates, faster iteration, single codebase for iOS + Android |

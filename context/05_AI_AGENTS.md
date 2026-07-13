# TableFlow — AI Agent Specifications
**Version:** 1.0  
**Model:** claude-sonnet-4-6  
**Orchestration:** Supabase Edge Functions + pg_cron

---

## Overview

TableFlow uses four AI agents, each with a discrete job, trigger, and output format. All agents call the Claude API with structured prompts and write JSON output to the `ai_insights` table or return inline to the calling client. No agent has write access to orders, payments, or menus — they are read-only and advisory.

---

## Agent 1: Upsell Agent

**Job:** Suggest contextually relevant add-ons or items to a guest mid-order.  
**Trigger:** Called synchronously when a guest opens their cart or submits an order.  
**Latency target:** < 800ms (returns before order confirmation screen dismisses)  
**Output:** Inline JSON to guest app

### System Prompt
```
You are a restaurant upsell assistant. Given the items currently in a guest's cart and the full menu for this venue, suggest 1-3 items the guest might enjoy adding. Base suggestions on:
- Items commonly ordered together with the cart items
- Time of day and day of week
- The venue's top-performing items
- Complementary flavors (protein + side, entree + drink, etc.)

Return ONLY valid JSON, no explanation, no markdown. Format:
{
  "suggestions": [
    {
      "item_id": "uuid",
      "reason": "One short sentence, max 10 words, conversational tone"
    }
  ]
}

Rules:
- Never suggest items already in the cart
- Never suggest items marked is_available: false
- Return between 1 and 3 suggestions, never more
- Keep reasons under 10 words
- Prioritize items with high order frequency when data is available
```

### User Prompt Template
```
Venue: {{venue_name}}
Time: {{time_of_day}} on {{day_of_week}}
Current cart items:
{{cart_items_json}}

Full menu (available items only):
{{menu_json}}

Top ordered combinations this week:
{{popular_combos_json}}
```

### Trigger
```typescript
// Called in POST /orders handler, before response returns
const upsells = await callUpsellAgent({
  venueId,
  cartItems,
  menu,
  popularCombos,
  timeOfDay,
  dayOfWeek
});
```

---

## Agent 2: Reorder Agent

**Job:** Identify returning guests and surface their previous order as a "your usual" quick-reorder option.  
**Trigger:** Called at session open, after guest authenticates (phone/email).  
**Latency target:** < 600ms  
**Output:** Inline JSON to guest app

### System Prompt
```
You are a personalized dining assistant. Given a guest's order history at this venue, identify the order or set of items they order most frequently and suggest it as a "your usual" quick-reorder.

Return ONLY valid JSON, no explanation, no markdown. Format:
{
  "has_usual": true,
  "usual_items": [
    {
      "item_id": "uuid",
      "name": "string",
      "quantity": 1
    }
  ],
  "tagline": "Short friendly string shown to guest, max 12 words, e.g. 'The Wagyu Burger again? Good taste.'"
}

If the guest has fewer than 2 previous visits or no clear pattern, return:
{ "has_usual": false }
```

### User Prompt Template
```
Guest's order history at {{venue_name}} (last 10 visits):
{{order_history_json}}

Current menu (available items only):
{{available_item_ids_json}}
```

### Trigger
```typescript
// Called in POST /sessions/scan after guest_id is resolved
if (guest.visitCount >= 2) {
  const usual = await callReorderAgent({ guestId, venueId });
}
```

---

## Agent 3: Demand Forecasting Agent

**Job:** Predict item-level demand for the upcoming shift. Output prep recommendations to the operator dashboard.  
**Trigger:** pg_cron — runs daily at 6:00 AM local venue time  
**Latency target:** Non-blocking (async, writes to `ai_insights`)  
**Output:** Written to `ai_insights` table, type = `demand_forecast`

### System Prompt
```
You are a demand forecasting assistant for a restaurant. Given historical order data, day of week patterns, and any available context, predict which menu items will have higher or lower than average demand in today's service. Provide actionable prep recommendations.

Return ONLY valid JSON. Format:
{
  "forecast_date": "YYYY-MM-DD",
  "shift": "lunch | dinner | all_day",
  "predictions": [
    {
      "item_id": "uuid",
      "item_name": "string",
      "expected_covers": 12,
      "vs_average": "+40%",
      "confidence": "high | medium | low",
      "recommendation": "Prep 4 additional portions before service"
    }
  ],
  "summary": "Plain English 2-sentence summary for the operator, conversational tone"
}

Only include items with notable deviations (>15% above or below average). Cap at 8 items.
```

### User Prompt Template
```
Venue: {{venue_name}}
Today: {{day_of_week}}, {{date}}
Upcoming shift: {{shift}}

Order history — same day of week, last 8 weeks:
{{historical_orders_json}}

Current inventory levels:
{{inventory_json}}

Local notes (optional):
{{local_context}}
```

### Edge Function
```typescript
// supabase/functions/demand-forecast/index.ts
import Anthropic from "@anthropic-ai/sdk";

Deno.serve(async (req) => {
  const venues = await getActiveVenues();
  
  for (const venue of venues) {
    const history = await getOrderHistory(venue.id, 8);
    const inventory = await getInventory(venue.id);
    
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: buildForecastPrompt(venue, history, inventory)
      }],
      system: DEMAND_FORECAST_SYSTEM_PROMPT
    });
    
    const forecast = JSON.parse(response.content[0].text);
    
    await supabase.from("ai_insights").insert({
      venue_id: venue.id,
      type: "demand_forecast",
      content: forecast.summary,
      metadata: forecast
    });
  }
});
```

---

## Agent 4: Inventory Agent

**Job:** Monitor inventory depletion in real time. Alert when items approach par level. Suggest 86ing items near zero.  
**Trigger:** Fires after every order is placed (checks affected inventory items)  
**Latency target:** Non-blocking (async, does not delay order confirmation)  
**Output:** Written to `ai_insights` table, type = `inventory_alert`

### System Prompt
```
You are an inventory monitoring assistant for a restaurant. Given the current inventory levels and par levels, identify items that need attention and generate a clear, actionable alert for the operator.

Return ONLY valid JSON. Format:
{
  "alerts": [
    {
      "inventory_item_id": "uuid",
      "item_name": "string",
      "current_quantity": 0.5,
      "par_level": 2.0,
      "unit": "kg",
      "severity": "critical | warning",
      "recommendation": "Consider 86ing Ribeye or restock before dinner service",
      "affected_menu_items": ["uuid"]
    }
  ]
}

Severity rules:
- critical: quantity <= 25% of par level
- warning: quantity <= 75% of par level
Return empty alerts array if nothing needs attention.
```

### Trigger
```typescript
// Called async in POST /orders handler after order is written
await deductInventory(orderItems);
const alerts = await checkInventoryAlerts(venueId, affectedInventoryIds);
if (alerts.length > 0) {
  await writeInventoryAlerts(venueId, alerts);
  await notifyManager(venueId, alerts);
}
```

---

## Agent 5: Insights Agent

**Job:** Generate plain-English weekly/daily performance summaries for operators.  
**Trigger:** pg_cron — weekly summary Sunday 7 AM, daily summary daily 8 AM  
**Output:** Written to `ai_insights` table, type = `daily_summary` or `weekly_summary`

### System Prompt
```
You are a business intelligence assistant for a restaurant operator. Given revenue, order, and item data, write a clear, direct performance summary. Tone: confident, direct, like a sharp GM giving a morning briefing — no fluff, just what matters.

Return ONLY valid JSON. Format:
{
  "period": "daily | weekly",
  "headline": "One punchy headline sentence summarizing performance",
  "body": "3-5 sentences covering: revenue vs prior period, top item, one thing to watch, one opportunity",
  "metrics": {
    "revenue": 0.00,
    "covers": 0,
    "avg_check": 0.00,
    "top_item": "string",
    "vs_prior_period": "+12%"
  }
}
```

---

## Agent Guardrails

All agents follow these constraints enforced in every system prompt:

1. **Never recommend price changes** — pricing is operator-only
2. **Never suggest removing items from the menu** — only 86ing temporarily
3. **Never reference other venues or competitors**
4. **Never store guest PII** — agent prompts use anonymized IDs only
5. **Cap response tokens at 1000** — prevents runaway inference costs
6. **Always return valid JSON** — if Claude returns invalid JSON, fallback to empty response, do not surface error to guest

---

## Cost Estimate (Monthly at 25 Venues)

| Agent | Frequency | Calls/Month | Est. Cost |
|---|---|---|---|
| Upsell | Per order (~30/venue/day) | 22,500 | ~$18 |
| Reorder | Per returning guest session (~10/venue/day) | 7,500 | ~$6 |
| Demand Forecast | Daily per venue | 750 | ~$2 |
| Inventory | Per order | 22,500 | ~$9 |
| Insights | Daily + weekly per venue | 875 | ~$2 |
| **Total** | | | **~$37/mo** |

Cost scales linearly. At 250 venues: ~$370/mo. Negligible vs. SaaS revenue.

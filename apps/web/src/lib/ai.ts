import type { UpsellResponse, ReorderResponse } from '@tableflow/types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

export const UPSELL_SYSTEM_PROMPT = `You are a restaurant upsell assistant. Given the items currently in a guest's cart and the full menu for this venue, suggest 1-3 items the guest might enjoy adding. Base suggestions on:
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
- Prioritize items with high order frequency when data is available`;

export const REORDER_SYSTEM_PROMPT = `You are a personalized dining assistant. Given a guest's order history at this venue, identify the order or set of items they order most frequently and suggest it as a "your usual" quick-reorder.

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
{ "has_usual": false }`;

export function isAiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function callClaude(system: string, userContent: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[AI] ANTHROPIC_API_KEY not set — skipping Claude call');
    return null;
  }

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!res.ok) {
      console.warn('[AI] Claude API error:', res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    return data.content?.[0]?.text ?? null;
  } catch (err) {
    console.warn('[AI] Claude call failed:', err);
    return null;
  }
}

export function parseAiJson<T>(text: string | null, fallback: T): T {
  if (!text) return fallback;
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    console.warn('[AI] Failed to parse JSON response');
    return fallback;
  }
}

export interface UpsellInput {
  venueName: string;
  cartItemIds: string[];
  menu: Array<{ id: string; name: string; price: number; is_available: boolean }>;
  popularCombos: Array<{ items: string[]; count: number }>;
  timeOfDay: string;
  dayOfWeek: string;
}

export async function getUpsellSuggestions(input: UpsellInput): Promise<UpsellResponse> {
  const fallback: UpsellResponse = { suggestions: [] };
  if (!isAiEnabled()) return fallback;

  const availableMenu = input.menu.filter((m) => m.is_available);
  const userPrompt = `Venue: ${input.venueName}
Time: ${input.timeOfDay} on ${input.dayOfWeek}
Current cart items:
${JSON.stringify(input.cartItemIds)}

Full menu (available items only):
${JSON.stringify(availableMenu)}

Top ordered combinations this week:
${JSON.stringify(input.popularCombos)}`;

  const text = await callClaude(UPSELL_SYSTEM_PROMPT, userPrompt);
  const parsed = parseAiJson<{ suggestions?: UpsellResponse['suggestions'] }>(text, {});

  const cartSet = new Set(input.cartItemIds);
  const menuMap = new Map(availableMenu.map((m) => [m.id, m]));

  const suggestions = (parsed.suggestions ?? [])
    .filter((s) => !cartSet.has(s.item_id) && menuMap.has(s.item_id))
    .slice(0, 3)
    .map((s) => {
      const item = menuMap.get(s.item_id)!;
      return {
        item_id: s.item_id,
        name: item.name,
        reason: s.reason,
        price: item.price,
      };
    });

  return { suggestions };
}

export interface ReorderInput {
  venueName: string;
  orderHistory: Array<{ items: Array<{ item_id: string; name: string; quantity: number }> }>;
  availableItemIds: string[];
}

export async function getReorderSuggestion(input: ReorderInput): Promise<ReorderResponse> {
  const fallback: ReorderResponse = { has_usual: false };
  if (!isAiEnabled() || input.orderHistory.length < 2) return fallback;

  const userPrompt = `Guest's order history at ${input.venueName} (last 10 visits):
${JSON.stringify(input.orderHistory)}

Current menu (available items only):
${JSON.stringify(input.availableItemIds)}`;

  const text = await callClaude(REORDER_SYSTEM_PROMPT, userPrompt);
  return parseAiJson<ReorderResponse>(text, fallback);
}

export function getTimeContext(): { timeOfDay: string; dayOfWeek: string } {
  const now = new Date();
  const hour = now.getHours();
  let timeOfDay = 'evening';
  if (hour < 11) timeOfDay = 'morning';
  else if (hour < 15) timeOfDay = 'afternoon';
  else if (hour < 17) timeOfDay = 'late afternoon';

  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return { timeOfDay, dayOfWeek };
}

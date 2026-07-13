import { callClaude, isAiEnabled } from '../_shared/anthropic.ts';
import { UPSELL_SYSTEM_PROMPT, corsHeaders, jsonResponse } from '../_shared/prompts.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const { cartItems, menu, venueName, timeOfDay, dayOfWeek, popularCombos } = await req.json();

    if (!isAiEnabled()) {
      return jsonResponse({ suggestions: [] });
    }

    const userPrompt = `Venue: ${venueName ?? 'Restaurant'}
Time: ${timeOfDay ?? 'evening'} on ${dayOfWeek ?? 'today'}
Current cart items:
${JSON.stringify(cartItems ?? [])}

Full menu (available items only):
${JSON.stringify((menu ?? []).filter((m: { is_available: boolean }) => m.is_available))}

Top ordered combinations this week:
${JSON.stringify(popularCombos ?? [])}`;

    const text = await callClaude(UPSELL_SYSTEM_PROMPT, userPrompt);
    let suggestions: Array<{ item_id: string; reason: string }> = [];

    if (text) {
      try {
        const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
        suggestions = (parsed.suggestions ?? []).slice(0, 3);
      } catch {
        console.warn('[upsell-agent] Invalid JSON from Claude');
      }
    }

    return jsonResponse({ suggestions });
  } catch (err) {
    console.error('[upsell-agent]', err);
    return jsonResponse({ suggestions: [] });
  }
});

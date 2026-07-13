import { callClaude, isAiEnabled } from '../_shared/anthropic.ts';
import { REORDER_SYSTEM_PROMPT, corsHeaders, jsonResponse } from '../_shared/prompts.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const { orderHistory, venueName, availableItemIds } = await req.json();

    if (!isAiEnabled() || !orderHistory || orderHistory.length < 2) {
      return jsonResponse({ has_usual: false });
    }

    const userPrompt = `Guest's order history at ${venueName ?? 'Restaurant'} (last 10 visits):
${JSON.stringify(orderHistory)}

Current menu (available items only):
${JSON.stringify(availableItemIds ?? [])}`;

    const text = await callClaude(REORDER_SYSTEM_PROMPT, userPrompt);
    let result = { has_usual: false };

    if (text) {
      try {
        result = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
      } catch {
        console.warn('[reorder-agent] Invalid JSON from Claude');
      }
    }

    return jsonResponse(result);
  } catch (err) {
    console.error('[reorder-agent]', err);
    return jsonResponse({ has_usual: false });
  }
});

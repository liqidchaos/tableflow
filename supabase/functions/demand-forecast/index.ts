import { callClaude, isAiEnabled } from '../_shared/anthropic.ts';
import { DEMAND_FORECAST_SYSTEM_PROMPT, corsHeaders, jsonResponse } from '../_shared/prompts.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  if (!isAiEnabled()) {
    console.warn('[demand-forecast] ANTHROPIC_API_KEY not set');
    return jsonResponse({ processed: 0, message: 'AI disabled' });
  }

  const supabase = getServiceClient();
  const { data: venues } = await supabase.from('venues').select('id, name, timezone').eq('is_active', true);

  let processed = 0;
  const today = new Date();
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toISOString().slice(0, 10);

  for (const venue of venues ?? []) {
    try {
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

      const { data: orders } = await supabase
        .from('orders')
        .select('id, created_at, order_items(item_id, quantity, menu_items(name))')
        .eq('venue_id', venue.id)
        .gte('created_at', eightWeeksAgo.toISOString())
        .neq('status', 'cancelled');

      const sameDayOrders = (orders ?? []).filter((o) => {
        const d = new Date(o.created_at);
        return d.toLocaleDateString('en-US', { weekday: 'long' }) === dayOfWeek;
      });

      const { data: inventory } = await supabase
        .from('inventory_items')
        .select('id, name, quantity, par_level, unit')
        .eq('venue_id', venue.id);

      const hour = today.getHours();
      const shift = hour < 15 ? 'lunch' : 'dinner';

      const userPrompt = `Venue: ${venue.name}
Today: ${dayOfWeek}, ${dateStr}
Upcoming shift: ${shift}

Order history — same day of week, last 8 weeks:
${JSON.stringify(sameDayOrders)}

Current inventory levels:
${JSON.stringify(inventory ?? [])}

Local notes (optional):
{}`;

      const text = await callClaude(DEMAND_FORECAST_SYSTEM_PROMPT, userPrompt);
      if (!text) continue;

      let forecast: { summary?: string; [key: string]: unknown };
      try {
        forecast = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
      } catch {
        console.warn(`[demand-forecast] Invalid JSON for venue ${venue.id}`);
        continue;
      }

      if (forecast.summary) {
        await supabase.from('ai_insights').insert({
          venue_id: venue.id,
          type: 'demand_forecast',
          content: forecast.summary,
          metadata: forecast,
        });
        processed++;
      }
    } catch (err) {
      console.error(`[demand-forecast] venue ${venue.id}:`, err);
    }
  }

  return jsonResponse({ processed });
});

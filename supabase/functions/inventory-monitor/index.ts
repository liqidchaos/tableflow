import { callClaude, isAiEnabled } from '../_shared/anthropic.ts';
import { INVENTORY_SYSTEM_PROMPT, corsHeaders, jsonResponse } from '../_shared/prompts.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const { order_id, venue_id } = await req.json();
    if (!venue_id) {
      return jsonResponse({ alerts: [] }, 400);
    }

    if (!isAiEnabled()) {
      console.warn('[inventory-monitor] ANTHROPIC_API_KEY not set');
      return jsonResponse({ alerts: [] });
    }

    const supabase = getServiceClient();

    if (order_id) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('item_id, quantity, menu_items(menu_item_inventory(inventory_item_id, quantity_used))')
        .eq('order_id', order_id);

      for (const oi of orderItems ?? []) {
        const menuItem = oi.menu_items as { menu_item_inventory?: Array<{ inventory_item_id: string; quantity_used: number }> } | null;
        for (const link of menuItem?.menu_item_inventory ?? []) {
          const deduct = Number(link.quantity_used) * oi.quantity;
          const { data: inv } = await supabase
            .from('inventory_items')
            .select('quantity')
            .eq('id', link.inventory_item_id)
            .single();

          if (inv) {
            await supabase
              .from('inventory_items')
              .update({ quantity: Math.max(0, Number(inv.quantity) - deduct) })
              .eq('id', link.inventory_item_id);
          }
        }
      }
    }

    const { data: inventory } = await supabase
      .from('inventory_items')
      .select('id, name, quantity, par_level, unit, menu_item_inventory(menu_item_id)')
      .eq('venue_id', venue_id);

    const userPrompt = `Current inventory for venue ${venue_id}:
${JSON.stringify(inventory ?? [])}`;

    const text = await callClaude(INVENTORY_SYSTEM_PROMPT, userPrompt);
    if (!text) return jsonResponse({ alerts: [] });

    let result: { alerts?: Array<Record<string, unknown>> };
    try {
      result = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    } catch {
      console.warn('[inventory-monitor] Invalid JSON from Claude');
      return jsonResponse({ alerts: [] });
    }

    const alerts = result.alerts ?? [];
    if (alerts.length > 0) {
      const summary = alerts
        .map((a) => `${a.item_name}: ${a.recommendation}`)
        .join('; ');

      await supabase.from('ai_insights').insert({
        venue_id,
        type: 'inventory_alert',
        content: summary,
        metadata: { alerts },
      });
    }

    return jsonResponse({ alerts });
  } catch (err) {
    console.error('[inventory-monitor]', err);
    return jsonResponse({ alerts: [] });
  }
});

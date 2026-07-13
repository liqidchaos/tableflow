import { callClaude, isAiEnabled } from '../_shared/anthropic.ts';
import { INSIGHTS_SYSTEM_PROMPT, corsHeaders, jsonResponse } from '../_shared/prompts.ts';
import { getServiceClient } from '../_shared/supabase.ts';

function periodBounds(period: 'daily' | 'weekly') {
  const end = new Date();
  const start = new Date();
  const priorStart = new Date();
  const priorEnd = new Date();

  if (period === 'daily') {
    start.setHours(0, 0, 0, 0);
    priorEnd.setTime(start.getTime());
    priorStart.setDate(priorStart.getDate() - 1);
    priorStart.setHours(0, 0, 0, 0);
  } else {
    start.setDate(start.getDate() - 7);
    priorEnd.setTime(start.getTime());
    priorStart.setDate(priorStart.getDate() - 14);
  }

  return { start, end, priorStart, priorEnd };
}

async function computeStats(
  supabase: ReturnType<typeof getServiceClient>,
  venueId: string,
  start: Date,
  end: Date
) {
  const { data: orders } = await supabase
    .from('orders')
    .select('subtotal, session_id')
    .eq('venue_id', venueId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .neq('status', 'cancelled');

  const revenue = (orders ?? []).reduce((s, o) => s + Number(o.subtotal), 0);
  const covers = new Set((orders ?? []).map((o) => o.session_id)).size;

  const { data: topItems } = await supabase
    .from('order_items')
    .select('quantity, total_price, menu_items(name)')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString());

  const itemCounts = new Map<string, { name: string; qty: number; rev: number }>();
  for (const oi of topItems ?? []) {
    const name = (oi.menu_items as { name: string } | null)?.name ?? 'Unknown';
    const existing = itemCounts.get(name) ?? { name, qty: 0, rev: 0 };
    existing.qty += oi.quantity;
    existing.rev += Number(oi.total_price);
    itemCounts.set(name, existing);
  }

  const topItem = [...itemCounts.values()].sort((a, b) => b.rev - a.rev)[0];

  return {
    revenue,
    covers,
    avg_check: covers > 0 ? revenue / covers : 0,
    top_item: topItem?.name ?? 'N/A',
    order_count: orders?.length ?? 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  if (!isAiEnabled()) {
    console.warn('[insights-generator] ANTHROPIC_API_KEY not set');
    return jsonResponse({ processed: 0, message: 'AI disabled' });
  }

  const body = await req.json().catch(() => ({}));
  const period: 'daily' | 'weekly' = body.period ?? 'daily';
  const isSunday = new Date().getDay() === 0;
  const runWeekly = period === 'weekly' || (body.auto && isSunday);

  const supabase = getServiceClient();
  const { data: venues } = await supabase.from('venues').select('id, name').eq('is_active', true);

  let processed = 0;

  for (const venue of venues ?? []) {
    try {
      const periods: Array<'daily' | 'weekly'> = runWeekly ? ['daily', 'weekly'] : ['daily'];

      for (const p of periods) {
        const { start, end, priorStart, priorEnd } = periodBounds(p);
        const current = await computeStats(supabase, venue.id, start, end);
        const prior = await computeStats(supabase, venue.id, priorStart, priorEnd);

        const vsPrior = prior.revenue > 0
          ? `${((current.revenue - prior.revenue) / prior.revenue * 100).toFixed(0)}%`
          : 'N/A';

        const userPrompt = `Venue: ${venue.name}
Period: ${p}
Current period stats:
${JSON.stringify({ ...current, vs_prior_period: vsPrior })}

Prior period stats:
${JSON.stringify(prior)}`;

        const text = await callClaude(INSIGHTS_SYSTEM_PROMPT, userPrompt);
        if (!text) continue;

        let insight: {
          period?: string;
          headline?: string;
          body?: string;
          metrics?: Record<string, unknown>;
        };
        try {
          insight = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
        } catch {
          console.warn(`[insights-generator] Invalid JSON for venue ${venue.id}`);
          continue;
        }

        const content = insight.headline
          ? `${insight.headline} ${insight.body ?? ''}`
          : insight.body ?? 'Performance summary generated.';

        await supabase.from('ai_insights').insert({
          venue_id: venue.id,
          type: p === 'weekly' ? 'weekly_summary' : 'daily_summary',
          content: content.trim(),
          metadata: insight,
        });
        processed++;
      }
    } catch (err) {
      console.error(`[insights-generator] venue ${venue.id}:`, err);
    }
  }

  return jsonResponse({ processed });
});

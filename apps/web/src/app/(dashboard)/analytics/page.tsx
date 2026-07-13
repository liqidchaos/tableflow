'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Timer, UtensilsCrossed } from 'lucide-react';
import { useVenueContext } from '@/hooks/useVenueContext';
import { OperatorPageHeader } from '@/components/dashboard/OperatorPageHeader';
import type { AnalyticsSummary, TopMenuItem, AIInsight } from '@tableflow/types';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

const INSIGHT_LABELS: Record<string, string> = {
  demand_forecast: 'Demand Forecast',
  inventory_alert: 'Inventory Alert',
  daily_summary: 'Daily Summary',
  weekly_summary: 'Weekly Summary',
};

export default function AnalyticsPage() {
  const { venueId, authFetch, loading } = useVenueContext();
  const [summaries, setSummaries] = useState<{
    daily: AnalyticsSummary;
    weekly: AnalyticsSummary;
    monthly: AnalyticsSummary;
  } | null>(null);
  const [topItems, setTopItems] = useState<TopMenuItem[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);

  useEffect(() => {
    if (!loading && venueId) {
      authFetch(`/api/venues/${venueId}/analytics`).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setSummaries(data.summaries);
          setTopItems(data.top_items ?? []);
        }
      });
      authFetch(`/api/venues/${venueId}/ai/insights?limit=10`).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setInsights(data.insights ?? []);
        }
      });
    }
  }, [loading, venueId, authFetch]);

  const eveningGmv = summaries?.daily.revenue ?? 0;
  const covers = summaries?.daily.covers ?? 0;

  return (
    <div>
      <OperatorPageHeader
        eyebrow="Live operator insights"
        title="Evening Flow"
        description="Revenue, covers, menu velocity, and AI-powered recommendations."
      />

      <section className="mb-section-gap grid grid-cols-1 items-end gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-luxury-on-surface-variant">Current GMV</p>
              <p className="font-serif text-3xl font-light text-gold">{formatCurrency(eveningGmv)}</p>
            </div>
            <div>
              <p className="text-sm text-luxury-on-surface-variant">Guest Volume</p>
              <p className="font-serif text-3xl font-light text-luxury-on-surface">
                {covers}
                <span className="text-lg text-luxury-on-surface-variant"> covers</span>
              </p>
            </div>
          </div>
        </div>

        <div className="inner-carve relative h-[320px] overflow-hidden rounded-lg bg-luxury-surface-low lg:col-span-7">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-luxury-bg opacity-80" />
          <div className="absolute bottom-0 left-0 h-1/2 w-full bg-gradient-to-t from-luxury-bg to-transparent" />
          <div className="absolute bottom-10 left-8 right-8 flex items-end justify-between border-b border-luxury-surface-highest pb-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp className="text-gold" size={16} />
                <span className="label-caps text-luxury-on-surface">Peak Velocity</span>
              </div>
              <span className="text-sm text-luxury-on-surface-variant">Based on today&apos;s order volume</span>
            </div>
            <div className="relative h-24 w-px bg-gold/30">
              <div className="absolute -left-1 top-0 h-2 w-2 rounded-full bg-gold glowing-gold" />
            </div>
          </div>
        </div>
      </section>

      {summaries && (
        <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(['daily', 'weekly', 'monthly'] as const).map((period) => {
            const s = summaries[period];
            const labels = { daily: 'Today', weekly: 'This Week', monthly: 'This Month' };
            return (
              <div key={period} className="carved-edge bg-luxury-surface-low p-6">
                <p className="label-caps text-luxury-on-surface-variant">{labels[period]}</p>
                <p className="mt-2 font-serif text-2xl font-light text-gold">{formatCurrency(s.revenue)}</p>
                <p className="mt-2 text-sm text-luxury-on-surface-variant">
                  {s.order_count} orders · {s.covers} covers
                </p>
              </div>
            );
          })}
        </section>
      )}

      <section className="mb-section-gap grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="inner-carve bg-luxury-surface-low p-8 lg:col-span-2">
          <div className="mb-8 flex items-start justify-between">
            <h2 className="font-serif text-2xl font-light text-luxury-on-surface">Menu Performance</h2>
            <UtensilsCrossed className="text-gold" size={22} />
          </div>
          <div className="space-y-4">
            {topItems.slice(0, 5).map((item, idx) => (
              <div
                key={item.item_id}
                className="group flex cursor-pointer items-center justify-between border-b border-luxury-surface-highest pb-4 transition-colors hover:border-gold/50"
              >
                <div className="flex items-center gap-4">
                  <span className="label-caps text-luxury-surface-highest">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="text-lg text-luxury-on-surface transition-colors group-hover:text-gold">{item.name}</span>
                </div>
                <span className="text-sm text-luxury-on-surface-variant">{item.quantity} orders</span>
              </div>
            ))}
            {topItems.length === 0 && (
              <p className="text-sm text-luxury-on-surface-variant">No order data yet.</p>
            )}
          </div>
        </div>

        <div className="inner-carve relative overflow-hidden bg-luxury-surface-high p-8">
          <Timer className="pointer-events-none absolute -right-8 -top-8 text-[140px] text-luxury-on-surface/5" />
          <h2 className="font-serif text-2xl font-light text-luxury-on-surface">Service Velocity</h2>
          <p className="mt-1 text-sm text-luxury-on-surface-variant">Avg check size</p>
          <div className="flex flex-col items-center py-10">
            <span className="font-serif text-5xl font-light text-gold glowing-gold">
              {summaries ? formatCurrency(summaries.daily.avg_check) : '—'}
            </span>
            <span className="label-caps mt-2 text-luxury-on-surface-variant">Per cover today</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-serif text-2xl font-light text-luxury-on-surface">AI Insights</h2>
        <div className="grid gap-3">
          {insights.map((insight) => (
            <div key={insight.id} className="carved-edge bg-luxury-surface-low p-5">
              <div className="mb-2 flex justify-between gap-4">
                <span className="label-caps text-gold">{INSIGHT_LABELS[insight.type] ?? insight.type}</span>
                <span className="text-xs text-luxury-on-surface-variant">
                  {new Date(insight.created_at).toLocaleString()}
                </span>
              </div>
              <p className="m-0 leading-relaxed text-luxury-on-surface">{insight.content}</p>
            </div>
          ))}
          {insights.length === 0 && !loading && (
            <p className="text-sm text-luxury-on-surface-variant">
              Insights generate daily when ANTHROPIC_API_KEY is configured.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

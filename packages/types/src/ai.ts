import { z } from 'zod';

export const UpsellRequestSchema = z.object({
  current_items: z.array(z.string().uuid()),
  session_context: z.object({
    time_of_day: z.string().optional(),
    day_of_week: z.string().optional(),
  }).optional(),
});

export const UpsellSuggestionSchema = z.object({
  item_id: z.string().uuid(),
  name: z.string().optional(),
  reason: z.string(),
  price: z.number().optional(),
});

export const UpsellResponseSchema = z.object({
  suggestions: z.array(UpsellSuggestionSchema),
});

export const ReorderResponseSchema = z.object({
  has_usual: z.boolean(),
  usual_items: z.array(z.object({
    item_id: z.string().uuid(),
    name: z.string(),
    quantity: z.number().int().positive(),
  })).optional(),
  tagline: z.string().optional(),
});

export type UpsellRequest = z.infer<typeof UpsellRequestSchema>;
export type UpsellSuggestion = z.infer<typeof UpsellSuggestionSchema>;
export type UpsellResponse = z.infer<typeof UpsellResponseSchema>;
export type ReorderResponse = z.infer<typeof ReorderResponseSchema>;

export type AIInsightType =
  | 'demand_forecast'
  | 'inventory_alert'
  | 'daily_summary'
  | 'weekly_summary';

export interface AIInsightsListResponse {
  insights: Array<{
    id: string;
    type: string;
    content: string;
    metadata: Record<string, unknown>;
    created_at: string;
    is_read: boolean;
  }>;
}

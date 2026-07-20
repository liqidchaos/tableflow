/**
 * Shared design tokens — mirrors the "Institutional Luxury" system in
 * apps/web/src/app/globals.css and the Stitch "TableFlow Greenfield UX Redesign"
 * (Guest Concierge / Floor Manager, Luxury variant). Keep these two in sync.
 */
export const theme = {
  colors: {
    // Surfaces (dark, near-black — the whole app is dark-mode by design, not just accents)
    bg: '#131313',
    surface: '#201f1f',
    surfaceLow: '#1c1b1b',
    surfaceLowest: '#0e0e0e',
    surfaceHigh: '#2a2a2a',
    surfaceHighest: '#353534',

    // Text / outlines on dark surfaces
    onSurface: '#e5e2e1',
    onSurfaceVariant: '#d0c5af',
    outline: '#99907c',
    outlineVariant: '#4d4635',

    // Brand accent — gold. `brandColor` from venue settings overrides this per-venue.
    gold: '#f2ca50',
    goldContainer: '#d4af37',
    goldOn: '#241a00',
    goldGlow: 'rgba(212, 175, 55, 0.15)',

    // Semantic status. `error` is a light tone for text/icons on dark surfaces;
    // `errorContainer` is a solid dark fill for buttons/badges (matches Material dark theme pairing).
    citrus: '#6fcf3c',
    sun: '#f2ca50',
    error: '#ffb4ab',
    errorContainer: '#93000a',

    // Deprecated aliases kept temporarily for any straggler references.
    muted: '#d0c5af',
  },
  fonts: {
    display: 'SpaceGrotesk_600SemiBold',
    serif: 'PlayfairDisplay_400Regular',
    serifItalic: 'PlayfairDisplay_400Regular_Italic',
    sans: 'Inter_400Regular',
    sansBold: 'Inter_600SemiBold',
  },
  radii: {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    full: 9999,
  },
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    12: 48,
    16: 64,
  },
  shadows: {
    sm: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 2 },
    md: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, elevation: 4 },
    lg: { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 32, elevation: 8 },
    gold: { shadowColor: '#d4af37', shadowOpacity: 0.25, shadowRadius: 20, elevation: 6 },
  },
} as const;

export type Theme = typeof theme;

/** Map order status to semantic color */
export function statusColor(status: string): string {
  switch (status) {
    case 'ready':
    case 'delivered':
    case 'fulfilled':
    case 'open':
      return theme.colors.citrus;
    case 'preparing':
    case 'received':
    case 'pending':
    case 'acknowledged':
    case 'ordering':
    case 'paying':
      return theme.colors.sun;
    case 'cancelled':
      return theme.colors.error;
    default:
      return theme.colors.onSurfaceVariant;
  }
}

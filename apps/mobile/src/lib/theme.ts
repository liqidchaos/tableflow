/** Shared design tokens. Mirrors apps/web globals.css */
export const theme = {
  colors: {
    flow: '#FF4D6D',
    flowLight: '#FFF0F3',
    flowDark: '#E63D5C',
    citrus: '#6FCF3C',
    citrusLight: '#EDF9E6',
    sun: '#FFB800',
    sunLight: '#FFF8E6',
    grape: '#7B5CFA',
    grapeLight: '#F0EBFF',
    ink: '#16151C',
    paper: '#FAFAF9',
    surface: '#FFFFFF',
    border: '#EAE7E0',
    muted: '#6B7280',
    error: '#DC2626',
    luxury: {
      bg: '#131313',
      surface: '#201f1f',
      surfaceLow: '#1c1b1b',
      surfaceLowest: '#0e0e0e',
      surfaceHigh: '#2a2a2a',
      onSurface: '#e5e2e1',
      onSurfaceVariant: '#d0c5af',
      outlineVariant: '#4d4635',
    },
    gold: '#f2ca50',
    goldContainer: '#d4af37',
  },
  fonts: {
    display: 'SpaceGrotesk_600SemiBold',
    serif: 'PlayfairDisplay_400Regular',
    sans: 'Inter_400Regular',
    sansBold: 'Inter_600SemiBold',
    mono: 'Inter_600SemiBold',
  },
  radii: {
    sm: 6,
    md: 12,
    lg: 20,
    xl: 24,
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
    sm: { shadowColor: '#16151C', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    md: { shadowColor: '#16151C', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
    lg: { shadowColor: '#16151C', shadowOpacity: 0.12, shadowRadius: 32, elevation: 8 },
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
      return theme.colors.luxury.onSurface;
  }
}

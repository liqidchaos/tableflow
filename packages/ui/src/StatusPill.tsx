import React from 'react';

export type StatusTone = 'ready' | 'progress' | 'neutral' | 'cancelled';

const TONE_STYLES: Record<StatusTone, { bg: string; text: string }> = {
  ready: { bg: 'var(--color-citrus)', text: 'var(--color-ink)' },
  progress: { bg: 'var(--color-sun)', text: 'var(--color-ink)' },
  neutral: { bg: 'var(--color-ink)', text: '#FFF' },
  cancelled: { bg: 'var(--color-error-light)', text: 'var(--color-error)' },
};

interface StatusPillProps {
  label: string;
  tone?: StatusTone;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export function StatusPill({ label, tone = 'neutral', size = 'md', style }: StatusPillProps) {
  const palette = TONE_STYLES[tone];
  const sizeStyles: Record<'sm' | 'md' | 'lg', React.CSSProperties> = {
    sm: { fontSize: 'var(--text-label)', padding: '4px 10px' },
    md: { fontSize: 'var(--text-body-sm)', padding: '6px 14px' },
    lg: { fontSize: 'var(--text-body)', padding: '10px 20px' },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderRadius: 'var(--radius-full)',
        background: palette.bg,
        color: palette.text,
        ...sizeStyles[size],
        ...style,
      }}
    >
      {label}
    </span>
  );
}

/** Map order status strings to StatusPill tones */
export function orderStatusTone(status: string): StatusTone {
  switch (status) {
    case 'ready':
    case 'delivered':
    case 'open':
    case 'fulfilled':
      return 'ready';
    case 'preparing':
    case 'received':
    case 'pending_payment':
    case 'firing':
    case 'pending':
    case 'acknowledged':
    case 'ordering':
    case 'paying':
      return 'progress';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'neutral';
  }
}

/** Map order status strings to display labels */
export function orderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_payment: 'Awaiting payment',
    received: 'Received',
    preparing: 'Preparing',
    ready: 'Ready',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    pending: 'Pending',
    acknowledged: 'On the way',
    fulfilled: 'Done',
    open: 'Open',
    ordering: 'Ordering',
    eating: 'Eating',
    paying: 'Paying',
    firing: 'Firing',
    hold: 'On hold',
    queued: 'Queued',
  };
  return labels[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
}

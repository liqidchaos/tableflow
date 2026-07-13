import React from 'react';
import type { OrderStatus } from '@tableflow/types';
import { StatusPill, orderStatusLabel, orderStatusTone } from './StatusPill';

const STATUS_STEPS = ['received', 'preparing', 'ready', 'delivered'] as const;

const STATUS_LABELS: Record<(typeof STATUS_STEPS)[number], string> = {
  received: 'Received',
  preparing: 'Preparing',
  ready: 'Ready',
  delivered: 'Delivered',
};

interface OrderStatusBarProps {
  status: OrderStatus;
  accentColor?: string;
}

export function OrderStatusBar({ status, accentColor }: OrderStatusBarProps) {
  if (status === 'cancelled') {
    return (
      <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
        <StatusPill label="Order cancelled" tone="cancelled" size="lg" />
      </div>
    );
  }

  if (status === 'pending_payment') {
    return (
      <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
        <StatusPill label="Awaiting payment" tone="progress" size="lg" />
        <p
          style={{
            marginTop: 12,
            color: 'var(--color-muted)',
            fontSize: 'var(--text-body-sm)',
          }}
        >
          Kitchen fires after payment clears.
        </p>
      </div>
    );
  }

  const currentIndex = STATUS_STEPS.indexOf(status);
  const accent = accentColor ?? 'var(--color-flow)';

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {STATUS_STEPS.map((step, i) => {
          const isActive = i <= currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={step} style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  height: 6,
                  borderRadius: 'var(--radius-full)',
                  background: isActive ? accent : 'var(--color-border)',
                  marginBottom: 8,
                  transition: 'background var(--transition-spring)',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-label)',
                  fontWeight: isCurrent ? 600 : 400,
                  color: isActive ? 'var(--color-ink)' : 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {STATUS_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center' }}>
        <StatusPill
          label={orderStatusLabel(status)}
          tone={orderStatusTone(status)}
          size="lg"
        />
      </div>
    </div>
  );
}

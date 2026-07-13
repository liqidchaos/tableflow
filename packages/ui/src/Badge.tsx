import React from 'react';

type BadgeVariant = 'solid' | 'outline';
type BadgeColor = 'flow' | 'citrus' | 'sun' | 'grape' | 'ink';

const COLOR_MAP: Record<BadgeColor, { bg: string; text: string; border: string }> = {
  flow: { bg: 'var(--color-flow)', text: '#FFF', border: 'var(--color-flow)' },
  citrus: { bg: 'var(--color-citrus)', text: 'var(--color-ink)', border: 'var(--color-citrus)' },
  sun: { bg: 'var(--color-sun)', text: 'var(--color-ink)', border: 'var(--color-sun)' },
  grape: { bg: 'var(--color-grape)', text: '#FFF', border: 'var(--color-grape)' },
  ink: { bg: 'var(--color-ink)', text: '#FFF', border: 'var(--color-ink)' },
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  color?: BadgeColor;
  accentColor?: string;
  style?: React.CSSProperties;
}

export function Badge({
  children,
  variant = 'solid',
  color = 'grape',
  accentColor,
  style,
}: BadgeProps) {
  const palette = COLOR_MAP[color];
  const isOutline = variant === 'outline';

  const accentPalette = accentColor
    ? { bg: 'transparent', text: accentColor, border: accentColor }
    : null;

  const colors = isOutline ? accentPalette ?? { bg: 'transparent', text: palette.bg, border: palette.border } : palette;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-label)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        padding: '4px 12px',
        borderRadius: 'var(--radius-full)',
        background: isOutline ? colors.bg : (accentColor && color === 'flow' ? accentColor : palette.bg),
        color: isOutline ? colors.text : (accentColor && color === 'flow' ? '#FFF' : palette.text),
        border: `1.5px solid ${isOutline ? colors.border : 'transparent'}`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

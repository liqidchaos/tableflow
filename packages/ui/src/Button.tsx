import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  accentColor?: string;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--color-gold-container, var(--color-flow))',
    color: 'var(--color-gold-on, #241a00)',
    border: 'none',
    boxShadow: 'var(--shadow-flow)',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--color-luxury-on-surface, var(--color-ink))',
    border: '1px solid var(--color-luxury-outline-variant, var(--color-border))',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-luxury-on-surface-variant, var(--color-muted))',
    border: 'none',
  },
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  accentColor,
  children,
  style,
  ...props
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const accentStyle: React.CSSProperties =
    isPrimary && accentColor
      ? { background: accentColor, boxShadow: `0 4px 20px ${accentColor}44` }
      : {};

  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        padding: '12px 24px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '12px',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.4 : 1,
        minWidth: variant === 'primary' ? '120px' : undefined,
        transition: 'background-color 200ms ease, opacity 150ms, transform var(--transition-spring)',
        ...variantStyles[variant],
        ...accentStyle,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading && isPrimary) {
          (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.05)';
        }
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.filter = '';
        props.onMouseLeave?.(e);
      }}
    >
      {loading ? 'Loading…' : children}
    </button>
  );
}

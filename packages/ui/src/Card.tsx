import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className, style, onClick, hoverable = false }: CardProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
      style={{
        background: 'var(--color-luxury-surface-low)',
        border: '1px solid #262626',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'none',
        padding: 'var(--space-5)',
        color: 'var(--color-luxury-on-surface)',
        transition: hoverable ? 'border-color 200ms ease, background-color 200ms ease' : undefined,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onMouseEnter={
        hoverable
          ? (e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(242, 202, 80, 0.25)';
              (e.currentTarget as HTMLDivElement).style.background = 'var(--color-luxury-surface-high)';
            }
          : undefined
      }
      onMouseLeave={
        hoverable
          ? (e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#262626';
              (e.currentTarget as HTMLDivElement).style.background = 'var(--color-luxury-surface-low)';
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

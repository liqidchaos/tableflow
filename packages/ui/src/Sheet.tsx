'use client';

import React, { useEffect } from 'react';

interface SheetProps {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  maxWidth?: number;
  variant?: 'light' | 'dark';
}

export function Sheet({ children, onClose, title, maxWidth = 560, variant = 'dark' }: SheetProps) {
  const isDark = variant === 'dark';
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(22, 21, 28, 0.45)',
        animation: 'sheetFadeIn 200ms ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflow: 'auto',
          background: isDark ? 'var(--color-luxury-surface-low)' : 'var(--color-surface)',
          color: isDark ? 'var(--color-luxury-on-surface)' : undefined,
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          padding: 'var(--space-6)',
          boxShadow: isDark ? '0 -8px 32px rgba(0, 0, 0, 0.4)' : 'var(--shadow-lg)',
          animation: 'sheetSlideUp 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: isDark ? 'var(--color-luxury-outline-variant)' : 'var(--color-border)',
            margin: '0 auto var(--space-5)',
          }}
          aria-hidden
        />
        {children}
      </div>
      <style>{`
        @keyframes sheetFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sheetSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}

import React from 'react';
import { Badge } from './Badge';

interface MenuItemCardProps {
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  allergens?: string[];
  dietaryTags?: string[];
  isAvailable?: boolean;
  onPress?: () => void;
}

export function MenuItemCard({
  name,
  description,
  price,
  imageUrl,
  allergens = [],
  dietaryTags = [],
  isAvailable = true,
  onPress,
}: MenuItemCardProps) {
  return (
    <article
      onClick={isAvailable ? onPress : undefined}
      style={{
        background: 'var(--color-luxury-surface-low)',
        border: '1px solid #262626',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        opacity: isAvailable ? 1 : 0.5,
        cursor: isAvailable ? 'pointer' : 'not-allowed',
        transition: 'background-color 200ms ease, border-color 200ms ease',
      }}
      onMouseEnter={(e) => {
        if (isAvailable) {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(242, 202, 80, 0.3)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '#262626';
      }}
    >
      {imageUrl && (
        <div
          style={{
            height: 160,
            background: `url(${imageUrl}) center/cover`,
            backgroundColor: 'var(--color-luxury-surface-high)',
          }}
        />
      )}
      <div style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'var(--text-h3)',
              fontWeight: 300,
              margin: 0,
              color: 'var(--color-luxury-on-surface)',
            }}
          >
            {name}
          </h3>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-price)',
              fontWeight: 600,
              color: 'var(--color-gold)',
              flexShrink: 0,
            }}
          >
            ${price.toFixed(2)}
          </span>
        </div>
        {description && (
          <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-luxury-on-surface-variant)', margin: '8px 0' }}>
            {description}
          </p>
        )}
        {(allergens.length > 0 || dietaryTags.length > 0) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {dietaryTags.map((tag) => (
              <Badge key={tag} color="flow" variant="outline">
                {tag}
              </Badge>
            ))}
            {allergens.map((a) => (
              <Badge key={a} color="sun" variant="outline">
                {a}
              </Badge>
            ))}
          </div>
        )}
        {!isAvailable && (
          <span style={{ color: 'var(--color-error)', fontSize: 'var(--text-body-sm)', fontWeight: 600 }}>
            Unavailable
          </span>
        )}
      </div>
    </article>
  );
}
